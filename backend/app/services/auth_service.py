from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.auth import AuthSessionData, AuthUserData, LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def register(self, *, db: Session, payload: RegisterRequest) -> AuthSessionData:
        email = payload.email.strip().lower()
        full_name = payload.full_name.strip() if payload.full_name else None
        self._validate_password_strength(payload.password)

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise AppError(
                "An account with this email already exists.",
                status_code=409,
                code="email_already_registered",
            )

        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(payload.password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return self._build_session_data(user=user)

    def login(self, *, db: Session, payload: LoginRequest) -> AuthSessionData:
        email = payload.email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise AppError("Invalid email or password.", status_code=401, code="invalid_credentials")

        if not user.is_active:
            raise AppError("This account is inactive.", status_code=403, code="inactive_account")

        if not verify_password(payload.password, user.password_hash):
            raise AppError("Invalid email or password.", status_code=401, code="invalid_credentials")

        return self._build_session_data(user=user)

    def get_user_from_token(self, *, db: Session, token: str) -> User:
        payload = decode_access_token(
            token=token,
            secret_key=self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
        )

        jti = payload.get("jti")
        subject = payload.get("sub")
        if not isinstance(jti, str) or not isinstance(subject, str):
            raise AppError("Invalid authentication token payload.", status_code=401, code="invalid_token")

        revoked = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
        if revoked:
            raise AppError("Authentication token has been revoked.", status_code=401, code="token_revoked")

        user = db.query(User).filter(User.id == subject).first()
        if not user or not user.is_active:
            raise AppError("Authenticated user not found.", status_code=401, code="invalid_token")

        return user

    def logout(self, *, db: Session, token: str, user_id: str | None = None) -> None:
        payload = decode_access_token(
            token=token,
            secret_key=self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
        token_user_id = payload.get("sub")

        if not isinstance(jti, str) or not isinstance(exp, (int, float)):
            raise AppError("Invalid authentication token payload.", status_code=401, code="invalid_token")

        if user_id and isinstance(token_user_id, str) and user_id != token_user_id:
            raise AppError("Token ownership mismatch.", status_code=401, code="invalid_token")

        existing = db.query(RevokedToken).filter(RevokedToken.jti == jti).first()
        if existing:
            return

        expires_at = datetime.fromtimestamp(float(exp), tz=UTC)
        revoked_token = RevokedToken(
            jti=jti,
            user_id=token_user_id if isinstance(token_user_id, str) else None,
            token_expires_at=expires_at,
        )
        db.add(revoked_token)
        db.commit()

    def _build_session_data(self, *, user: User) -> AuthSessionData:
        issued = create_access_token(
            subject=user.id,
            secret_key=self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
            expires_minutes=self.settings.jwt_access_token_expire_minutes,
            additional_claims={"email": user.email},
        )
        return AuthSessionData(
            access_token=issued.token,
            token_type="bearer",
            expires_in=issued.expires_in_seconds,
            user=self.to_user_data(user),
        )

    def _validate_password_strength(self, password: str) -> None:
        min_len = max(int(self.settings.auth_password_min_length), 6)
        if len(password) < min_len:
            raise AppError(
                f"Password must be at least {min_len} characters long.",
                status_code=422,
                code="weak_password",
            )

    @staticmethod
    def to_user_data(user: User) -> AuthUserData:
        return AuthUserData(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at,
        )
