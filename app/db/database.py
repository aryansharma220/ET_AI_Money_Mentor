"""Database engine and session dependencies."""

from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def _ensure_goal_lifecycle_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        table_info = connection.exec_driver_sql("PRAGMA table_info('goallifecycle')").fetchall()
        if not table_info:
            return

        existing_columns = {column[1] for column in table_info}
        if "depends_on_goal_ids_json" not in existing_columns:
            connection.exec_driver_sql(
                "ALTER TABLE goallifecycle ADD COLUMN depends_on_goal_ids_json TEXT NOT NULL DEFAULT '[]'"
            )
        if "linked_to_goal_ids_json" not in existing_columns:
            connection.exec_driver_sql(
                "ALTER TABLE goallifecycle ADD COLUMN linked_to_goal_ids_json TEXT NOT NULL DEFAULT '[]'"
            )


def init_db() -> None:
    """Create all tables on startup if they do not already exist."""

    SQLModel.metadata.create_all(engine)
    _ensure_goal_lifecycle_columns()


def get_session() -> Generator[Session, None, None]:
    """Yield database session for request-scoped dependency injection."""

    with Session(engine) as session:
        yield session
