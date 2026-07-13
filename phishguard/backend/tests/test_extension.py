import pytest
from app.models.campaign import Campaign, CampaignStatus, CampaignTarget
from app.models.organization import Organization
from app.models.department import Department
from app.models.user import User
from app.models.risk import RiskScore

def test_extension_unauthorized(client):
    res = client.get("/extension/user-status")
    assert res.status_code == 401

def test_extension_user_status_retrieval(client, db_session):
    # 1. Register and login
    client.post(
        "/auth/register",
        json={
            "email": "user@ext-test.com",
            "password": "password123",
            "organization_name": "Extension Test Org"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "user@ext-test.com",
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get user object
    user = db_session.query(User).filter(User.email == "user@ext-test.com").first()
    org = db_session.query(Organization).filter(Organization.id == user.organization_id).first()
    
    # Create dept
    dept = Department(name="IT", organization_id=org.id)
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    
    # Update user's department
    user.department_id = dept.id
    db_session.commit()
    
    # 2. Query status (No risk score or campaign targets)
    res = client.get("/extension/user-status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] == 15.0 # default
    assert data["risk_level"] == "safe"
    assert data["unread_lessons"] == 0
    assert data["active_simulated_domains"] == []
    
    # 3. Add a custom RiskScore
    risk = RiskScore(user_id=user.id, score=65.0)
    db_session.add(risk)
    db_session.commit()
    
    # 4. Add a running Campaign and target
    campaign = Campaign(
        org_id=org.id,
        name="Ext Campaign",
        theme="HR",
        difficulty="medium",
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
        tracking_token="exttoken123"
    )
    db_session.add(target)
    db_session.commit()
    
    # 5. Re-query status and assert updates
    res_updated = client.get("/extension/user-status", headers=headers)
    assert res_updated.status_code == 200
    data_updated = res_updated.json()
    assert data_updated["risk_score"] == 65.0
    assert data_updated["risk_level"] == "high" # 65 is in high range [50, 80)
    assert "exttoken123" in data_updated["active_simulated_domains"]
