"""add auth tables

Revision ID: 20260410_02
Revises: 20260410_01
Create Date: 2026-04-10 00:10:00
"""

from __future__ import annotations

from typing import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260410_02"
down_revision: str | None = "20260410_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=120), nullable=True),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if "revoked_tokens" not in existing_tables:
        op.create_table(
            "revoked_tokens",
            sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
            sa.Column("jti", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=True),
            sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_revoked_tokens_jti", "revoked_tokens", ["jti"], unique=True)
        op.create_index("ix_revoked_tokens_user_id", "revoked_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "revoked_tokens" in existing_tables:
        op.drop_index("ix_revoked_tokens_user_id", table_name="revoked_tokens")
        op.drop_index("ix_revoked_tokens_jti", table_name="revoked_tokens")
        op.drop_table("revoked_tokens")

    if "users" in existing_tables:
        op.drop_index("ix_users_email", table_name="users")
        op.drop_table("users")
