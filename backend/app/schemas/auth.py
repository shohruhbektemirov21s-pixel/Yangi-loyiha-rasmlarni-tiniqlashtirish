from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


class AuthUserData(BaseModel):
    id: str
    email: str
    full_name: str | None
    is_active: bool
    created_at: datetime


class AuthSessionData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUserData


class AuthSessionResponse(BaseModel):
    success: bool
    message: str
    data: AuthSessionData


class LogoutResponse(BaseModel):
    success: bool
    message: str


class MeResponse(BaseModel):
    success: bool
    message: str
    data: AuthUserData


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, min_length=2, max_length=120)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Please provide a valid email address.")
        return normalized

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_password_confirmation(self):
        if self.password != self.confirm_password:
            raise ValueError("Password confirmation does not match.")
        return self


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Please provide a valid email address.")
        return normalized
