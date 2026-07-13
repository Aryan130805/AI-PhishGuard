from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.rbac import get_current_user
from app.models.user import User
from app.models.risk import RiskScore
from app.models.learning import Lesson, Certificate
from app.models.campaign import Campaign, CampaignTarget, CampaignStatus

router = APIRouter(prefix="/extension", tags=["extension"])

@router.get("/user-status")
def get_user_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Fetch latest risk score
    risk_score_entry = db.query(RiskScore).filter(RiskScore.user_id == current_user.id).order_by(RiskScore.computed_at.desc()).first()
    risk_score = risk_score_entry.score if risk_score_entry else 15.0
    
    # 2. Categorize risk level
    if risk_score < 20:
        risk_level = "safe"
    elif risk_score < 50:
        risk_level = "medium"
    elif risk_score < 80:
        risk_level = "high"
    else:
        risk_level = "expert"
        
    # 3. Determine unread lessons count
    total_lessons = db.query(Lesson).count()
    completed_lessons = db.query(Certificate).filter(Certificate.user_id == current_user.id).count()
    unread_lessons = max(0, total_lessons - completed_lessons)
    
    # 4. Fetch active campaign simulation tokens assigned to user
    targets = db.query(CampaignTarget).join(Campaign).filter(
        CampaignTarget.user_id == current_user.id,
        Campaign.status == CampaignStatus.running
    ).all()
    active_tokens = [t.tracking_token for t in targets]
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "unread_lessons": unread_lessons,
        "active_simulated_domains": active_tokens
    }
