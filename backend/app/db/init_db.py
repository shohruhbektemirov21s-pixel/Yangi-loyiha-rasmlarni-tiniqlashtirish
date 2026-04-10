from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import engine
from app.models.daily_usage import DailyUsage
from app.models.image_job import ImageJob
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.models.user_subscription import UserSubscription


def init_database() -> None:
    _ = (ImageJob, User, RevokedToken, UserSubscription, DailyUsage)
    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility()


def ensure_schema_compatibility() -> None:
    """
    Lightweight schema compatibility patching for local SQLite MVP.

    This keeps existing local databases usable when new optional columns are
    introduced before formal migration execution.
    """
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "image_jobs" not in tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("image_jobs")}

    alter_statements: list[str] = []
    if "user_id" not in existing_columns:
        alter_statements.append("ALTER TABLE image_jobs ADD COLUMN user_id VARCHAR(64)")
    if "detected_mode" not in existing_columns:
        alter_statements.append("ALTER TABLE image_jobs ADD COLUMN detected_mode VARCHAR(32)")
    if "processing_started_at" not in existing_columns:
        alter_statements.append("ALTER TABLE image_jobs ADD COLUMN processing_started_at DATETIME")
    if "processing_completed_at" not in existing_columns:
        alter_statements.append("ALTER TABLE image_jobs ADD COLUMN processing_completed_at DATETIME")
    if "plan_code" not in existing_columns:
        alter_statements.append("ALTER TABLE image_jobs ADD COLUMN plan_code VARCHAR(32) NOT NULL DEFAULT 'free'")
    if "processing_priority" not in existing_columns:
        alter_statements.append("ALTER TABLE image_jobs ADD COLUMN processing_priority INTEGER NOT NULL DEFAULT 1")

    with engine.begin() as connection:
        for statement in alter_statements:
            connection.execute(text(statement))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_image_jobs_user_id ON image_jobs (user_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_image_jobs_plan_code ON image_jobs (plan_code)"))
