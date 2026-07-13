import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.models.campaign import Campaign, CampaignStatus, CampaignTarget
from app.models.learning import Lesson, Quiz, LessonAssignment, Certificate
from app.models.risk import RiskScore, UserMetrics
from app.models.notification import Notification

from app.services.notification_service import create_notification, NOTIFICATION_EMAIL_CONFIG


@pytest.fixture(scope="function")
def seed_base_data(db_session):
    # 1. Create Org
    org = Organization(name="Notification test Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    # 2. Create Dept
    dept = Department(name="IT Dept", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)

    # 3. Create Admin & Employee
    admin = User(
        email="notif_admin@test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        role_id=1  # Admin
    )
    employee = User(
        email="notif_employee@test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        department_id=dept.id,
        role_id=2  # Employee
    )
    db_session.add_all([admin, employee])
    db_session.commit()
    db_session.refresh(admin)
    db_session.refresh(employee)

    return org, dept, admin, employee


def test_create_notification_sends_email_only_for_high_priority(db_session, seed_base_data):
    org, dept, admin, employee = seed_base_data

    # High priority should send email
    with patch("app.services.notification_service.send_smtp_email") as mock_send:
        notif = create_notification(
            db=db_session,
            user_id=employee.id,
            notif_type="high_risk_score",
            payload={"message": "High risk score warning!"}
        )
        assert notif.id is not None
        assert notif.read is False
        assert mock_send.call_count == 1
        mock_send.assert_called_with(
            employee.email,
            "PhishGuard Alert: High Risk Score",
            "High risk score warning!"
        )

    # Low priority should NOT send email (in-app only)
    with patch("app.services.notification_service.send_smtp_email") as mock_send:
        notif = create_notification(
            db=db_session,
            user_id=employee.id,
            notif_type="lesson_assigned",
            payload={"message": "Lesson assigned warning!"}
        )
        assert notif.id is not None
        assert mock_send.call_count == 0


def test_campaign_completion_wires_notification(db_session, seed_base_data):
    org, dept, admin, employee = seed_base_data
    from app.tasks.campaigns import check_ignored_and_complete_campaigns

    # Seed running campaign created by admin
    campaign = Campaign(
        org_id=org.id,
        name="Phishing Test Complete",
        theme="it_support_phish",
        difficulty="easy",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.running,
        created_by=admin.id
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)

    # Seed target
    target = CampaignTarget(
        campaign_id=campaign.id,
        user_id=employee.id,
        tracking_token="compl_token"
    )
    db_session.add(target)
    db_session.commit()

    # Stub email event so all targets are in a terminal state (e.g. completed via ignore or click)
    from app.models.campaign import EmailEvent, EmailEventType
    event = EmailEvent(
        campaign_id=campaign.id,
        user_id=employee.id,
        event_type=EmailEventType.ignored,
        occurred_at=datetime.now(timezone.utc)
    )
    db_session.add(event)
    db_session.commit()

    # Mock database session close to keep objects persistent during task execution
    original_close = db_session.close
    db_session.close = MagicMock()

    # Mock SessionLocal and trigger task
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session), \
         patch("app.tasks.campaigns.recompute_user_risk_score.delay") as mock_celery_delay, \
         patch("app.services.notification_service.send_smtp_email") as mock_email:
        
        check_ignored_and_complete_campaigns()
        
        # Restore session close
        db_session.close = original_close
        
        # Verify campaign transition to completed
        db_session.refresh(campaign)
        assert campaign.status == CampaignStatus.completed

        # Verify completed notification is created for admin
        notif = db_session.query(Notification).filter(
            Notification.user_id == admin.id,
            Notification.type == "campaign_completed"
        ).first()
        assert notif is not None
        assert "Phishing Test Complete" in notif.payload["message"]
        # Completed notification should trigger an email to admin
        assert mock_email.call_count == 1


def test_risk_score_alert_below_50(db_session, seed_base_data):
    org, dept, admin, employee = seed_base_data
    from app.tasks.campaigns import trigger_advanced_training_alert

    # Mock database session close to keep objects persistent during task execution
    original_close = db_session.close
    db_session.close = MagicMock()

    # Trigger alert task directly
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session), \
         patch("app.services.notification_service.send_smtp_email") as mock_email:
        # Pre-seed role of admin so they can be matched
        from app.models.role import Role
        admin_role = db_session.query(Role).filter(Role.name == "admin").first()
        admin.role_id = admin_role.id
        db_session.commit()

        trigger_advanced_training_alert(employee.id, 45.5)

        # Restore session close
        db_session.close = original_close

        # 1. Affected employee notified
        emp_notif = db_session.query(Notification).filter(
            Notification.user_id == employee.id,
            Notification.type == "high_risk_score"
        ).first()
        assert emp_notif is not None
        assert "45.5" in emp_notif.payload["message"]

        # 2. Admin notified
        admin_notif = db_session.query(Notification).filter(
            Notification.user_id == admin.id,
            Notification.type == "high_risk_score"
        ).first()
        assert admin_notif is not None
        assert employee.email in admin_notif.payload["message"]

        # Emails sent to employee and admin
        assert mock_email.call_count == 2


def test_lesson_assigned_wiring(db_session, seed_base_data):
    org, dept, admin, employee = seed_base_data
    from app.tasks.campaigns import process_mistake_event

    # Create campaign
    campaign = Campaign(
        org_id=org.id,
        name="Phishing Theme Test",
        theme="it_support_phish",
        difficulty="easy",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.running
    )
    db_session.add(campaign)
    db_session.commit()

    # Pre-generate target lesson
    lesson = Lesson(topic="it_support_impersonation_defense", title="IT Security", content="Rules")
    db_session.add(lesson)
    db_session.commit()

    # Fetch values before session might be mocked or closed
    lesson_id = lesson.id

    # Mock database session close to keep objects persistent during task execution
    original_close = db_session.close
    db_session.close = MagicMock()

    # Mock SessionLocal and process mistake event
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session), \
         patch("app.services.notification_service.send_smtp_email") as mock_email:
        process_mistake_event(employee.id, campaign.id)

        # Restore session close
        db_session.close = original_close

        # Verify lesson assignment is created
        assignment = db_session.query(LessonAssignment).filter(
            LessonAssignment.user_id == employee.id,
            LessonAssignment.lesson_id == lesson_id
        ).first()
        assert assignment is not None

        # Verify notification created
        notif = db_session.query(Notification).filter(
            Notification.user_id == employee.id,
            Notification.type == "lesson_assigned"
        ).first()
        assert notif is not None
        assert "IT Security" in notif.payload["message"]
        # Email should NOT be sent for low priority type
        assert mock_email.call_count == 0


def test_campaign_scheduled_wiring(client, db_session, seed_base_data):
    org, dept, admin, employee = seed_base_data

    # Log in as admin
    client.post("/auth/register", json={
        "email": "sch_admin@test.com",
        "password": "Password123!",
        "organization_name": "Schedule Test Org",
    })
    login = client.post("/auth/login", json={"email": "sch_admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch admin user object to reference their correct org_id
    admin_user = db_session.query(User).filter(User.email == "sch_admin@test.com").first()
    
    # Put employee in the admin's organization & department
    employee.organization_id = admin_user.organization_id
    db_session.commit()

    # Create campaign in draft
    campaign = Campaign(
        org_id=admin_user.organization_id,
        name="Campaign to Schedule",
        theme="IT Support",
        difficulty="easy",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.draft,
        created_by=admin_user.id
    )
    db_session.add(campaign)
    db_session.commit()

    with patch("app.services.notification_service.send_smtp_email") as mock_email:
        # Schedule the campaign
        res = client.post(
            f"/campaigns/{campaign.id}/schedule",
            headers=headers,
            json={"scheduled_at": datetime.now(timezone.utc).isoformat()}
        )
        assert res.status_code == 200

        # Verify employee in department is notified
        notif = db_session.query(Notification).filter(
            Notification.user_id == employee.id,
            Notification.type == "campaign_scheduled"
        ).first()
        assert notif is not None
        assert "Campaign to Schedule" in notif.payload["message"]
        # Email NOT sent (low priority)
        assert mock_email.call_count == 0
