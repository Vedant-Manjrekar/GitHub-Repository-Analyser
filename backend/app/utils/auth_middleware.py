from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.utils.auth_tokens import decode_token

# Bearer token scheme
security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to extract and verify the JWT access token from the Authorization header.
    Returns the user object if authenticated.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token."
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject invalid."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token does not exist."
        )
        
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that ensures the user email is verified.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address must be verified to perform this action."
        )
    return current_user

class RoleChecker:
    """
    Dependency factory to check if the authenticated user has any of the allowed roles.
    """
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You do not have the required permissions."
            )
        return current_user

def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User | None:
    """
    Dependency that optionally returns the authenticated user or None if authentication fails or is missing.
    """
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None

