import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from sqlalchemy.orm import Session
from app.config import settings
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger("phishguard")

# Configurable dictionary mapping notification types to email dispatch setting
NOTIFICATION_EMAIL_CONFIG = {
    "campaign_completed": True,     # High priority
    "high_risk_score": True,        # High priority
    "lesson_assigned": False,       # Low priority (in-app only)
    "certificate_issued": False,    # Low priority (in-app only)
    "campaign_scheduled": False,    # Low priority (in-app only)
}

def send_smtp_email(to_email: str, subject: str, body_text: str):
    """Sends a notification email via configured SMTP settings."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"PhishGuard <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    
    # Text and simple HTML wrapping
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f1f5f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="color: #6366f1;">PhishGuard Notification</h2>
          <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">{body_text}</p>
          <hr style="border-color: #334155; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px; text-align: center;">This is an automated message from your PhishGuard security platform.</p>
        </div>
      </body>
    </html>
    """
    
    msg.attach(MIMEText(body_html, "html"))
    
    try:
        if settings.SMTP_SECURE:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10.0)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10.0)
            
        if not settings.SMTP_SECURE and settings.SMTP_PORT != 1025:
            try:
                server.starttls()
            except Exception:
                pass
                
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully sent notification email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send notification email to {to_email}: {str(e)}")
        return False

def create_notification(db: Session, user_id: int, notif_type: str, payload: dict, send_email_override: bool = None) -> Notification:
    """
    Inserts a notification into the database and optionally sends an email notification.
    """
    # Create database entry
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        payload=payload,
        read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    
    # Determine whether to send an email
    send_email = NOTIFICATION_EMAIL_CONFIG.get(notif_type, False)
    if send_email_override is not None:
        send_email = send_email_override
        
    if send_email:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email:
            subject = f"PhishGuard Alert: {notif_type.replace('_', ' ').title()}"
            message = payload.get("message", "A new notification requires your attention.")
            send_smtp_email(user.email, subject, message)
            
    return notif
