import pytest
import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.services.ai_generator import AIGeneratorService, AIEmailResponse
from app.tasks.campaigns import generate_email_task
from app.models.campaign import EmailTemplate, Campaign
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from tests.conftest import TestingSessionLocal

# Helper to register and log in a user to get auth headers
def get_auth_headers(client):
    client.post(
        "/auth/register",
        json={
            "email": "test@generator.com",
            "password": "password123",
            "organization_name": "Generator Org"
        }
    )
    login_res = client.post(
        "/auth/login",
        json={
            "email": "test@generator.com",
            "password": "password123"
        }
    )
    access_token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}

def test_ai_generator_service_valid_json():
    service = AIGeneratorService()
    
    valid_payload = {
        "subject": "System Alert: Security Verification Required",
        "sender_name": "IT Security Office",
        "sender_email": "security@company-verify.net",
        "body_html": "<p>Please verify your account access here.</p>",
        "cta_text": "Verify Access",
        "difficulty": "medium",
        "social_engineering_style": "Authority",
        "fake_url_path": "/login/challenge"
    }
    
    service.provider.generate_completion = MagicMock(return_value=json.dumps(valid_payload))
    
    response = service.generate_email(
        theme="IT Support",
        difficulty="medium",
        language="en",
        department_name="Engineering",
        tone="professional"
    )
    
    assert isinstance(response, AIEmailResponse)
    assert response.subject == valid_payload["subject"]
    assert response.difficulty == "medium"
    service.provider.generate_completion.assert_called_once()

def test_ai_generator_service_malformed_json_retry_success():
    service = AIGeneratorService()
    
    malformed_payload = "This is not valid JSON string at all"
    valid_payload = {
        "subject": "System Alert: Security Verification Required",
        "sender_name": "IT Security Office",
        "sender_email": "security@company-verify.net",
        "body_html": "<p>Please verify your account access here.</p>",
        "cta_text": "Verify Access",
        "difficulty": "hard",
        "social_engineering_style": "Urgency",
        "fake_url_path": "/login/challenge"
    }
    
    # First call returns malformed string, second call returns valid JSON
    service.provider.generate_completion = MagicMock(
        side_effect=[malformed_payload, json.dumps(valid_payload)]
    )
    
    response = service.generate_email(
        theme="IT Support",
        difficulty="hard",
        language="en",
        department_name="Engineering",
        tone="urgent"
    )
    
    assert isinstance(response, AIEmailResponse)
    assert response.subject == valid_payload["subject"]
    assert response.difficulty == "hard"
    
    # Assert provider was called exactly twice (initial call + corrective retry)
    assert service.provider.generate_completion.call_count == 2

def test_celery_task_valid_generation(db_session):
    valid_payload = {
        "subject": "Celery Security Alert",
        "sender_name": "Worker Admin",
        "sender_email": "admin@worker-alert.net",
        "body_html": "<p>Celery alert</p>",
        "cta_text": "Click Celery",
        "difficulty": "easy",
        "social_engineering_style": "Fear",
        "fake_url_path": "/celery/click"
    }
    
    # Mock AIGeneratorService generate_email inside the Celery task
    mock_service = MagicMock()
    mock_service.generate_email.return_value = AIEmailResponse.model_validate(valid_payload)
    
    original_close = db_session.close
    db_session.close = MagicMock()
    
    with patch("app.tasks.campaigns.AIGeneratorService", return_value=mock_service), \
         patch("app.tasks.campaigns.SessionLocal", return_value=db_session):
        
        result = generate_email_task(
            department_id=None,
            difficulty="easy",
            theme="Finance",
            language="en",
            tone="professional"
        )
        
        assert result["subject"] == "Celery Security Alert"
        assert "template_id" in result
        
        # Restore close
        db_session.close = original_close
        
        # Verify it was inserted in database
        template = db_session.query(EmailTemplate).filter(EmailTemplate.id == result["template_id"]).first()
        assert template is not None
        assert template.subject == "Celery Security Alert"
        assert template.ai_generated is True
        assert template.approved is False

def test_unapproved_templates_rejected_by_campaign_creation(client, db_session):
    headers = get_auth_headers(client)
    
    # 1. Create an unapproved template manually in database
    db = db_session
    org = db.query(Organization).first()
    
    unapproved_template = EmailTemplate(
        subject="Phishing drill text",
        sender_name="HR Support",
        sender_email="hr@phish-drill.net",
        body_html="<p>Click me</p>",
        cta_text="Link",
        fake_url="/drill",
        ai_generated=True,
        approved=False
    )
    db.add(unapproved_template)
    db.commit()
    db.refresh(unapproved_template)
    
    # 2. Attempt to create a live campaign (status='running') with the unapproved template
    campaign_payload = {
        "org_id": org.id,
        "name": "Live Attack Q3",
        "theme": "HR",
        "difficulty": "medium",
        "language": "en",
        "status": "running",
        "template_ids": [unapproved_template.id]
    }
    
    response = client.post(
        "/campaigns",
        json=campaign_payload,
        headers=headers
    )
    assert response.status_code == 400
    assert "Cannot attach unapproved email templates to a campaign" in response.json()["detail"]
    
    # 3. Campaign with unapproved template is rejected (returns 400)
    campaign_payload["status"] = "draft"
    response_draft = client.post(
        "/campaigns",
        json=campaign_payload,
        headers=headers
    )
    assert response_draft.status_code == 400
    
    # 4. Approve the template
    approve_res = client.post(
        f"/email-templates/{unapproved_template.id}/approve",
        headers=headers
    )
    assert approve_res.status_code == 200
    
    # 5. Campaign creation with APPROVED template should now succeed
    response_live_success = client.post(
        "/campaigns",
        json=campaign_payload,
        headers=headers
    )
    assert response_live_success.status_code == 201
    assert "Campaign created successfully" in response_live_success.json()["message"]
    assert response_live_success.json()["status"] == "draft"

