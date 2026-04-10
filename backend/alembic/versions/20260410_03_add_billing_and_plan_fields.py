"""add billing tables and plan fields

Revision ID: 20260410_03
Revises: 20260410_02
Create Date: 2026-04-10 04:00:00
"""

from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260410_03"
down_revision: str | None = "20260410_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "user_subscriptions" not in tables:
        op.create_table(
            "user_subscriptions",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("plan_code", sa.String(length=32), nullable=False, server_default="free"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column("provider", sa.String(length=32), nullable=False, server_default="internal"),
            sa.Column("provider_customer_id", sa.String(length=128), nullable=True),
            sa.Column("provider_subscription_id", sa.String(length=128), nullable=True),
            sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
            sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"], unique=True)

    if "daily_usage" not in tables:
        op.create_table(
            "daily_usage",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("usage_date", sa.Date(), nullable=False),
            sa.Column("uploads_used", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("user_id", "usage_date", name="uq_daily_usage_user_date"),
        )
        op.create_index("ix_daily_usage_user_id", "daily_usage", ["user_id"], unique=False)
        op.create_index("ix_daily_usage_usage_date", "daily_usage", ["usage_date"], unique=False)

    if "image_jobs" in tables:
        existing_columns = {column["name"] for column in inspector.get_columns("image_jobs")}
        with op.batch_alter_table("image_jobs") as batch:
            if "plan_code" not in existing_columns:
                batch.add_column(
                    sa.Column(
                        "plan_code",
                        sa.String(length=32),
                        nullable=False,
                        server_default="free",
                    )
                )
            if "processing_priority" not in existing_columns:
                batch.add_column(
                    sa.Column(
                        "processing_priority",
                        sa.Integer(),
                        nullable=False,
                        server_default="1",
                    )
                )

        existing_indexes = {index["name"] for index in inspector.get_indexes("image_jobs")}
        if "ix_image_jobs_plan_code" not in existing_indexes:
            op.create_index("ix_image_jobs_plan_code", "image_jobs", ["plan_code"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "image_jobs" in tables:
        existing_columns = {column["name"] for column in inspector.get_columns("image_jobs")}
        existing_indexes = {index["name"] for index in inspector.get_indexes("image_jobs")}
        with op.batch_alter_table("image_jobs") as batch:
            if "ix_image_jobs_plan_code" in existing_indexes:
                batch.drop_index("ix_image_jobs_plan_code")
            if "processing_priority" in existing_columns:
                batch.drop_column("processing_priority")
            if "plan_code" in existing_columns:
                batch.drop_column("plan_code")

    if "daily_usage" in tables:
        op.drop_index("ix_daily_usage_usage_date", table_name="daily_usage")
        op.drop_index("ix_daily_usage_user_id", table_name="daily_usage")
        op.drop_table("daily_usage")

    if "user_subscriptions" in tables:
        op.drop_index("ix_user_subscriptions_user_id", table_name="user_subscriptions")
        op.drop_table("user_subscriptions")
