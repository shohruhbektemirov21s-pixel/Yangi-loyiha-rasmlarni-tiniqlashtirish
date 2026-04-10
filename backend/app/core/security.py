from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import hashlib
import uuid

import bcrypt
from jose import JWTError, jwt

from app.core.errors import AppError


def _password_bytes_for_bcrypt(password: str) -> bytes:
    """bcrypt 72 baytdan oshmaydi; uzun parollar uchun SHA-256 digest ishlatiladi."""
    data = password.encode("utf-8")
    if len(data) > 72:
        return hashlib.sha256(data).digest()
    return data


def _legacy_truncated_utf8(password: str) -> bytes:
    """Eski passlib/bcrypt: UTF-8 dan birinchi 72 bayt (muammoli, lekin DB dagi eski yozuvlar uchun)."""
    return password.encode("utf-8")[:72]


@dataclass(slots=True)
class IssuedToken:
    token: str
    jti: str
    expires_at: datetime
    expires_in_seconds: int


def hash_password(password: str) -> str:
    secret = _password_bytes_for_bcrypt(password)
    return bcrypt.hashpw(secret, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    h = password_hash.encode("utf-8")
    raw = password.encode("utf-8")
    candidates: list[bytes] = [_password_bytes_for_bcrypt(password)]
    if len(raw) > 72:
        candidates.append(_legacy_truncated_utf8(password))

    seen: set[bytes] = set()
    for secret in candidates:
        if secret in seen:
            continue
        seen.add(secret)
        try:
            if bcrypt.checkpw(secret, h):
                return True
        except ValueError:
            continue
    return False


def create_access_token(
    *,
    subject: str,
    secret_key: str,
    algorithm: str,
    expires_minutes: int,
    additional_claims: dict[str, str] | None = None,
) -> IssuedToken:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=max(expires_minutes, 1))
    jti = uuid.uuid4().hex

    payload: dict[str, object] = {
        "sub": subject,
        "jti": jti,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    if additional_claims:
        payload.update(additional_claims)

    encoded = jwt.encode(payload, secret_key, algorithm=algorithm)
    expires_in = int((expires_at - now).total_seconds())

    return IssuedToken(
        token=encoded,
        jti=jti,
        expires_at=expires_at,
        expires_in_seconds=expires_in,
    )


def decode_access_token(*, token: str, secret_key: str, algorithm: str) -> dict[str, object]:
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
    except JWTError as exc:
        raise AppError(
            "Invalid or expired authentication token.",
            status_code=401,
            code="invalid_token",
        ) from exc

    if not isinstance(payload, dict):
        raise AppError("Invalid authentication token payload.", status_code=401, code="invalid_token")

    token_type = payload.get("type")
    subject = payload.get("sub")
    jti = payload.get("jti")
    exp = payload.get("exp")

    if token_type != "access" or not isinstance(subject, str) or not isinstance(jti, str):
        raise AppError("Invalid authentication token payload.", status_code=401, code="invalid_token")

    if not isinstance(exp, (int, float)):
        raise AppError("Invalid authentication token expiry.", status_code=401, code="invalid_token")

    return payload
