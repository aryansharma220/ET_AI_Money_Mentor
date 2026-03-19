"""Authentication helpers for password hashing and JWT handling."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash plain-text password securely using bcrypt."""

    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plain password against stored hash."""

    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    """Create signed JWT with subject claim and expiry."""

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": subject,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """Decode JWT token and return subject claim."""

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if not subject:
            raise JWTError("Token subject missing")
        return str(subject)
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
