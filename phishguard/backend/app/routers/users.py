from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.rbac import get_current_user, require_role
from app.models.user import User
from app.schemas import UserProfile, UserProfileUpdate
from app.security import get_password_hash

router = APIRouter(tags=["users"])

@router.get("/users/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        organization_name=current_user.organization.name if current_user.organization else None,
        department_name=current_user.department.name if current_user.department else None,
        role_name=current_user.role.name if current_user.role else None
    )

@router.put("/users/me", response_model=UserProfile)
def update_me(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.email:
        # Check if email is already taken by someone else
        existing = db.query(User).filter(
            User.email == payload.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already taken"
            )
        current_user.email = payload.email

    if payload.password:
        current_user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(current_user)

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        organization_name=current_user.organization.name if current_user.organization else None,
        department_name=current_user.department.name if current_user.department else None,
        role_name=current_user.role.name if current_user.role else None
    )

@router.get("/admin/ping")
def admin_ping(admin_user: User = Depends(require_role(["admin"]))):
    return {"ping": "pong"}

@router.get("/users/{id}/next-campaign-suggestion")
def get_next_campaign_suggestion(
    id: int,
    current_user: User = Depends(require_role(["admin", "employee"])),
    db: Session = Depends(get_db)
):
    is_admin = current_user.role.name == "admin" if current_user.role else False
    if not is_admin and current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot view other users' campaign suggestions"
        )
        
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    return {
        "user_id": id,
        "suggested_next_difficulty": user.suggested_next_difficulty or "easy"
    }

