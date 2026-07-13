import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.models.campaign import Campaign, CampaignStatus, CampaignTarget, EmailEvent, EmailEventType
from app.models.risk import UserMetrics
from app.tasks.campaigns import recompute_all_user_metrics

def test_recompute_user_metrics_calculation(db_session):
    # 1. Create org and department
    org = Organization(name="Analytics Testing Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    
    dept = Department(name="QA Testing", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    # 2. Create test user
    user = User(
        email="metrics@qa-test.com",
        hashed_password="hash",
        is_active=True,
        organization_id=org.id,
        department_id=dept.id,
        role_id=2
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # 3. Create 4 campaigns
    campaigns = []
    for i in range(4):
        c = Campaign(
            org_id=org.id,
            name=f"Campaign {chr(65+i)}", # A, B, C, D
            theme="QA",
            difficulty="easy",
            language="en",
            department_id=dept.id,
            status=CampaignStatus.running
        )
        db_session.add(c)
        campaigns.append(c)
    db_session.commit()
    for c in campaigns:
        db_session.refresh(c)
        
    # 4. Create CampaignTarget links for all 4 campaigns (Total Targeted = 4)
    targets = []
    for c in campaigns:
        target = CampaignTarget(
            campaign_id=c.id,
            user_id=user.id,
            tracking_token=f"tok_{c.name.replace(' ', '')}"
        )
        db_session.add(target)
        targets.append(target)
    db_session.commit()
    
    # 5. Seed events
    # Base reference times
    base_time = datetime.now(timezone.utc) - timedelta(hours=12)
    
    # Campaign A: Sent, Opened, Clicked. (Time to click = 100 seconds)
    sent_a = EmailEvent(campaign_id=campaigns[0].id, user_id=user.id, event_type=EmailEventType.sent, occurred_at=base_time)
    open_a = EmailEvent(campaign_id=campaigns[0].id, user_id=user.id, event_type=EmailEventType.opened, occurred_at=base_time + timedelta(seconds=30))
    click_a = EmailEvent(campaign_id=campaigns[0].id, user_id=user.id, event_type=EmailEventType.clicked, occurred_at=base_time + timedelta(seconds=100))
    
    # Campaign B: Sent, Opened, Clicked, Reported. (Time to click = 200 seconds)
    sent_b = EmailEvent(campaign_id=campaigns[1].id, user_id=user.id, event_type=EmailEventType.sent, occurred_at=base_time + timedelta(hours=1))
    open_b = EmailEvent(campaign_id=campaigns[1].id, user_id=user.id, event_type=EmailEventType.opened, occurred_at=base_time + timedelta(hours=1, seconds=45))
    click_b = EmailEvent(campaign_id=campaigns[1].id, user_id=user.id, event_type=EmailEventType.clicked, occurred_at=base_time + timedelta(hours=1, seconds=200))
    report_b = EmailEvent(campaign_id=campaigns[1].id, user_id=user.id, event_type=EmailEventType.reported, occurred_at=base_time + timedelta(hours=1, seconds=250))
    
    # Campaign C: Sent, Opened. (No click, no report)
    sent_c = EmailEvent(campaign_id=campaigns[2].id, user_id=user.id, event_type=EmailEventType.sent, occurred_at=base_time + timedelta(hours=2))
    open_c = EmailEvent(campaign_id=campaigns[2].id, user_id=user.id, event_type=EmailEventType.opened, occurred_at=base_time + timedelta(hours=2, seconds=15))
    
    # Campaign D: Sent, Reported. (No open, no click)
    sent_d = EmailEvent(campaign_id=campaigns[3].id, user_id=user.id, event_type=EmailEventType.sent, occurred_at=base_time + timedelta(hours=3))
    report_d = EmailEvent(campaign_id=campaigns[3].id, user_id=user.id, event_type=EmailEventType.reported, occurred_at=base_time + timedelta(hours=3, seconds=60))
    
    # Commit all seeded events
    db_session.add_all([
        sent_a, open_a, click_a,
        sent_b, open_b, click_b, report_b,
        sent_c, open_c,
        sent_d, report_d
    ])
    db_session.commit()
    
    # Mock database session close to keep objects persistent during task execution
    original_close = db_session.close
    db_session.close = MagicMock()
    
    with patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
        # Trigger recompute
        count = recompute_all_user_metrics()
        
        # Restore session close
        db_session.close = original_close
        
        assert count > 0
        
        # Query recomputed metrics for user
        metrics = db_session.query(UserMetrics).filter(UserMetrics.user_id == user.id).first()
        assert metrics is not None
        
        # Hand-calculated expected values:
        # total_targeted = 4
        # click_rate = 2 / 4 = 0.50 (Campaigns A, B clicked)
        # open_rate = 3 / 4 = 0.75 (Campaigns A, B, C opened)
        # report_rate = 2 / 4 = 0.50 (Campaigns B, D reported)
        # avg_time_to_click = (100 + 200) / 2 = 150.0 seconds
        
        assert metrics.click_rate == pytest.approx(0.50)
        assert metrics.open_rate == pytest.approx(0.75)
        assert metrics.report_rate == pytest.approx(0.50)
        assert metrics.avg_time_to_click == pytest.approx(150.0)

def test_analytics_endpoints(client, db_session):
    # Register/login admin
    client.post(
        "/auth/register",
        json={
            "email": "adm@analytics-test.com",
            "password": "password123",
            "organization_name": "Analytics Endpoint Org"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "adm@analytics-test.com",
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get user object
    user = db_session.query(User).filter(User.email == "adm@analytics-test.com").first()
    org = db_session.query(Organization).filter(Organization.id == user.organization_id).first()
    
    # Create dept
    dept = Department(name="Research", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    # Update user's department
    user.department_id = dept.id
    db_session.commit()
    
    # Seed a metric row for the admin user
    metrics = UserMetrics(
        user_id=user.id,
        click_rate=0.10,
        report_rate=0.80,
        open_rate=0.20,
        avg_time_to_click=60.0
    )
    db_session.add(metrics)
    db_session.commit()
    
    # 1. Test Summary
    sum_res = client.get("/analytics/summary", headers=headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["click_rate"] == pytest.approx(0.10)
    assert sum_res.json()["report_rate"] == pytest.approx(0.80)
    
    # 2. Test User Analytics details
    user_res = client.get(f"/analytics/user/{user.id}", headers=headers)
    assert user_res.status_code == 200
    assert user_res.json()["click_rate"] == pytest.approx(0.10)
    
    # 3. Test Department Analytics
    dept_res = client.get(f"/analytics/department/{dept.id}", headers=headers)
    assert dept_res.status_code == 200
    assert dept_res.json()["click_rate"] == pytest.approx(0.10)
    
    # 4. Test All Departments comparison
    depts_res = client.get("/analytics/departments", headers=headers)
    assert depts_res.status_code == 200
    assert len(depts_res.json()) >= 1
    assert depts_res.json()[0]["department_name"] == "Research"
    
    # 5. Test Trends
    trends_res = client.get("/analytics/trends?range=30d", headers=headers)
    assert trends_res.status_code == 200
    assert len(trends_res.json()) == 30 # pre-filled daily time series
