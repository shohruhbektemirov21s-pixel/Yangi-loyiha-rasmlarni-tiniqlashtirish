# ImageClear AI Backend

FastAPI backend for uploading blurry images, running enhancement/OCR, and returning structured processing results.

## Features
- JWT auth with registration, login, logout, and current-user endpoint
- REST endpoints for health, upload, and processing result
- REST endpoints for processing history list and delete
- REST endpoints for pricing overview and subscription plan switching
- Local storage for MVP (`storage/uploads`, `storage/outputs`)
- SQLite persistence for uploaded/processed image jobs
- Clean architecture with routers, services, schemas, utils, and workers
- File type and size validation for uploads
- Structured JSON success/error responses
- Queue-ready processing abstraction (`sync` backend now)
- Plan-aware usage limits and daily upload tracking (`free` vs `premium`)
- Premium-ready processing controls (priority hint, higher-resolution target, quality OCR mode)
- Modular OCR pipeline with preprocessing variants and pluggable engine adapter
- Smart image-type detection (`photo`, `screenshot`, `document`, `text_heavy`) with mode-specific enhancement strategy
- CORS support for Next.js frontend
- Environment-driven configuration
- Migration-ready Alembic structure (`alembic.ini`, `alembic/versions`)

## Folder Structure
```
backend/
├── alembic/
│   └── versions/
├── alembic.ini
├── app/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── utils/
│   └── workers/
├── storage/
│   ├── uploads/
│   └── outputs/
├── tests/
├── .env.example
└── requirements.txt
```

## Quick Start
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Docs:
- Swagger UI: `http://localhost:8000/api/v1/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

## API Endpoints
### 1) Health Check
`GET /api/v1/health`

### 2) Image Upload
`POST /api/v1/images/upload`
- Content type: `multipart/form-data`
- Form field: `file`
- Supported: `JPG`, `JPEG`, `PNG`, `WEBP`
- Requires `Authorization: Bearer <access_token>`

### 3) Image Processing Result
`GET /api/v1/images/{image_id}/result?process_if_pending=true`
- If `process_if_pending=true` and image is uploaded, processing runs through queue abstraction.
- Returns status (`uploaded`, `processing`, `completed`, `failed`), `detected_mode`, enhanced image URL/path, OCR text, and metadata.
- Requires `Authorization: Bearer <access_token>`

### 4) Processing History
`GET /api/v1/images/history?limit=20&offset=0`
- Returns paginated history including file info, preview URLs, output path, extracted text, detected mode, and timestamps.
- Requires `Authorization: Bearer <access_token>`

### 5) Delete Processing History Item
`DELETE /api/v1/images/history/{image_id}`
- Deletes history row and associated local files when present.
- Requires `Authorization: Bearer <access_token>`

### 6) Auth - Register
`POST /api/v1/auth/register`

### 7) Auth - Login
`POST /api/v1/auth/login`

### 8) Auth - Logout
`POST /api/v1/auth/logout`
- Requires `Authorization: Bearer <access_token>`

### 9) Auth - Current User
`GET /api/v1/auth/me`
- Requires `Authorization: Bearer <access_token>`

### 10) Billing Overview
`GET /api/v1/billing/overview`
- Returns available plans, current plan info, and daily usage counters.
- Requires `Authorization: Bearer <access_token>`

### 11) Change Subscription Plan
`POST /api/v1/billing/subscription`
- Payload: `{ "plan_code": "free" | "premium" }`
- Uses placeholder payment provider in MVP mode (no real charge flow).
- Requires `Authorization: Bearer <access_token>`

## Migrations
Alembic files are included for schema evolution.

```bash
cd backend
alembic upgrade head
```

## Auth Configuration
Set secure auth values in `.env`:
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`
- `AUTH_PASSWORD_MIN_LENGTH`

## Subscription Configuration
Subscription and usage settings in `.env`:
- `FREE_DAILY_UPLOAD_LIMIT`
- `PREMIUM_DAILY_UPLOAD_LIMIT`
- `FREE_PROCESSING_PRIORITY`
- `PREMIUM_PROCESSING_PRIORITY`
- `FREE_OCR_MODE`
- `PREMIUM_OCR_MODE`
- `PREMIUM_UPSCALE_MIN_SHORT_SIDE`
- `PREMIUM_MONTHLY_PRICE_USD`
- `PAYMENT_PROVIDER` (placeholder by default)

## Response Shape
Success example:
```json
{
  "success": true,
  "message": "Image uploaded successfully.",
  "data": { ... }
}
```

Error example:
```json
{
  "success": false,
  "message": "Validation failed.",
  "error": {
    "code": "validation_error",
    "details": [ ... ]
  }
}
```

## Notes
- OCR uses `pytesseract`. Install Tesseract system binary for best results.
- OCR service applies multiple preprocessing variants (CLAHE, adaptive thresholding, binary variants) and selects the best candidate.
- If OCR cannot extract reliable text, the API returns a graceful fallback message instead of failing the whole request.
- Queue abstraction is sync for MVP and can be replaced by Celery/RQ later.
- Real-ESRGAN remains optional and can be integrated via existing image processing modules.
