import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRefreshToken
from app.schemas_auth import (
    UserRegister, UserLogin, UserResponse,
    ForgotPasswordPayload, ResetPasswordPayload, VerifyEmailPayload
)
from app.utils.security import get_password_hash, verify_password, generate_secure_token
from app.utils.auth_tokens import create_access_token, create_refresh_token, decode_token
from app.utils.auth_middleware import get_current_user
from app.utils.rate_limiter import rate_limit

logger = logging.getLogger("auth")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "refresh_token"

@router.post("/register", response_model=UserResponse, dependencies=[Depends(rate_limit(5, 60))])
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user and generates a verification token."""
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        # Prevent email enumeration: return standard error, or follow prompt
        # The prompt says: "Reject duplicate email registrations."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
        
    verification_token = generate_secure_token()
    token_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    
    hashed = get_password_hash(payload.password)
    
    new_user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hashed,
        role="USER",
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires_at=token_expiry
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"User registered successfully. Email: {new_user.email}")
    # Print verification token to console/logs for testing purposes
    print(f"VERIFICATION TOKEN for {new_user.email}: {verification_token}")
    
    return new_user

@router.post("/login", dependencies=[Depends(rate_limit(5, 60))])
def login(request: Request, payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    """Authenticates user, returns access token, sets HttpOnly refresh token cookie."""
    user = db.query(User).filter(User.email == payload.email).first()
    
    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password."
    )
    
    if not user:
        logger.warning(f"Failed login attempt: email not found. Email: {payload.email}")
        raise generic_error
        
    if not verify_password(payload.password, user.password_hash):
        logger.warning(f"Failed login attempt: incorrect password. Email: {payload.email}")
        raise generic_error
        
    # Generate access and refresh tokens
    access_token = create_access_token(user.id, user.email, user.role)
    refresh_token_jwt, token_jti, expires_at = create_refresh_token(user.id)
    
    # Store refresh token jti in the database
    db_token = UserRefreshToken(
        user_id=user.id,
        token_jti=token_jti,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(db_token)
    db.commit()
    
    # Set Refresh Token cookie (Secure, HttpOnly, SameSite=Lax)
    is_secure = (os.getenv("ENV", "development") == "production") or (request.url.scheme == "https")
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token_jwt,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        expires=expires_at,
        path="/auth" # Limit cookie path to auth endpoints
    )
    
    logger.info(f"User logged in successfully. Email: {user.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_verified": user.is_verified
        }
    }

@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Refreshes access and refresh tokens using token rotation."""
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing."
        )
        
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token."
        )
        
    token_jti = payload.get("jti")
    user_id = payload.get("sub")
    
    try:
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token format."
        )
        
    # Check if this token exists and is valid in database
    db_token = db.query(UserRefreshToken).filter(
        UserRefreshToken.token_jti == token_jti,
        UserRefreshToken.user_id == user_uuid
    ).first()
    
    if not db_token or db_token.is_revoked or db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        logger.warning(f"Re-use / abuse or revocation detected for refresh token JTI: {token_jti}")
        # In case of token reuse or theft, revoke all refresh tokens of the user for security!
        if user_uuid:
            db.query(UserRefreshToken).filter(UserRefreshToken.user_id == user_uuid).update({"is_revoked": True})
            db.commit()
        response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token."
        )
        
    # Rotate token: revoke old one
    db_token.is_revoked = True
    
    # Load user
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
        
    # Generate new tokens
    access_token = create_access_token(user.id, user.email, user.role)
    new_refresh_token_jwt, new_token_jti, expires_at = create_refresh_token(user.id)
    
    # Store new refresh token jti in the database
    new_db_token = UserRefreshToken(
        user_id=user.id,
        token_jti=new_token_jti,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(new_db_token)
    db.commit()
    
    # Set new cookie
    is_secure = (os.getenv("ENV", "development") == "production") or (request.url.scheme == "https")
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=new_refresh_token_jwt,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        expires=expires_at,
        path="/auth"
    )
    
    logger.info(f"Tokens rotated successfully for user ID: {user.id}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Logs out user by revoking the current refresh token."""
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        payload = decode_token(refresh_token)
        if payload and payload.get("type") == "refresh":
            token_jti = payload.get("jti")
            db.query(UserRefreshToken).filter(UserRefreshToken.token_jti == token_jti).update({"is_revoked": True})
            db.commit()
            logger.info(f"Refresh token JTI {token_jti} revoked on logout.")
            
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/auth")
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieves the currently authenticated user details."""
    return current_user

@router.post("/forgot-password", dependencies=[Depends(rate_limit(5, 60))])
def forgot_password(payload: ForgotPasswordPayload, db: Session = Depends(get_db)):
    """Initiates a secure password reset flow."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        reset_token = generate_secure_token()
        user.reset_token = reset_token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        logger.info(f"Password reset initiated for user: {user.email}")
        # Print token to log for development purposes
        print(f"PASSWORD RESET TOKEN for {user.email}: {reset_token}")
        
    # Return success message regardless of user existence to prevent enumeration
    return {"message": "If this email is registered, a password reset link has been generated."}

@router.post("/reset-password", dependencies=[Depends(rate_limit(5, 60))])
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    """Verifies reset token, updates password, and revokes all refresh tokens."""
    user = db.query(User).filter(
        User.reset_token == payload.token,
        User.reset_token_expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )
        
    # Update password and clear reset token
    user.password_hash = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    
    # Revoke all active refresh tokens for the user (defense-in-depth on password change)
    db.query(UserRefreshToken).filter(UserRefreshToken.user_id == user.id).update({"is_revoked": True})
    db.commit()
    
    logger.info(f"Password reset successfully completed for user: {user.email}")
    return {"message": "Password reset successfully. Please log in with your new password."}

@router.post("/verify-email", dependencies=[Depends(rate_limit(5, 60))])
def verify_email(payload: VerifyEmailPayload, db: Session = Depends(get_db)):
    """Verifies user email using the verification token."""
    user = db.query(User).filter(
        User.verification_token == payload.token,
        User.verification_token_expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token."
        )
        
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()
    
    logger.info(f"Email verified successfully for user: {user.email}")
    return {"message": "Email address verified successfully."}
