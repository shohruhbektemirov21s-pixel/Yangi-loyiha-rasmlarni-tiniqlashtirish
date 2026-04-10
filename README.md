# ImageClear AI

ImageClear AI is a full-stack web app for restoring blurry images and improving text readability.

## Stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- AI pipeline: OpenCV, Pillow, optional Real-ESRGAN integration, OCR via Tesseract
- Storage: local filesystem (MVP)
- Database: SQLite (MVP)
- Architecture: queue-ready (swap sync queue with background workers later)

## Project Structure
```
imageclear-ai/
├── frontend/
└── backend/
```

## Quick Start
### 1. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and upload an image.
Use `/signup` or `/login` before accessing the protected `/dashboard`.

## Notes
- OCR quality depends on Tesseract installation and image quality.
- Real-ESRGAN is optional by default (`REAL_ESRGAN_ENABLED=false`).
- Smart mode detection routes images into mode-specific enhancement strategies:
  - `photo`: denoise + detail balance
  - `screenshot`: UI/text clarity-focused sharpening
  - `document`: deskew + contrast/readability tuning
  - `text_heavy`: text edge/readability emphasis
- Processing history is available on `/dashboard` with preview cards and delete actions.
- Auth flow includes `/signup`, `/login`, and JWT-protected history/dashboard APIs.
- For production scaling, replace the sync queue backend with Celery/RQ and worker processes.
