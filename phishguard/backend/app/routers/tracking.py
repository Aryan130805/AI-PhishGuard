from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.campaign import CampaignTarget, EmailEvent, EmailEventType, EmailTemplate

router = APIRouter(tags=["tracking"])

# 1x1 transparent GIF bytes
GIF_1X1 = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'

class ReportPayload(BaseModel):
    token: str

@router.get("/track/open/{token}")
def track_open(token: str, db: Session = Depends(get_db)):
    target = db.query(CampaignTarget).filter(CampaignTarget.tracking_token == token).first()
    if target:
        # Check if already opened, or log another event (multiple opens can be logged, standard practice)
        event = EmailEvent(
            campaign_id=target.campaign_id,
            user_id=target.user_id,
            event_type=EmailEventType.opened
        )
        db.add(event)
        db.commit()
    
    return Response(content=GIF_1X1, media_type="image/gif")

@router.get("/track/click/{token}")
def track_click(token: str, db: Session = Depends(get_db)):
    target = db.query(CampaignTarget).filter(CampaignTarget.tracking_token == token).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid tracking token")
        
    event = EmailEvent(
        campaign_id=target.campaign_id,
        user_id=target.user_id,
        event_type=EmailEventType.clicked
    )
    db.add(event)
    db.commit()
    
    from app.tasks.campaigns import process_mistake_event
    process_mistake_event.delay(target.user_id, target.campaign_id)
    
    # Redirect to frontend landing page running on port 3000
    return RedirectResponse(url=f"http://localhost:3000/simulated-landing/{token}")
    
@router.get("/track/landing-info/{token}")
def get_landing_info(token: str, db: Session = Depends(get_db)):
    target = db.query(CampaignTarget).filter(CampaignTarget.tracking_token == token).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid tracking token")
        
    campaign = target.campaign
    template = db.query(EmailTemplate).filter(EmailTemplate.campaign_id == campaign.id).first()
    
    return {
        "theme": campaign.theme,
        "difficulty": campaign.difficulty,
        "language": campaign.language,
        "subject": template.subject if template else "Corporate Alert",
        "sender_name": template.sender_name if template else "IT Helpdesk",
        "cta_text": template.cta_text if template else "Sign In"
    }

@router.post("/track/credentials/{token}")
def track_credentials(token: str, db: Session = Depends(get_db)):
    target = db.query(CampaignTarget).filter(CampaignTarget.tracking_token == token).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid tracking token")
        
    event = EmailEvent(
        campaign_id=target.campaign_id,
        user_id=target.user_id,
        event_type=EmailEventType.credentials_submitted
    )
    db.add(event)
    db.commit()
    
    from app.tasks.campaigns import process_mistake_event
    process_mistake_event.delay(target.user_id, target.campaign_id)
    
    return {"status": "logged"}

@router.post("/report")
def report_phishing(payload: ReportPayload, db: Session = Depends(get_db)):
    target = db.query(CampaignTarget).filter(CampaignTarget.tracking_token == payload.token).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid tracking token")
        
    event = EmailEvent(
        campaign_id=target.campaign_id,
        user_id=target.user_id,
        event_type=EmailEventType.reported
    )
    db.add(event)
    db.commit()
    return {"message": "Report received successfully"}
