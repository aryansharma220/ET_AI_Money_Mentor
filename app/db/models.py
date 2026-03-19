"""SQLModel table definitions."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """Application user for basic email/password authentication."""

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    created_at: datetime = Field(default_factory=utc_now)


class SavedPlan(SQLModel, table=True):
    """Persisted deterministic plan snapshots associated with users."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    plan_input_json: str
    plan_output_json: str
    created_at: datetime = Field(default_factory=utc_now, index=True)
