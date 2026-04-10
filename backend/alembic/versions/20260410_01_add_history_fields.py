"""add history fields on image jobs

Revision ID: 20260410_01
Revises:
Create Date: 2026-04-10 00:00:00
"""

from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260410_01"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "image_jobs" not in inspector.get_table_names():
        op.create_table(
            "image_jobs",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("user_id", sa.String(length=64), nullable=True),
            sa.Column("original_filename", sa.String(length=255), nullable=False),
            sa.Column("stored_filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=False),
            sa.Column("size_bytes", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("detected_mode", sa.String(length=32), nullable=True),
            sa.Column("upload_path", sa.String(length=1024), nullable=False),
            sa.Column("output_path", sa.String(length=1024), nullable=True),
            sa.Column("enhanced_image_url", sa.String(length=1024), nullable=True),
            sa.Column("extracted_text", sa.Text(), nullable=True),
            sa.Column("metadata_json", sa.Text(), nullable=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("processing_completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_image_jobs_user_id", "image_jobs", ["user_id"], unique=False)
        return

    existing_columns = {column["name"] for column in inspector.get_columns("image_jobs")}

    with op.batch_alter_table("image_jobs") as batch:
        if "user_id" not in existing_columns:
            batch.add_column(sa.Column("user_id", sa.String(length=64), nullable=True))
        if "detected_mode" not in existing_columns:
            batch.add_column(sa.Column("detected_mode", sa.String(length=32), nullable=True))
        if "processing_started_at" not in existing_columns:
            batch.add_column(sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True))
        if "processing_completed_at" not in existing_columns:
            batch.add_column(sa.Column("processing_completed_at", sa.DateTime(timezone=True), nullable=True))

    existing_indexes = {index["name"] for index in inspector.get_indexes("image_jobs")}
    if "ix_image_jobs_user_id" not in existing_indexes:
        op.create_index("ix_image_jobs_user_id", "image_jobs", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "image_jobs" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("image_jobs")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("image_jobs")}

    with op.batch_alter_table("image_jobs") as batch:
        if "ix_image_jobs_user_id" in existing_indexes:
            batch.drop_index("ix_image_jobs_user_id")
        if "processing_completed_at" in existing_columns:
            batch.drop_column("processing_completed_at")
        if "processing_started_at" in existing_columns:
            batch.drop_column("processing_started_at")
        if "detected_mode" in existing_columns:
            batch.drop_column("detected_mode")
        if "user_id" in existing_columns:
            batch.drop_column("user_id")
