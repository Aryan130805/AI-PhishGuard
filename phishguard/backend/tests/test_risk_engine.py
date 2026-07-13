import pytest
from app.services.risk_engine import compute_risk_score

def test_compute_risk_score_no_history_defaults():
    # click_rate=0.0, quiz_score=0.0, report_rate=0.0, learning_progress=0.0
    # prev_score defaults to 100.0 (safest state initially)
    score = compute_risk_score(
        click_rate=0.0,
        quiz_score=0.0,
        report_rate=0.0,
        learning_progress=0.0,
        prev_score=100.0
    )
    # Expected: (0.30 * (1-0) + 0.20*0 + 0.20*0 + 0.15*0 + 0.15 * 1.0) * 100 = 45.0
    assert score == pytest.approx(45.0)

def test_compute_risk_score_perfect_inputs():
    # No clicks (0.0), full quiz score (1.0), full report rate (1.0), full learning progress (1.0), prev_score=100.0
    score = compute_risk_score(
        click_rate=0.0,
        quiz_score=1.0,
        report_rate=1.0,
        learning_progress=1.0,
        prev_score=100.0
    )
    # Expected: (0.30 * 1 + 0.20 * 1 + 0.20 * 1 + 0.15 * 1 + 0.15 * 1) * 100 = 100.0
    assert score == pytest.approx(100.0)

def test_compute_risk_score_worst_case():
    # 100% clicks (1.0), 0 quiz, 0 reports, 0 progress, prev_score=0.0
    score = compute_risk_score(
        click_rate=1.0,
        quiz_score=0.0,
        report_rate=0.0,
        learning_progress=0.0,
        prev_score=0.0
    )
    # Expected: (0.30 * 0 + 0.20 * 0 + 0.20 * 0 + 0.15 * 0 + 0.15 * 0) * 100 = 0.0
    assert score == pytest.approx(0.0)

def test_compute_risk_score_mixed_cases():
    # Mixed Case 1:
    # click_rate = 10% (0.10)
    # quiz_score = 85% (0.85)
    # report_rate = 40% (0.40)
    # learning_progress = 50% (0.50)
    # prev_score = 75.0
    # Expected calculation:
    # 0.30 * (1 - 0.10) = 0.27
    # 0.20 * 0.85       = 0.17
    # 0.20 * 0.40       = 0.08
    # 0.15 * 0.50       = 0.075
    # 0.15 * 75 / 100   = 0.1125
    # Sum: 0.27 + 0.17 + 0.08 + 0.075 + 0.1125 = 0.7075 * 100 = 70.75
    score1 = compute_risk_score(
        click_rate=0.10,
        quiz_score=0.85,
        report_rate=0.40,
        learning_progress=0.50,
        prev_score=75.0
    )
    assert score1 == pytest.approx(70.75)

    # Mixed Case 2:
    # click_rate = 50% (0.50)
    # quiz_score = 60% (0.60)
    # report_rate = 20% (0.20)
    # learning_progress = 30% (0.30)
    # prev_score = 55.0
    # Expected calculation:
    # 0.30 * (1 - 0.50) = 0.15
    # 0.20 * 0.60       = 0.12
    # 0.20 * 0.20       = 0.04
    # 0.15 * 0.30       = 0.045
    # 0.15 * 55 / 100   = 0.0825
    # Sum: 0.15 + 0.12 + 0.04 + 0.045 + 0.0825 = 0.4375 * 100 = 43.75
    score2 = compute_risk_score(
        click_rate=0.50,
        quiz_score=0.60,
        report_rate=0.20,
        learning_progress=0.30,
        prev_score=55.0
    )
    assert score2 == pytest.approx(43.75)


from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.models.risk import RiskScore, UserMetrics
from app.models.learning import QuizAttempt, Quiz, Lesson
from app.models.campaign import Campaign, CampaignStatus, CampaignTarget, EmailEvent, EmailEventType
from app.tasks.campaigns import recompute_user_risk_score

def test_celery_task_recomputes_and_triggers_alert(db_session):
    # 1. Create mock org, department, and user
    org = Organization(name="Risk Testing Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    
    dept = Department(name="Risk Dept", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    user = User(
        email="employee_risk@test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        department_id=dept.id,
        role_id=2
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create 10 campaigns and targets to yield click_rate=0.8 and report_rate=0.1
    campaigns = []
    for i in range(10):
        c = Campaign(
            org_id=org.id,
            name=f"Campaign {i}",
            theme="QA",
            difficulty="easy",
            language="en",
            department_id=dept.id,
            status=CampaignStatus.completed
        )
        db_session.add(c)
        campaigns.append(c)
    db_session.commit()
    
    for i in range(10):
        target = CampaignTarget(
            campaign_id=campaigns[i].id,
            user_id=user.id,
            tracking_token=f"tok_{i}"
        )
        db_session.add(target)
    db_session.commit()
    
    # 8 click events
    for i in range(8):
        evt = EmailEvent(
            campaign_id=campaigns[i].id,
            user_id=user.id,
            event_type=EmailEventType.clicked,
            occurred_at=datetime.now(timezone.utc)
        )
        db_session.add(evt)
        
    # 1 report event
    evt_rep = EmailEvent(
        campaign_id=campaigns[8].id,
        user_id=user.id,
        event_type=EmailEventType.reported,
        occurred_at=datetime.now(timezone.utc)
    )
    db_session.add(evt_rep)
    db_session.commit()
    
    # 2. Add some failed quiz attempts (score = 20, passed = False) and one passed (score = 60, passed = True)
    # The score should be 0.60
    lesson = Lesson(topic="Risk Basics", title="Quiz Lesson", content="Content")
    db_session.add(lesson)
    db_session.commit()
    db_session.refresh(lesson)
    
    quiz = Quiz(lesson_id=lesson.id, questions=[])
    db_session.add(quiz)
    db_session.commit()
    db_session.refresh(quiz)
    
    attempt = QuizAttempt(quiz_id=quiz.id, user_id=user.id, score=60, passed=True)
    db_session.add(attempt)
    db_session.commit()
    
    # Pre-seed a risk score history row
    prev_risk = RiskScore(user_id=user.id, score=90.0)
    db_session.add(prev_risk)
    db_session.commit()
    
    # Mock session and task.delay to prevent actual Celery worker calling
    original_close = db_session.close
    db_session.close = MagicMock()
    
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session), \
         patch("app.tasks.campaigns.trigger_advanced_training_alert.delay") as mock_alert:
        
        # Calculate expected score:
        # click_rate = 0.80 (weighted 0.30 -> 0.30 * 0.20 = 0.06)
        # quiz_score = 0.60 (weighted 0.20 -> 0.20 * 0.60 = 0.12)
        # report_rate = 0.10 (weighted 0.20 -> 0.20 * 0.10 = 0.02)
        # learning_progress = 0.0 (weighted 0.15 -> 0.15 * 0 = 0.0)
        # prev_score = 90.0 (weighted 0.15 -> 0.15 * 90/100 = 0.135)
        # Expected score: (0.06 + 0.12 + 0.02 + 0.0 + 0.135) * 100 = 33.5
        
        score = recompute_user_risk_score(user.id)
        db_session.close = original_close
        
        assert score == pytest.approx(33.5)
        
        # Verify that a new RiskScore row was appended
        scores = db_session.query(RiskScore).filter(RiskScore.user_id == user.id).all()
        assert len(scores) == 2
        assert scores[1].score == pytest.approx(33.5)
        
        # Since score (33.5) is below 50, mock_alert.delay should be called
        mock_alert.assert_called_once_with(user.id, pytest.approx(33.5))

def test_risk_history_endpoints_and_quiz_trigger(client, db_session):
    # Register/login org creator (will default to role admin)
    client.post(
        "/auth/register",
        json={
            "email": "admin@risk-test.com",
            "password": "password123",
            "organization_name": "Risk Org"
        }
    )
    
    admin_user = db_session.query(User).filter(User.email == "admin@risk-test.com").first()
    org = db_session.query(Organization).filter(Organization.id == admin_user.organization_id).first()
    
    # Create employee user manually in DB
    from app.models.role import Role
    from app.security import get_password_hash
    
    employee_role = db_session.query(Role).filter(Role.name == "employee").first()
    hashed_pwd = get_password_hash("password123")
    emp = User(
        email="employee@risk-test.com",
        hashed_password=hashed_pwd,
        organization_id=org.id,
        role_id=employee_role.id,
        is_admin=False
    )
    db_session.add(emp)
    db_session.commit()
    db_session.refresh(emp)
    
    # Login as employee
    login_res = client.post(
        "/auth/login",
        json={
            "email": "employee@risk-test.com",
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Pre-seed some risk scores for employee
    r1 = RiskScore(user_id=emp.id, score=85.0)
    r2 = RiskScore(user_id=emp.id, score=92.0)
    db_session.add_all([r1, r2])
    db_session.commit()
    
    # 1. Test GET /risk-scores/{user_id}/history
    history_res = client.get(f"/risk-scores/{emp.id}/history", headers=headers)
    assert history_res.status_code == 200
    data = history_res.json()
    assert len(data) == 2
    assert data[0]["score"] == 85.0
    assert data[0]["level"] == "good"
    assert data[1]["score"] == 92.0
    assert data[1]["level"] == "excellent"
    
    # 2. Test GET with another user's ID should return 403 Forbidden (RBAC test)
    bad_res = client.get("/risk-scores/999/history", headers=headers)
    assert bad_res.status_code == 403
    
    # 3. Test submitting a quiz dynamically and triggering recalculation
    quiz_res = client.post(
        "/risk-scores/mock-submit-quiz?quiz_id=101&score=100&passed=true",
        headers=headers
    )
    assert quiz_res.status_code == 200
    res_data = quiz_res.json()
    assert res_data["passed"] is True
    assert "new_risk_score" in res_data


