from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.schemas import EmailTemplateUpdate
from app.models.campaign import EmailTemplate
from app.rbac import get_current_user
from app.models.user import User

router = APIRouter(prefix="/email-templates", tags=["email-templates"])

@router.get("")
def list_email_templates(
    approved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EmailTemplate)
    if approved is not None:
        query = query.filter(EmailTemplate.approved == approved)
    
    templates = query.all()
    return templates

@router.put("/{template_id}")
def update_email_template(
    template_id: int,
    payload: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template with ID {template_id} not found"
        )
        
    if payload.subject is not None:
        template.subject = payload.subject
    if payload.sender_name is not None:
        template.sender_name = payload.sender_name
    if payload.sender_email is not None:
        template.sender_email = payload.sender_email
    if payload.body_html is not None:
        template.body_html = payload.body_html
    if payload.cta_text is not None:
        template.cta_text = payload.cta_text
    if payload.fake_url is not None:
        template.fake_url = payload.fake_url
        
    db.commit()
    db.refresh(template)
    return template

@router.post("/{template_id}/approve")
def approve_email_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email template with ID {template_id} not found"
        )
        
    template.approved = True
    db.commit()
    db.refresh(template)
    
    return {
        "message": "Email template approved successfully",
        "template_id": template.id,
        "approved": template.approved
    }
