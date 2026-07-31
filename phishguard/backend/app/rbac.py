from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

from fastapi import Request

def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        token = (
            request.cookies.get("access_token_admin") or
            request.cookies.get("access_token_employee") or
            request.cookies.get("access_token")
        )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    sub = payload.get("sub")
    email = payload.get("email") or payload.get("user_metadata", {}).get("email")

    if not sub and not email:
        raise credentials_exception

    user = None
    # 1. Try matching by supabase_uid
    if sub:
        user = db.query(User).filter(User.supabase_uid == str(sub)).first()

    # 2. Try matching by email
    if not user and email:
        user = db.query(User).filter(User.email == str(email)).first()

    # 3. Try matching by integer primary key id (legacy local tokens)
    if not user and sub:
        try:
            user = db.query(User).filter(User.id == int(sub)).first()
        except ValueError:
            pass

    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        
    return user

class RequireRole:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.name if current_user.role else ("admin" if current_user.is_admin else "employee")
        if current_user.is_admin:
            user_role = "admin"

        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Role not authorized to access this resource"
            )
        return current_user

def require_role(allowed_roles: list[str]):
    return RequireRole(allowed_roles)
