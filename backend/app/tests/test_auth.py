import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import User, UserRefreshToken, UserRepositoryAssociation
from app.utils.security import verify_password

# Use a test SQLite database for running these unit tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override database session dependency in FastAPI
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    # Perform clean migrations if needed (sqlite table init is handled automatically by create_all)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_user_registration_and_validation():
    # 1. Success Registration
    response = client.post(
        "/auth/register",
        json={"email": "test@example.com", "name": "Test User", "password": "Password123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "password_hash" not in data
    assert data["is_verified"] is False
    assert data["role"] == "USER"

    # 2. Duplicate Registration
    response = client.post(
        "/auth/register",
        json={"email": "test@example.com", "name": "Test User", "password": "Password123!"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

    # 3. Weak password validation
    response = client.post(
        "/auth/register",
        json={"email": "weak@example.com", "name": "Weak User", "password": "123"}
    )
    assert response.status_code == 422

    # 4. Bad email format
    response = client.post(
        "/auth/register",
        json={"email": "bademail", "name": "Bad User", "password": "Password123!"}
    )
    assert response.status_code == 422

def test_login_and_token_retrieval():
    # Register user
    client.post(
        "/auth/register",
        json={"email": "login@example.com", "name": "Login User", "password": "Password123!"}
    )

    # 1. Successful Login
    response = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "Password123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login@example.com"
    assert "refresh_token" in response.cookies

    # 2. Invalid Credentials (do not reveal specifically what is wrong)
    response = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."

def test_email_verification():
    # Register user
    reg_response = client.post(
        "/auth/register",
        json={"email": "verify@example.com", "name": "Verify User", "password": "Password123!"}
    )
    
    # Grab the verification token from database directly for testing
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "verify@example.com").first()
    assert user is not None
    token = user.verification_token
    db.close()

    # Verify Email
    response = client.post(
        "/auth/verify-email",
        json={"token": token}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Email address verified successfully."

    # Verify user state is updated
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "verify@example.com").first()
    assert user.is_verified is True
    db.close()

def test_token_rotation_and_revocation():
    client.post(
        "/auth/register",
        json={"email": "rotate@example.com", "name": "Rotate User", "password": "Password123!"}
    )
    
    # Login to retrieve cookies
    login_response = client.post(
        "/auth/login",
        json={"email": "rotate@example.com", "password": "Password123!"}
    )
    assert login_response.status_code == 200
    cookies = login_response.cookies
    refresh_cookie = cookies.get("refresh_token")
    assert refresh_cookie is not None

    # Use refresh token to get new access/refresh tokens
    refresh_response = client.post("/auth/refresh", cookies=cookies)
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()
    new_cookies = refresh_response.cookies
    new_refresh_cookie = new_cookies.get("refresh_token")
    assert new_refresh_cookie is not None
    assert new_refresh_cookie != refresh_cookie

    # Attempting to use the old revoked refresh token should fail
    fail_response = client.post("/auth/refresh", cookies=cookies)
    assert fail_response.status_code == 401

def test_logout_revocation():
    client.post(
        "/auth/register",
        json={"email": "logout@example.com", "name": "Logout User", "password": "Password123!"}
    )
    
    login_response = client.post(
        "/auth/login",
        json={"email": "logout@example.com", "password": "Password123!"}
    )
    cookies = login_response.cookies

    # Logout
    logout_response = client.post("/auth/logout", cookies=cookies)
    assert logout_response.status_code == 200
    assert logout_response.cookies.get("refresh_token") in ("", None)

    # Refresh should fail now
    refresh_response = client.post("/auth/refresh", cookies=cookies)
    assert refresh_response.status_code == 401

def test_forgot_and_reset_password():
    client.post(
        "/auth/register",
        json={"email": "reset@example.com", "name": "Reset User", "password": "Password123!"}
    )

    # Forgot password request
    response = client.post("/auth/forgot-password", json={"email": "reset@example.com"})
    assert response.status_code == 200

    # Grab token from DB
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "reset@example.com").first()
    token = user.reset_token
    db.close()

    # Reset Password
    reset_response = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "NewPassword123!"}
    )
    assert reset_response.status_code == 200

    # Test login with new password
    login_response = client.post(
        "/auth/login",
        json={"email": "reset@example.com", "password": "NewPassword123!"}
    )
    assert login_response.status_code == 200
