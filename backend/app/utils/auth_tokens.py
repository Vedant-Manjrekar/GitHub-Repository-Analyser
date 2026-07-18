import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import jwt

# Secure secrets load
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # In development we can use a hardcoded default, but in production we must enforce one
    if os.getenv("ENV", "development") == "production":
        raise RuntimeError("JWT_SECRET environment variable is required in production!")
    JWT_SECRET = "dev-fallback-jwt-secret-key-git-repository-analytics"

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

def create_access_token(subject: str, email: str, role: str) -> str:
    """Generates a short-lived access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(subject),
        "email": email,
        "role": role,
        "type": "access",
        "exp": int(expire.timestamp())
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    """
    Generates a long-lived refresh token.
    Returns: (encoded_jwt, token_jti, expires_at)
    """
    token_jti = str(uuid.uuid4())
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    expires_at = datetime.now(timezone.utc) + expires_delta
    
    to_encode = {
        "sub": str(subject),
        "jti": token_jti,
        "type": "refresh",
        "exp": int(expires_at.timestamp())
    }
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt, token_jti, expires_at

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes a JWT token.
    Returns payload if valid, otherwise None.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
