import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.models.campaign import Campaign, CampaignStatus, CampaignTarget, EmailTemplate, EmailEvent, EmailEventType
from app.models.learning import Lesson, Quiz, QuizAttempt, LessonAssignment, Certificate
from app.models.risk import RiskScore
from app.tasks.campaigns import process_mistake_event
from app.services.ai_generator import AILessonResponse, AILessonQuestion

@patch("app.tasks.campaigns.trigger_advanced_training_alert.delay")
def test_adaptive_learning_pipeline_flow(mock_alert, client, db_session):
    original_close = db_session.close
    db_session.close = MagicMock()
    
    # 1. Create org, department, and user
    org = Organization(name="Adaptive Learning Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    
    dept = Department(name="Security QA", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    # Register/login user
    client.post(
        "/auth/register",
        json={
            "email": "employee_learning@qa.com",
            "password": "Password123!",
            "organization_name": "Adaptive Learning Org"
        }
    )
    
    # Grab the created user and set their role to employee
    user = db_session.query(User).filter(User.email == "employee_learning@qa.com").first()
    from app.models.role import Role
    emp_role = db_session.query(Role).filter(Role.name == "employee").first()
    user.role_id = emp_role.id
    user.department_id = dept.id
    user.suggested_next_difficulty = "easy"
    db_session.commit()
    db_session.refresh(user)
    
    # Login as this employee
    login_res = client.post(
        "/auth/login",
        json={
            "email": "employee_learning@qa.com",
            "password": "Password123!"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create a payroll scam campaign and target link
    campaign = Campaign(
        org_id=org.id,
        name="Mock Payroll Scam Campaign",
        theme="payroll_scam", # Will map to payroll_fraud_awareness
        difficulty="easy",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.running
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    
    target = CampaignTarget(
        campaign_id=campaign.id,
        user_id=user.id,
        tracking_token="tok_payroll_scam_test"
    )
    db_session.add(target)
    db_session.commit()
    
    # Pre-seed a sent event so metrics compute correctly
    sent_evt = EmailEvent(
        campaign_id=campaign.id,
        user_id=user.id,
        event_type=EmailEventType.sent,
        occurred_at=datetime.now(timezone.utc)
    )
    db_session.add(sent_evt)
    db_session.commit()
    
    # 3. Simulate "clicked" email event
    # Patch process_mistake_event.delay in campaigns to avoid running it via Celery worker during HTTP request
    with patch("app.tasks.campaigns.process_mistake_event.delay") as mock_delay:
        res = client.get("/track/click/tok_payroll_scam_test", follow_redirects=False)
        assert res.status_code == 307
        mock_delay.assert_called_once_with(user.id, campaign.id)
        
    # 4. Run the process_mistake_event task synchronously, patching the AI Generator
    mock_ai_lesson = AILessonResponse(
        title="Payroll Fraud Prevention",
        content_html="<p>Watch out for external sender tags diversion requests...</p>",
        quiz=[
            AILessonQuestion(
                question="What is the main sign of payroll phishing?",
                options=["Urgent deposit diversion request", "Generic greetings", "All of the above"],
                correct_index=2
            )
        ]
    )
    with patch("app.services.ai_generator.AIGeneratorService.generate_lesson", return_value=mock_ai_lesson), \
         patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
         
        process_mistake_event(user.id, campaign.id)
    
    # Assert lesson and quiz were dynamically created in the DB
    lesson = db_session.query(Lesson).filter(Lesson.topic == "payroll_fraud_awareness").first()
    assert lesson is not None
    assert lesson.title == "Payroll Fraud Prevention"
    assert lesson.ai_generated is True
    
    quiz = db_session.query(Quiz).filter(Quiz.lesson_id == lesson.id).first()
    assert quiz is not None
    assert len(quiz.questions) == 1
    assert quiz.questions[0]["question"] == "What is the main sign of payroll phishing?"
    
    # Assert lesson was assigned to the employee user
    assignment = db_session.query(LessonAssignment).filter(
        LessonAssignment.user_id == user.id,
        LessonAssignment.lesson_id == lesson.id
    ).first()
    assert assignment is not None
    assert assignment.completed_at is None
    
    # 5. Fetch assigned lessons endpoint
    assigns_res = client.get("/training/assignments", headers=headers)
    assert assigns_res.status_code == 200
    assigns_data = assigns_res.json()
    assert len(assigns_data) == 1
    assert assigns_data[0]["lesson"]["topic"] == "payroll_fraud_awareness"
    
    # 6. Simulate quiz submission with a passing score (submitting option index 2)
    # Patch session in recompute tasks inside training router completion callback
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
         
        comp_res = client.post(
            f"/training/lessons/{lesson.id}/complete",
            json={"answers": [2]},
            headers=headers
        )
        assert comp_res.status_code == 200
        comp_data = comp_res.json()
        assert comp_data["passed"] is True
        assert comp_data["score"] == 100
        assert comp_data["suggested_next_difficulty"] == "medium"
        
    # 7. Assert database changes
    # Assignment marked completed
    db_session.refresh(assignment)
    assert assignment.completed_at is not None
    
    # QuizAttempt logged
    attempt = db_session.query(QuizAttempt).filter(QuizAttempt.user_id == user.id).first()
    assert attempt is not None
    assert attempt.score == 100
    assert attempt.passed is True
    
    # User difficulty tier promoted
    db_session.refresh(user)
    assert user.suggested_next_difficulty == "medium"
    
    # RiskScore appended
    risk_rows = db_session.query(RiskScore).filter(RiskScore.user_id == user.id).all()
    assert len(risk_rows) > 0

    # 8. Test GET /training/lessons
    lessons_res = client.get("/training/lessons", headers=headers)
    assert lessons_res.status_code == 200
    lessons_data = lessons_res.json()
    assert len(lessons_data) == 1
    assert lessons_data[0]["completed"] is True

    # 9. Test GET /training/lessons/{id} (without correct_index)
    lesson_detail_res = client.get(f"/training/lessons/{lesson.id}", headers=headers)
    assert lesson_detail_res.status_code == 200
    lesson_detail = lesson_detail_res.json()
    assert lesson_detail["completed"] is True
    assert "content" in lesson_detail
    assert len(lesson_detail["quiz"]["questions"]) == 1
    assert "correct_index" not in lesson_detail["quiz"]["questions"][0]

    # 10. Test POST /training/quiz/{id}/submit
    # Create another lesson and quiz to attempt
    invoice_lesson = Lesson(
        topic="invoice_fraud_detection",
        title="Invoice Fraud",
        content="Invoice scam content",
        ai_generated=False
    )
    db_session.add(invoice_lesson)
    db_session.commit()
    
    invoice_quiz = Quiz(
        lesson_id=invoice_lesson.id,
        questions=[{"question": "Is this a fake invoice?", "options": ["Yes", "No"], "correct_index": 0}]
    )
    db_session.add(invoice_quiz)
    db_session.commit()
    
    invoice_assignment = LessonAssignment(
        user_id=user.id,
        lesson_id=invoice_lesson.id
    )
    db_session.add(invoice_assignment)
    db_session.commit()

    # Submit quiz
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
        submit_res = client.post(
            f"/training/quiz/{invoice_quiz.id}/submit",
            json={"answers": [0]},
            headers=headers
        )
        assert submit_res.status_code == 200
        submit_data = submit_res.json()
        assert submit_data["passed"] is True
        assert submit_data["score"] == 100
        assert submit_data["suggested_next_difficulty"] == "hard"

    # 11. Test GET /certificates/{id}/download
    cert_row = db_session.query(Certificate).filter(
        Certificate.user_id == user.id,
        Certificate.lesson_id == invoice_lesson.id
    ).first()
    assert cert_row is not None
    cert_download_res = client.get(f"/certificates/{cert_row.id}/download", headers=headers)
    assert cert_download_res.status_code == 200
    assert cert_download_res.headers["content-type"] == "application/pdf"

    # 12. Test GET /training/leaderboard
    leaderboard_res = client.get("/training/leaderboard", headers=headers)
    assert leaderboard_res.status_code == 200
    leaderboard_data = leaderboard_res.json()
    assert len(leaderboard_data) >= 1
    assert leaderboard_data[0]["name"] == "Employee_learning"
    assert "composite_score" in leaderboard_data[0]

    # Restore DB close session
    db_session.close = original_close
