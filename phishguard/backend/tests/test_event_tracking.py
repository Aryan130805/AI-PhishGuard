import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from app.models.campaign import Campaign, CampaignStatus, EmailTemplate, CampaignTarget, EmailEvent, EmailEventType
from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.tasks.campaigns import check_scheduled_campaigns, send_campaign_email_task

@patch("app.tasks.campaigns.process_mistake_event.delay")
def test_phishing_drill_integration_flow(mock_mistake_delay, client, db_session):
    original_close = db_session.close
    db_session.close = MagicMock()
    
    # 1. Register Admin User to authenticate API calls
    client.post(
        "/auth/register",
        json={
            "email": "admin@event-test.com",
            "password": "password123",
            "organization_name": "Integration Tracking Org"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "admin@event-test.com",
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve Org, Department, and Admin User objects
    admin_user = db_session.query(User).filter(User.email == "admin@event-test.com").first()
    org = db_session.query(Organization).filter(Organization.id == admin_user.organization_id).first()
    
    # 2. Add an Employee user in a designated department
    dept = Department(name="Security Engineering", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    employee = User(
        email="employee@event-test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        department_id=dept.id,
        role_id=2 # employee role
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)

    # 3. Create and approve template
    template = EmailTemplate(
        subject="Urgent Office 365 Verification",
        sender_name="Microsoft Support",
        sender_email="support@o365-verify.com",
        body_html="<p>Click here to sign in: <a href='https://login.microsoftonline.com/auth'>Sign In</a></p>",
        cta_text="Sign In",
        fake_url="https://login.microsoftonline.com/auth",
        approved=True
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)

    # 4. Create Campaign in draft status (POST /campaigns)
    payload = {
        "name": "O365 Harvest Campaign",
        "theme": "Office365 Phish",
        "difficulty": "medium",
        "language": "en",
        "department_id": dept.id,
        "template_ids": [template.id]
    }
    create_res = client.post("/campaigns", json=payload, headers=headers)
    assert create_res.status_code == 201
    campaign_id = create_res.json()["campaign_id"]

    # 5. Schedule campaign (POST /campaigns/{id}/schedule)
    schedule_time = datetime.now(timezone.utc) - timedelta(minutes=2) # Scheduled in the past to trigger immediately
    schedule_payload = {"scheduled_at": schedule_time.isoformat()}
    sched_res = client.post(f"/campaigns/{campaign_id}/schedule", json=schedule_payload, headers=headers)
    assert sched_res.status_code == 200
    
    # Verify CampaignTarget was created for employee
    target = db_session.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign_id).first()
    assert target is not None
    assert target.user_id == employee.id
    tracking_token = target.tracking_token

    # 6. Execute Celery Beat check task (Transition scheduled -> running)
    with patch("app.tasks.campaigns.send_campaign_email_task.delay") as mock_delay, \
         patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
        
        count = check_scheduled_campaigns()
        assert count == 1
        mock_delay.assert_called_once_with(campaign_id, target.id)

    # 7. Run send email task synchronously, mocking SMTP socket connection
    with patch("smtplib.SMTP") as mock_smtp, \
         patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
         
        mock_server = MagicMock()
        mock_smtp.return_value = mock_server
        
        # Execute delivery task
        delivery_res = send_campaign_email_task(campaign_id, target.id)
        assert delivery_res is True
        
        # Confirm mock sendmail was triggered
        mock_server.sendmail.assert_called_once()
        
        # Verify "sent" event was logged in DB
        sent_event = db_session.query(EmailEvent).filter(
            EmailEvent.campaign_id == campaign_id,
            EmailEvent.user_id == employee.id,
            EmailEvent.event_type == EmailEventType.sent
        ).first()
        assert sent_event is not None

    # 8. Simulate email client OPEN tracking pixel callback (GET /track/open/{token})
    open_res = client.get(f"/track/open/{tracking_token}")
    assert open_res.status_code == 200
    assert open_res.headers["content-type"] == "image/gif"
    
    # Verify "opened" event logged in DB
    open_event = db_session.query(EmailEvent).filter(
        EmailEvent.campaign_id == campaign_id,
        EmailEvent.user_id == employee.id,
        EmailEvent.event_type == EmailEventType.opened
    ).first()
    assert open_event is not None

    # 9. Simulate email link CLICK redirect callback (GET /track/click/{token})
    # Follow redirects is False to verify redirect destination
    click_res = client.get(f"/track/click/{tracking_token}", follow_redirects=False)
    assert click_res.status_code == 307
    assert click_res.headers["location"] == f"http://localhost:3000/simulated-landing/{tracking_token}"

    # Verify "clicked" event logged in DB
    click_event = db_session.query(EmailEvent).filter(
        EmailEvent.campaign_id == campaign_id,
        EmailEvent.user_id == employee.id,
        EmailEvent.event_type == EmailEventType.clicked
    ).first()
    assert click_event is not None

    # 10. Fetch landing info (GET /track/landing-info/{token})
    info_res = client.get(f"/track/landing-info/{tracking_token}")
    assert info_res.status_code == 200
    assert info_res.json()["theme"] == "Office365 Phish"
    assert info_res.json()["cta_text"] == "Sign In"

    # 11. Simulate CREDENTIALS submission (POST /track/credentials/{token})
    cred_res = client.post(f"/track/credentials/{tracking_token}")
    assert cred_res.status_code == 200
    
    # Verify "credentials_submitted" event logged in DB
    cred_event = db_session.query(EmailEvent).filter(
        EmailEvent.campaign_id == campaign_id,
        EmailEvent.user_id == employee.id,
        EmailEvent.event_type == EmailEventType.credentials_submitted
    ).first()
    assert cred_event is not None

    # 12. Simulate target REPORTING the phishing simulation drill (POST /report)
    report_res = client.post("/report", json={"token": tracking_token})
    assert report_res.status_code == 200
    
    # Verify "reported" event logged in DB
    report_event = db_session.query(EmailEvent).filter(
        EmailEvent.campaign_id == campaign_id,
        EmailEvent.user_id == employee.id,
        EmailEvent.event_type == EmailEventType.reported
    ).first()
    assert report_event is not None

    db_session.close = original_close

def test_ignored_and_completed_campaign_task(db_session):
    from app.tasks.campaigns import check_ignored_and_complete_campaigns
    
    org = Organization(name="Test Org Ignored")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    
    dept = Department(name="Marketing", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    employee = User(
        email="emp@ignored-test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        department_id=dept.id,
        role_id=2
    )
    db_session.add(employee)
    db_session.commit()
    db_session.refresh(employee)
    
    start_time = datetime.now(timezone.utc) - timedelta(days=6)
    campaign = Campaign(
        org_id=org.id,
        name="Ignored Drill",
        theme="HR",
        difficulty="easy",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.running,
        scheduled_at=start_time
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    
    target = CampaignTarget(
        campaign_id=campaign.id,
        user_id=employee.id,
        tracking_token="ignoredtok"
    )
    db_session.add(target)
    db_session.commit()
    
    original_close = db_session.close
    db_session.close = MagicMock()
    
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session), \
         patch("app.tasks.campaigns.recompute_user_risk_score.delay") as mock_risk_delay:
        completed_count = check_ignored_and_complete_campaigns()
        mock_risk_delay.assert_called_once_with(employee.id)
        
        db_session.close = original_close
        
        ignored_event = db_session.query(EmailEvent).filter(
            EmailEvent.campaign_id == campaign.id,
            EmailEvent.user_id == employee.id,
            EmailEvent.event_type == EmailEventType.ignored
        ).first()
        assert ignored_event is not None
        
        db_session.refresh(campaign)
        assert campaign.status == CampaignStatus.completed
        assert completed_count == 1

