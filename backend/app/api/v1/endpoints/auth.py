from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_auth_service, get_bearer_token, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    LogoutResponse,
    MeResponse,
    RegisterRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    session = auth_service.register(db=db, payload=payload)
    return AuthSessionResponse(
        success=True,
        message="Account created successfully.",
        data=session,
    )


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    session = auth_service.login(db=db, payload=payload)
    return AuthSessionResponse(
        success=True,
        message="Logged in successfully.",
        data=session,
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    db: Session = Depends(get_db),
    token: str = Depends(get_bearer_token),
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> LogoutResponse:
    auth_service.logout(db=db, token=token, user_id=current_user.id)
    return LogoutResponse(success=True, message="Logged out successfully.")


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        success=True,
        message="Current user fetched successfully.",
        data=AuthService.to_user_data(current_user),
    )
