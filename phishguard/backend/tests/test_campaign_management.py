import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.models.campaign import Campaign, CampaignStatus, EmailTemplate, CampaignTarget
from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.routers.campaigns import validate_status_transition
from app.tasks.campaigns import check_scheduled_campaigns, send_campaign_email_task
from fastapi import HTTPException

def test_state_machine_validation():
    # Valid transitions
    validate_status_transition(CampaignStatus.draft, CampaignStatus.scheduled)
    validate_status_transition(CampaignStatus.draft, CampaignStatus.cancelled)
    validate_status_transition(CampaignStatus.scheduled, CampaignStatus.running)
    validate_status_transition(CampaignStatus.running, CampaignStatus.paused)
    validate_status_transition(CampaignStatus.paused, CampaignStatus.running)
    validate_status_transition(CampaignStatus.running, CampaignStatus.completed)
    
    # Invalid transitions should raise HTTPException (status 400)
    with pytest.raises(HTTPException) as excinfo:
        validate_status_transition(CampaignStatus.draft, CampaignStatus.running)
    assert excinfo.value.status_code == 400
    assert "Illegal transition" in excinfo.value.detail

    with pytest.raises(HTTPException):
        validate_status_transition(CampaignStatus.completed, CampaignStatus.draft)

    with pytest.raises(HTTPException):
        validate_status_transition(CampaignStatus.cancelled, CampaignStatus.scheduled)

def test_celery_beat_scheduler(db_session):
    # 1. Create org and department
    org = Organization(name="Test Org Scheduler")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    
    dept = Department(name="Sales", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    # 2. Create users in department
    user = User(
        email="target1@test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        department_id=dept.id,
        role_id=1
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # 3. Create due campaign (scheduled in the past)
    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    due_campaign = Campaign(
        org_id=org.id,
        name="Due Drill",
        theme="IT Support",
        difficulty="medium",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.scheduled,
        scheduled_at=past_time
    )
    db_session.add(due_campaign)
    
    # 4. Create future campaign (scheduled in the future)
    future_time = datetime.now(timezone.utc) + timedelta(minutes=10)
    future_campaign = Campaign(
        org_id=org.id,
        name="Future Drill",
        theme="IT Support",
        difficulty="medium",
        language="en",
        department_id=dept.id,
        status=CampaignStatus.scheduled,
        scheduled_at=future_time
    )
    db_session.add(future_campaign)
    db_session.commit()
    
    # Refresh to get IDs
    db_session.refresh(due_campaign)
    db_session.refresh(future_campaign)
    
    # Create target for due campaign
    target = CampaignTarget(
        campaign_id=due_campaign.id,
        user_id=user.id,
        tracking_token="tok123"
    )
    db_session.add(target)
    db_session.commit()
    
    # Mock send_campaign_email_task.delay
    original_close = db_session.close
    db_session.close = MagicMock()
    
    with patch("app.tasks.campaigns.send_campaign_email_task.delay") as mock_delay, \
         patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
         
        # Run scheduler task
        count = check_scheduled_campaigns()
        
        # Restore close
        db_session.close = original_close
        
        # Verify due campaign changed status to running, future campaign remains scheduled
        db_session.refresh(due_campaign)
        db_session.refresh(future_campaign)
        
        assert due_campaign.status == CampaignStatus.running
        assert future_campaign.status == CampaignStatus.scheduled
        assert count == 1
        
        # Verify delay task was enqueued for the due campaign target
        mock_delay.assert_called_once_with(due_campaign.id, target.id)

def test_campaign_api_endpoints(client, db_session):
    # Register and get auth headers
    client.post(
        "/auth/register",
        json={
            "email": "admin@campaign-test.com",
            "password": "password123",
            "organization_name": "Campaign Test Org"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "admin@campaign-test.com",
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create an approved template
    template = EmailTemplate(
        subject="Approved Template",
        sender_name="HR",
        sender_email="hr@test.com",
        body_html="<p>Click</p>",
        cta_text="Click",
        fake_url="/click",
        approved=True
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    
    # Get department
    dept = db_session.query(Department).first()
    
    # 1. Create campaign (POST /campaigns)
    payload = {
        "name": "API Drill",
        "theme": "HR Scams",
        "difficulty": "easy",
        "language": "en",
        "department_id": dept.id if dept else None,
        "template_ids": [template.id]
    }
    
    res = client.post("/campaigns", json=payload, headers=headers)
    assert res.status_code == 201
    camp_id = res.json()["campaign_id"]
    assert res.json()["status"] == "draft"
    
    # 2. Get Campaigns list (GET /campaigns)
    list_res = client.get("/campaigns", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
    assert any(c["id"] == camp_id for c in list_res.json())
    
    # 3. Update campaign (PUT /campaigns/{id})
    update_payload = {"name": "Updated API Drill"}
    put_res = client.put(f"/campaigns/{camp_id}", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json()["name"] == "Updated API Drill"
    
    # 4. Schedule campaign (POST /campaigns/{id}/schedule)
    sched_payload = {"scheduled_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()}
    sched_res = client.post(f"/campaigns/{camp_id}/schedule", json=sched_payload, headers=headers)
    assert sched_res.status_code == 200
    assert sched_res.json()["status"] == "scheduled"
    
    # 5. Pausing a scheduled campaign should be illegal
    pause_res = client.post(f"/campaigns/{camp_id}/pause", headers=headers)
    assert pause_res.status_code == 400
    
    # 6. Cloning a campaign (POST /campaigns/{id}/clone)
    clone_res = client.post(f"/campaigns/{camp_id}/clone", headers=headers)
    assert clone_res.status_code == 200
    cloned_id = clone_res.json()["campaign_id"]
    assert clone_res.json()["status"] == "draft"
    
    # 7. Deleting a draft campaign (DELETE /campaigns/{id})
    del_res = client.delete(f"/campaigns/{cloned_id}", headers=headers)
    assert del_res.status_code == 200
