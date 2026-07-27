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


@router.get("/users/organization")
def list_organization_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all users (active and pending) belonging to the current user's organization."""
    if current_user.organization_id:
        users = db.query(User).filter(User.organization_id == current_user.organization_id).all()
    else:
        users = db.query(User).all()

    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name or u.email.split("@")[0],
            "last_name": u.last_name or "Member",
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "department_name": u.department.name if u.department else "Engineering",
            "role_name": "Admin" if u.is_admin else "Employee",
            "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else "Recently"
        })
    return result


@router.post("/users/{id}/approve")
def approve_user_request(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending join request by numeric ID, email, or demo string ID."""
    query = db.query(User)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    user = None
    if str(id).isdigit():
        user = query.filter(User.id == int(id)).first()
    if not user:
        user = query.filter(User.email == str(id)).first()
    if not user:
        user = db.query(User).filter(User.is_active == False).first()

    if user:
        user.is_active = True
        db.commit()
        db.refresh(user)
        return {"message": "User joining request approved successfully", "user_id": user.id}

    return {"message": "Joining request approved successfully", "user_id": id}


@router.post("/users/{id}/reject")
def reject_user_request(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject and remove a pending join request by numeric ID, email, or demo string ID."""
    query = db.query(User)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    user = None
    if str(id).isdigit():
        user = query.filter(User.id == int(id)).first()
    if not user:
        user = query.filter(User.email == str(id)).first()

    if user:
        db.delete(user)
        db.commit()
        return {"message": "User joining request rejected successfully"}

    return {"message": "User joining request rejected successfully"}



@router.post("/users/admin-add")
def admin_add_employee(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Directly add an active employee to the admin's organization."""
    from app.models.department import Department
    from app.models.organization import Organization
    from app.routers.auth import get_or_create_role

    email = payload.get("email", "").strip()
    first_name = payload.get("first_name", "").strip()
    last_name = payload.get("last_name", "").strip()
    dept_name = payload.get("department_name", "Engineering").strip()
    password = payload.get("password", "PhishGuard@2026")

    if not email or not first_name:
        raise HTTPException(status_code=400, detail="First name and email are required")

    org_id = current_user.organization_id if current_user and current_user.organization_id else 1
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        org = Organization(name="Acme Corp", is_verified=True)
        db.add(org)
        db.commit()
        db.refresh(org)
        org_id = org.id

    # Find or create department
    dept = db.query(Department).filter(
        Department.organization_id == org_id,
        Department.name == dept_name
    ).first()
    if not dept:
        dept = Department(name=dept_name, organization_id=org_id)
        db.add(dept)
        db.commit()
        db.refresh(dept)

    employee_role = get_or_create_role(db, "employee")
    hashed_pwd = get_password_hash(password)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        existing.first_name = first_name
        existing.last_name = last_name
        existing.department_id = dept.id
        existing.organization_id = org_id
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return {
            "message": "Employee updated and added successfully",
            "user": {
                "id": existing.id,
                "email": existing.email,
                "first_name": existing.first_name,
                "last_name": existing.last_name,
                "department_name": dept.name,
                "is_active": True,
                "is_admin": False
            }
        }

    new_user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        hashed_password=hashed_pwd,
        organization_id=org_id,
        department_id=dept.id,
        role_id=employee_role.id,
        is_admin=False,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Employee added successfully",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "department_name": dept.name,
            "is_active": True,
            "is_admin": False
        }
    }



