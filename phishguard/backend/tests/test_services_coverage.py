import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from app.services.cache import CacheService
from app.services.notification_service import send_smtp_email, create_notification
from app.models.user import User

def test_cache_service_redis_exceptions():
    # Mock redis.Redis.from_url to raise exception on ping to trigger fallback init
    with patch("redis.Redis.from_url") as mock_from_url:
        mock_redis = MagicMock()
        mock_redis.ping.side_effect = Exception("Redis connection failed")
        mock_from_url.return_value = mock_redis
        
        service = CacheService()
        assert service.redis_client is None

    # Test cache set/get fallback to in-memory dictionary
    service = CacheService()
    service.set("test_key", {"data": 123}, expire_seconds=10)
    assert service.get("test_key") == {"data": 123}

    # Test with active Redis client that raises errors on get/setex
    mock_active_redis = MagicMock()
    mock_active_redis.get.side_effect = Exception("Redis error on GET")
    mock_active_redis.setex.side_effect = Exception("Redis error on SETEX")
    
    service.redis_client = mock_active_redis
    # Should fallback to in-memory and not crash
    service.set("redis_fail_key", {"data": 456})
    val = service.get("redis_fail_key")
    assert val == {"data": 456}

def test_send_smtp_email_success_and_failures():
    # Test success path with secure=True
    with patch("smtplib.SMTP_SSL") as mock_smtp_ssl, \
         patch("app.config.settings.SMTP_SECURE", True), \
         patch("app.config.settings.SMTP_USER", "user"), \
         patch("app.config.settings.SMTP_PASSWORD", "pass"):
        
        mock_server = MagicMock()
        mock_smtp_ssl.return_value = mock_server
        
        res = send_smtp_email("test@phishguard.local", "Test Subject", "Body text")
        assert res is True
        mock_server.login.assert_called_with("user", "pass")
        mock_server.sendmail.assert_called()
        mock_server.quit.assert_called()

    # Test failure path (raising exception)
    with patch("smtplib.SMTP") as mock_smtp, \
         patch("app.config.settings.SMTP_SECURE", False), \
         patch("app.config.settings.SMTP_PORT", 587):
        
        mock_server = MagicMock()
        mock_server.starttls.side_effect = Exception("StartTLS failed")
        mock_smtp.return_value = mock_server
        
        res = send_smtp_email("test@phishguard.local", "Test Subject", "Body text")
        # Even if starttls fails, it proceeds or logs and returns False depending on implementation
        # Here, raising inside server.sendmail or login to guarantee failure
        mock_server.sendmail.side_effect = Exception("SMTP error")
        res = send_smtp_email("test@phishguard.local", "Test Subject", "Body")
        assert res is False

def test_create_notification_send_email_override(db_session: Session):
    from app.models.organization import Organization
    org = Organization(name="Test Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    # Setup test user
    user = User(
        email="test_notify@phishguard.local",
        hashed_password="hashed_password",
        organization_id=org.id,
        role_id=2,
        is_admin=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    with patch("app.services.notification_service.send_smtp_email") as mock_send_email:
        # Override to True on low-priority notification
        create_notification(
            db=db_session,
            user_id=user.id,
            notif_type="lesson_assigned",
            payload={"message": "Lesson assigned alert"},
            send_email_override=True
        )
        mock_send_email.assert_called_once_with(
            "test_notify@phishguard.local",
            "PhishGuard Alert: Lesson Assigned",
            "Lesson assigned alert"
        )
