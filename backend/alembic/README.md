# Alembic Migrations

This directory contains migration scaffolding for ImageClear AI.

## Usage

```bash
cd backend
alembic upgrade head
```

## Notes

- `app/db/init_db.py` keeps local SQLite MVP databases compatible by adding
  missing optional columns at startup.
- For production/staging deployments, apply Alembic migrations explicitly.
