import re
from pydantic import BaseModel, Field, field_validator, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class UserRegister(BaseSchema):
    email: str = Field(..., description="Unique email address")
    name: str = Field(..., min_length=1, max_length=100, description="Full name")
    password: str = Field(..., min_length=8, description="Strong password")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str) -> str:
        clean_email = value.strip().lower()
        email_pattern = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
        if not email_pattern.match(clean_email):
            raise ValueError("Invalid email format.")
        return clean_email

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*()_+=\-\[\]{}|;:',.<>?/`~]", value):
            raise ValueError("Password must contain at least one special character.")
        return value

class UserLogin(BaseSchema):
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return value.strip().lower()

class UserResponse(BaseSchema):
    id: UUID
    email: str
    name: str
    role: str
    is_verified: bool
    created_at: datetime
    updated_at: datetime

class ForgotPasswordPayload(BaseSchema):
    email: str = Field(..., description="Email address")

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return value.strip().lower()

class ResetPasswordPayload(BaseSchema):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New strong password")

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*()_+=\-\[\]{}|;:',.<>?/`~]", value):
            raise ValueError("Password must contain at least one special character.")
        return value

class VerifyEmailPayload(BaseSchema):
    token: str = Field(..., description="Email verification token")
