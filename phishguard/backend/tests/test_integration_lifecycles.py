import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.models.campaign import Campaign, CampaignStatus, EmailEvent, EmailEventType, CampaignTarget, EmailTemplate
from app.models.user import User
from app.models.department import Department
from app.models.learning import Lesson, Quiz, QuizAttempt, Certificate, LessonAssignment
from app.security import get_password_hash

@patch("app.tasks.campaigns.process_mistake_event.delay")
@patch("app.tasks.campaigns.recompute_user_risk_score")
def test_user_registration_through_campaign_completion_lifecycle(mock_risk, mock_mistake_delay, client: TestClient, db_session: Session):
    # 1. Register Admin User
    reg_res = client.post("/auth/register", json={
        "email": "lifecycle_admin@phishguard.com",
        "password": "AdminPass123!",
        "organization_name": "Lifecycle Org"
    })
    assert reg_res.status_code == 201
    
    # 2. Login to retrieve tokens/cookies
    login_res = client.post("/auth/login", json={
        "email": "lifecycle_admin@phishguard.com",
        "password": "AdminPass123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup database records (Department, Employees, Template)
    admin = db_session.query(User).filter(User.email == "lifecycle_admin@phishguard.com").first()
    org_id = admin.organization_id
    
    dept = Department(name="R&D", organization_id=org_id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)

    employee = User(
        email="target_employee@phishguard.com",
        hashed_password=get_password_hash("EmployeePass123!"),
        organization_id=org_id,
        department_id=dept.id,
        role_id=2,  # Employee
        is_active=True,
        is_admin=False
    )
    db_session.add(employee)
    
    template = EmailTemplate(
        subject="Urgent action required",
        sender_name="IT Support",
        sender_email="support@microsoft.com",
        body_html="Click here",
        cta_text="Verify Now",
        fake_url="http://microsoft.com",
        approved=True
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(employee)
    db_session.refresh(template)

    # 3. Create Draft Campaign
    campaign_res = client.post("/campaigns/", headers=headers, json={
        "name": "Integration Drill 1",
        "theme": "IT Support",
        "difficulty": "easy",
        "language": "en",
        "department_id": dept.id,
        "template_ids": [template.id]
    })
    assert campaign_res.status_code == 201
    campaign_id = campaign_res.json()["campaign_id"]

    # 4. Schedule Campaign
    schedule_time = (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat()
    sched_res = client.post(f"/campaigns/{campaign_id}/schedule", headers=headers, json={
        "scheduled_at": schedule_time
    })
    assert sched_res.status_code == 200

    # Retrieve campaign
    campaign = db_session.query(Campaign).filter(Campaign.id == campaign_id).first()
    assert campaign.status == CampaignStatus.scheduled

    # Simulate Campaign Dispatch (move status to running)
    campaign.status = CampaignStatus.running
    db_session.commit()

    # Verify target target is created
    target = db_session.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign_id).first()
    assert target is not None
    assert target.user_id == employee.id

    # 5. Simulate Email events (e.g. click) - do not follow redirect to local frontend URL
    event_res = client.get(f"/track/click/{target.tracking_token}", follow_redirects=False)
    assert event_res.status_code == 307  # redirects to frontend landing page

    # 6. Complete the campaign
    comp_res = client.post(f"/campaigns/{campaign_id}/pause", headers=headers)
    assert comp_res.status_code == 200
    
    # Verify campaign successfully transitions state
    campaign = db_session.query(Campaign).filter(Campaign.id == campaign_id).first()
    assert campaign.status == CampaignStatus.paused


@patch("app.tasks.campaigns.process_mistake_event.delay")
@patch("app.tasks.campaigns.recompute_user_risk_score")
def test_lesson_assignment_through_certificate_issuance_lifecycle(mock_risk, mock_mistake_delay, client: TestClient, db_session: Session):
    # Setup Employee
    org_id = 1
    employee = User(
        email="learner@phishguard.com",
        hashed_password=get_password_hash("EmployeePass123!"),
        organization_id=org_id,
        role_id=2,  # Employee role
        is_active=True,
        is_admin=False
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    # Login as Employee
    login_res = client.post("/auth/login", json={
        "email": "learner@phishguard.com",
        "password": "EmployeePass123!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Setup Lesson with a simple Quiz question
    lesson = Lesson(
        topic="Phishing",
        title="Phishing Basics",
        content="Never click untrusted links."
    )
    db_session.add(lesson)
    db_session.commit()
    db_session.refresh(lesson)

    quiz = Quiz(
        lesson_id=lesson.id,
        questions=[
            {
                "question": "Should you click untrusted links?",
                "options": ["Yes", "No", "Maybe"],
                "correct_index": 1
            }
        ]
    )
    db_session.add(quiz)
    db_session.commit()
    db_session.refresh(quiz)

    # 1. Assign Lesson to employee
    assigned = LessonAssignment(
        user_id=employee.id,
        lesson_id=lesson.id,
        assigned_at=datetime.now(timezone.utc)
    )
    db_session.add(assigned)
    db_session.commit()

    # 2. Retrieve Assigned Lessons
    lessons_res = client.get("/training/lessons", headers=headers)
    assert lessons_res.status_code == 200
    assert len(lessons_res.json()) > 0

    # 3. Retrieve Lesson quiz questions
    quiz_res = client.get(f"/training/quiz/{lesson.id}", headers=headers)
    assert quiz_res.status_code == 200
    assert len(quiz_res.json()["questions"]) == 1

    # 4. Submit Passing Quiz answers (No is index 1)
    submit_res = client.post(f"/training/quiz/{lesson.id}/submit", headers=headers, json={
        "answers": [1]
    })
    assert submit_res.status_code == 200
    assert submit_res.json()["passed"] is True
    assert submit_res.json()["score"] == 100.0

    # 5. Verify Certificate generated
    certs_res = client.get("/certificates", headers=headers)
    assert certs_res.status_code == 200
    assert len(certs_res.json()) == 1
    cert_id = certs_res.json()[0]["id"]

    # 6. Download Certificate
    download_res = client.get(f"/certificates/{cert_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.headers["content-type"] == "application/pdf"
