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
    user_id = payload.get("sub")
    token_type = payload.get("type")
    
    if user_id is None or token_type != "access":
        raise credentials_exception
        
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except ValueError:
        raise credentials_exception

    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        
    return user

class RequireRole:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.name if current_user.role else None
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Role not authorized to access this resource"
            )
        return current_user

def require_role(allowed_roles: list[str]):
    return RequireRole(allowed_roles)
