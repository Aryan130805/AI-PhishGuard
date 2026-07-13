import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from celery.result import AsyncResult

from app.database import get_db
from app.schemas import EmailGenerateRequest, CampaignCreate, CampaignUpdate, CampaignSchedule
from app.tasks.campaigns import generate_email_task
from app.models.campaign import Campaign, EmailTemplate, CampaignStatus, CampaignTarget
from app.rbac import get_current_user
from app.models.user import User

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.post("/generate-email", status_code=status.HTTP_202_ACCEPTED)
def trigger_email_generation(
    payload: EmailGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    task = generate_email_task.delay(
        payload.department_id,
        payload.difficulty,
        payload.theme,
        payload.language,
        payload.tone
    )
    return {"job_id": task.id}

@router.get("/generate-email/{job_id}")
def get_generation_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    task_result = AsyncResult(job_id)
    response_data = {
        "job_id": job_id,
        "status": task_result.status
    }
    
    if task_result.status == "SUCCESS":
        response_data["result"] = task_result.result
    elif task_result.status == "FAILURE":
        response_data["error"] = str(task_result.info)
        
    return response_data

def validate_status_transition(current_status: CampaignStatus, new_status: CampaignStatus):
    allowed = {
        CampaignStatus.draft: {CampaignStatus.scheduled, CampaignStatus.cancelled},
        CampaignStatus.scheduled: {CampaignStatus.running, CampaignStatus.cancelled},
        CampaignStatus.running: {CampaignStatus.paused, CampaignStatus.completed, CampaignStatus.cancelled},
        CampaignStatus.paused: {CampaignStatus.running, CampaignStatus.cancelled},
        CampaignStatus.completed: set(),
        CampaignStatus.cancelled: set(),
    }
    if new_status not in allowed.get(current_status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Illegal transition from {current_status.value} to {new_status.value}"
        )

@router.post("", status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not payload.template_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign must reference at least one email template"
        )
    
    # Check if all templates exist and are approved
    templates = db.query(EmailTemplate).filter(EmailTemplate.id.in_(payload.template_ids)).all()
    found_ids = {t.id for t in templates}
    missing_ids = set(payload.template_ids) - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Templates not found: {list(missing_ids)}"
        )
        
    unapproved = [t.id for t in templates if not t.approved]
    if unapproved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot attach unapproved email templates to a campaign (Unapproved IDs: {unapproved})"
        )
        
    org_id = payload.org_id if payload.org_id is not None else current_user.organization_id

    campaign = Campaign(
        org_id=org_id,
        name=payload.name,
        theme=payload.theme,
        difficulty=payload.difficulty,
        language=payload.language,
        department_id=payload.department_id,
        status=CampaignStatus.draft,
        created_by=current_user.id
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    db.query(EmailTemplate).filter(
        EmailTemplate.id.in_(payload.template_ids)
    ).update({"campaign_id": campaign.id}, synchronize_session=False)
    db.commit()
    
    return {
        "message": "Campaign created successfully",
        "campaign_id": campaign.id,
        "status": campaign.status
    }

@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    if campaign.status != CampaignStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only edit draft campaigns"
        )
        
    if payload.name is not None:
        campaign.name = payload.name
    if payload.theme is not None:
        campaign.theme = payload.theme
    if payload.difficulty is not None:
        campaign.difficulty = payload.difficulty
    if payload.language is not None:
        campaign.language = payload.language
    if payload.department_id is not None:
        campaign.department_id = payload.department_id
        
    if payload.template_ids is not None:
        if not payload.template_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign must reference at least one email template"
            )
            
        templates = db.query(EmailTemplate).filter(EmailTemplate.id.in_(payload.template_ids)).all()
        found_ids = {t.id for t in templates}
        missing_ids = set(payload.template_ids) - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Templates not found: {list(missing_ids)}"
            )
            
        unapproved = [t.id for t in templates if not t.approved]
        if unapproved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot attach unapproved email templates to a campaign (Unapproved IDs: {unapproved})"
            )
            
        # Dissociate old templates
        db.query(EmailTemplate).filter(
            EmailTemplate.campaign_id == campaign.id
        ).update({"campaign_id": None}, synchronize_session=False)
        
        # Associate new templates
        db.query(EmailTemplate).filter(
            EmailTemplate.id.in_(payload.template_ids)
        ).update({"campaign_id": campaign.id}, synchronize_session=False)
        
    db.commit()
    db.refresh(campaign)
    return campaign

@router.post("/{campaign_id}/schedule")
def schedule_campaign(
    campaign_id: int,
    payload: CampaignSchedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    validate_status_transition(campaign.status, CampaignStatus.scheduled)
    
    campaign.scheduled_at = payload.scheduled_at
    campaign.status = CampaignStatus.scheduled
    
    # Create campaign targets for all users in the target department
    if campaign.department_id:
        users = db.query(User).filter(
            User.department_id == campaign.department_id,
            User.organization_id == campaign.org_id,
            User.is_active == True
        ).all()
        
        # Remove any existing targets to avoid duplicates if re-scheduled
        db.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign.id).delete(synchronize_session=False)
        
        for u in users:
            target = CampaignTarget(
                campaign_id=campaign.id,
                user_id=u.id,
                tracking_token=uuid.uuid4().hex
            )
            db.add(target)
            
            # Notify employee about scheduled campaign/simulation
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    db=db,
                    user_id=u.id,
                    notif_type="campaign_scheduled",
                    payload={
                        "message": f"A new security awareness campaign '{campaign.name}' has been scheduled for your department.",
                        "link": "/employee/dashboard"
                    }
                )
            except Exception as notif_err:
                print(f"Failed to create campaign_scheduled notification for user {u.id}: {str(notif_err)}")
            
    db.commit()
    db.refresh(campaign)
    
    target_count = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign.id).count()
    return {
        "message": "Campaign scheduled successfully",
        "status": campaign.status,
        "scheduled_at": campaign.scheduled_at,
        "target_count": target_count
    }

@router.post("/{campaign_id}/pause")
def pause_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    validate_status_transition(campaign.status, CampaignStatus.paused)
    campaign.status = CampaignStatus.paused
    db.commit()
    db.refresh(campaign)
    return {"message": "Campaign paused successfully", "status": campaign.status}

@router.post("/{campaign_id}/resume")
def resume_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    validate_status_transition(campaign.status, CampaignStatus.running)
    campaign.status = CampaignStatus.running
    db.commit()
    db.refresh(campaign)
    return {"message": "Campaign resumed successfully", "status": campaign.status}

@router.post("/{campaign_id}/clone")
def clone_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    cloned_campaign = Campaign(
        org_id=campaign.org_id,
        name=f"{campaign.name} (Clone)",
        theme=campaign.theme,
        difficulty=campaign.difficulty,
        language=campaign.language,
        department_id=campaign.department_id,
        status=CampaignStatus.draft,
        created_by=current_user.id
    )
    db.add(cloned_campaign)
    db.commit()
    db.refresh(cloned_campaign)
    
    # Duplicate original campaign's templates
    for t in campaign.templates:
        cloned_template = EmailTemplate(
            campaign_id=cloned_campaign.id,
            subject=t.subject,
            sender_name=t.sender_name,
            sender_email=t.sender_email,
            body_html=t.body_html,
            cta_text=t.cta_text,
            fake_url=t.fake_url,
            ai_generated=t.ai_generated,
            approved=t.approved
        )
        db.add(cloned_template)
        
    db.commit()
    db.refresh(cloned_campaign)
    
    return {
        "message": "Campaign cloned successfully",
        "campaign_id": cloned_campaign.id,
        "status": cloned_campaign.status
    }

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    if campaign.status != CampaignStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft campaigns"
        )
        
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@router.get("")
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaigns = db.query(Campaign).filter(Campaign.org_id == current_user.organization_id).all()
    result = []
    for c in campaigns:
        target_count = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == c.id).count()
        result.append({
            "id": c.id,
            "name": c.name,
            "theme": c.theme,
            "difficulty": c.difficulty,
            "language": c.language,
            "department_id": c.department_id,
            "status": c.status,
            "scheduled_at": c.scheduled_at,
            "target_count": target_count,
            "templates": [{
                "id": t.id,
                "subject": t.subject,
                "sender_name": t.sender_name,
                "sender_email": t.sender_email,
                "body_html": t.body_html,
                "cta_text": t.cta_text,
                "fake_url": t.fake_url,
                "approved": t.approved
            } for t in c.templates]
        })
    return result

@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.org_id == current_user.organization_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        
    target_count = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign.id).count()
    return {
        "id": campaign.id,
        "name": campaign.name,
        "theme": campaign.theme,
        "difficulty": campaign.difficulty,
        "language": campaign.language,
        "department_id": campaign.department_id,
        "status": campaign.status,
        "scheduled_at": campaign.scheduled_at,
        "target_count": target_count,
        "templates": [{
            "id": t.id,
            "subject": t.subject,
            "sender_name": t.sender_name,
            "sender_email": t.sender_email,
            "body_html": t.body_html,
            "cta_text": t.cta_text,
            "fake_url": t.fake_url,
            "approved": t.approved
        } for t in campaign.templates]
    }

@router.get("/departments/list")
def list_campaign_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.department import Department
    depts = db.query(Department).filter(Department.organization_id == current_user.organization_id).all()
    return [{"id": d.id, "name": d.name} for d in depts]

