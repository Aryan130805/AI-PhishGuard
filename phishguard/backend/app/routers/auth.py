from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import hashlib
import jwt

from app.database import get_db
from app.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.models.user import User
from app.models.organization import Organization
from app.models.role import Role
from app.models.refresh_token import RefreshToken
from app.schemas import (
    UserRegister, UserLogin, TokenResponse, RefreshRequest, TokenRefreshResponse,
    EmployeeRegister, OrganizationRegister
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

def get_or_create_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        role = Role(name=name, description=f"{name.capitalize()} role")
        db.add(role)
        db.commit()
        db.refresh(role)
    return role

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Check if organization already exists, or create it
    org = db.query(Organization).filter(Organization.name == payload.organization_name).first()
    is_new_org = False
    if not org:
        org = Organization(name=payload.organization_name)
        db.add(org)
        db.commit()
        db.refresh(org)
        is_new_org = True
        
    # Ensure roles are seeded
    admin_role = get_or_create_role(db, "admin")
    employee_role = get_or_create_role(db, "employee")
    
    # First user in a new org becomes admin; users joining an existing org become employees
    assigned_role = admin_role if is_new_org else employee_role
    is_admin_flag = is_new_org
    
    hashed_pwd = get_password_hash(payload.password)
    user = User(
        email=payload.email,
        hashed_password=hashed_pwd,
        organization_id=org.id,
        role_id=assigned_role.id,
        is_admin=is_admin_flag,
        supabase_uid=payload.supabase_uid
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"message": "Registration successful", "user_id": user.id}


@router.post("/register-employee", status_code=status.HTTP_201_CREATED)
def register_employee(payload: EmployeeRegister, db: Session = Depends(get_db)):
    from app.models.department import Department

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Check if specified organization exists
    org = db.query(Organization).filter(Organization.id == payload.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected organization does not exist. Please contact your administrator."
        )
        
    employee_role = get_or_create_role(db, "employee")
    hashed_pwd = get_password_hash(payload.password)
    
    # Resolve Department
    dept_id = payload.department_id
    if not dept_id and payload.department_name:
        dept = db.query(Department).filter(
            Department.organization_id == org.id,
            Department.name == payload.department_name.strip()
        ).first()
        if not dept:
            dept = Department(name=payload.department_name.strip(), organization_id=org.id)
            db.add(dept)
            db.commit()
            db.refresh(dept)
        dept_id = dept.id
    
    # Create user with is_active = False (Pending join approval)
    user = User(
        email=payload.email,
        hashed_password=hashed_pwd,
        first_name=payload.first_name,
        last_name=payload.last_name,
        organization_id=org.id,
        department_id=dept_id,
        role_id=employee_role.id,
        is_admin=False,
        is_active=False,
        supabase_uid=payload.supabase_uid
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Joining request submitted successfully. Pending organization admin approval.",
        "user_id": user.id
    }



@router.post("/register-organization", status_code=status.HTTP_201_CREATED)
def register_organization(payload: OrganizationRegister, db: Session = Depends(get_db)):
    # Check if organization name is already taken
    existing_org = db.query(Organization).filter(Organization.name == payload.name.strip()).first()
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An organization with this name already exists."
        )

    # Check if admin email already registered
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )

    # Create Organization
    org = Organization(
        name=payload.name.strip(),
        industry=payload.industry,
        company_size=payload.company_size,
        website=payload.website,
        country=payload.country,
        state=payload.state,
        city=payload.city,
        logo_url=payload.logo_url,
        is_verified=True
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Create Admin User
    admin_role = get_or_create_role(db, "admin")
    hashed_pwd = get_password_hash(payload.password)
    
    user = User(
        email=payload.email,
        hashed_password=hashed_pwd,
        organization_id=org.id,
        role_id=admin_role.id,
        is_admin=True,
        supabase_uid=payload.supabase_uid
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Organization created successfully", "org_id": org.id, "user_id": user.id}

from fastapi import APIRouter, Depends, HTTPException, status, Response

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )
        
    # Generate tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Store hashed refresh token in database
    token_hash = hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()
    
    # Check user role to set role-specific cookies
    role_name = user.role.name if user.role else "employee"
    cookie_key = "access_token_admin" if role_name == "admin" else "access_token_employee"
    refresh_cookie_key = "refresh_token_admin" if role_name == "admin" else "refresh_token_employee"

    # Set httpOnly cookies
    response.set_cookie(
        key=cookie_key,
        value=access_token,
        httponly=True,
        secure=False,  # Dev environment (False)
        samesite="lax",
        path="/"
    )
    response.set_cookie(
        key=refresh_cookie_key,
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )
    # Also set a generic fallback cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh(payload: RefreshRequest, response: Response, db: Session = Depends(get_db)):
    token = payload.refresh_token
    token_data = decode_token(token)
    
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token context"
        )
        
    # Verify in DB
    token_hash = hash_token(token)
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.is_revoked == False
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or revoked"
        )
        
    # Check expiry
    expiry = db_token.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
        
    if expiry < datetime.now(timezone.utc):
        db_token.is_revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
        
    # Generate new access token
    new_access_token = create_access_token(subject=user_id)
    
    # Query user to set correct cookie name
    user = db.query(User).filter(User.id == int(user_id)).first()
    role_name = user.role.name if user and user.role else "employee"
    cookie_key = "access_token_admin" if role_name == "admin" else "access_token_employee"

    # Set new access token cookie
    response.set_cookie(
        key=cookie_key,
        value=new_access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(response: Response):
    for key in ["access_token", "refresh_token", "access_token_admin", "access_token_employee", "refresh_token_admin", "refresh_token_employee"]:
        response.delete_cookie(key, path="/")
    return {"message": "Logged out successfully"}
