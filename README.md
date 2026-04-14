# ImageClear AI — loyiha va kod haqida

Ushbu fayl loyiha **maqsadi**, **texnologiyalar**, **papka tuzilishi** va **asosiy kod qismlarining vazifasi**ni bitta joyda jamlaydi.

---

## 1. Loyiha nima qiladi?

**ImageClear AI** — xira rasmlar va videolarni tiniqlashtirish, matnni o‘qilishini yaxshilash (OCR), katta fayllarni **kompressiya** qilish uchun to‘liq stek veb-ilova.

| Yo‘nalish | Qisqacha |
|-----------|----------|
| **Bosh sahifa** | Marketing bloklar, til (UZ/RU/EN), havolalar |
| **Kompressiya** | Video (FFmpeg, fon vazifasi), rasm (WebP), boshqa fayllar (ZIP). Katta yuklash: sozlamada **~20 GiB** gacha |
| **Rasm / video tiniqlashtirish** | Rasm: FastAPI pipeline (OpenCV/Pillow). Video: FFmpeg. Bearer token |
| **Rasm yuklash + tarix** | `/dashboard`, job API, natija sahifasi |
| **Auth** | Ro‘yxatdan o‘tish, kirish, JWT, cookie + localStorage |
| **Tariflar** | Billing API (placeholder) |

---

## 2. Texnologik stack

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **framer-motion** |
| Backend | **FastAPI**, **Python 3**, **Pydantic**, **SQLAlchemy**, **Alembic** |
| Tasvir | **OpenCV**, **Pillow**, ixtiyoriy **Real-ESRGAN** |
| Matn | **Tesseract** (OCR) |
| Video | **FFmpeg** (shell orqali chaqiruv) |
| Ma’lumotlar bazasi | **SQLite** (MVP) |
| Saqlash | Mahalliy `storage/` papkasi |

---

## 3. Loyiha tuzilishi

```
yangi loyiha/
├── README.md                 ← ushbu hujjat
├── frontend/                 ← Next.js ilovasi (port 3000)
│   ├── app/                  ← marshrutlar (App Router)
│   ├── components/           ← UI komponentlar
│   ├── hooks/                ← React hooklar, tarjimalar
│   ├── lib/                  ← API client, auth session, yordamchilar
│   ├── middleware.ts         ← cookie bo‘yicha himoyalangan sahifalar
│   └── public/
├── backend/                  ← FastAPI (port 8000)
│   ├── app/
│   │   ├── api/              ← REST marshrutlar
│   │   ├── core/             ← sozlamalar, xatolar
│   │   ├── models/           ← ORM modellari
│   │   ├── services/         ← biznes mantiq
│   │   └── main.py           ← ilova kirish nuqtasi
│   ├── alembic/              ← migratsiyalar
│   └── requirements.txt
└── django_reference_pipeline/ ← **faqat ma’lumot/referens**, asosiy ish oqimi emas
```

---

## 4. Frontend — sahifalar va vazifalari

| Fayl / yo‘l | Nima ish qiladi |
|-------------|-----------------|
| `app/layout.tsx` | Global `globals.css`, shriftlar, `AuthProvider`, `ToastProvider`, `AppHeader` |
| `app/page.tsx` | Bosh sahifa: `HeroSection`, `CompressPromoSection`, `AboutSection` |
| `app/login/page.tsx` | Kirish formasi, `finalizePostAuthRedirect`, `next` / `callbackUrl` / `from` |
| `app/signup/page.tsx` | Ro‘yxatdan o‘tish |
| `app/log-in/page.tsx` | `/log-in` → `/login` ga query bilan yo‘naltirish |
| `app/compress/page.tsx` | Fayl yuklash, XHR progress, video 202 + poll, bekor qilish, natija |
| `app/video-enhance/page.tsx` | Rasm yoki video yuklash, `/image_enhance` yoki `/video_enhance` |
| `app/dashboard/page.tsx` | Foydalanuvchi tarixi |
| `app/result/[imageId]/page.tsx` | Bitta job natijasi |
| `app/pricing/page.tsx` | Tariflar ko‘rinishi |
| `middleware.ts` | `/dashboard`, `/compress`, `/video-enhance` uchun `imageclear_auth` cookie tekshiruvi |
| `components/auth/AuthProvider.tsx` | JWT + foydalanuvchi holati, `localStorage` sessiya, cookie sinxron |
| `components/layout/AppHeader.tsx` | Navigatsiya, til, kirish/chiqish |
| `lib/api/client.ts` | `getEffectiveApiBaseUrl`, `xhrPostFormDataWithProgress`, `pollCompressJobUntilDone`, `buildLargeUploadApiUrl` (:8000 to‘g‘ridan-to‘g‘ri) |
| `lib/auth/session.ts` | Token va foydalanuvchini saqlash / tozalash |
| `lib/navigation/postAuthRedirect.ts` | Kirishdan keyin yo‘l: `next`, `callbackUrl`, `from`, … |
| `hooks/useTranslation.ts` | UZ / RU / EN matnlar |

**Muhim:** katta fayl kompress/tiniqlash odatda **Next emas**, brauzer **8000** dagi FastAPI ga `NEXT_PUBLIC_LARGE_UPLOAD_API_BASE_URL` orqali ulanadi (CORS).

---

## 5. Backend — API va vazifalari

Barcha API **prefix**: `/api/v1` (`backend/app/api/v1/router.py`).

| Prefix | Fayl | Vazifa |
|--------|------|--------|
| `/health` | `endpoints/health.py` | Servis jonli |
| `/auth` | `endpoints/auth.py` | Register, login, logout, JWT |
| `/billing` | `endpoints/billing.py` | Tariflar, foydalanish (MVP) |
| `/images` | `endpoints/images.py` | Rasm yuklash, tarix, natija |
| `/compress` | `endpoints/compress.py` | Kompress: video (fon job), rasm WebP, boshqa ZIP; allaqachon siqilgan formatlar (`tar.gz` va hokazo) uchun `compression_skipped` |
| `/video_enhance` | `endpoints/video_enhance.py` | Video FFmpeg filtrlari |
| `/image_enhance` | `endpoints/image_enhance.py` | Rasm pipeline + OCR |
| `/admin` | `endpoints/admin.py` | Admin email allowlist bilan |

**Asosiy servislar** (`app/services/`):

| Modul | Vazifa |
|-------|--------|
| `image_processing/pipeline.py` | CLAHE, denoise, unsharp, readability, ton, **upscale** (kichik rasm), post-upscale sharpen |
| `image_processing/profiles.py` | `photo`, `screenshot`, `document`, `text_heavy` rejimini aniqlash |
| `image_processing/service.py` | Yuklangan rasmni pipeline dan o‘tkazib, chiqish faylini yozish |
| `processing_service.py` | Rasm tiniqlash + OCR ni birlashtirish |
| `ffmpeg_media.py` | Video siqish / tiniqlashtirish (tashqi `ffmpeg`) |
| `compress_jobs.py` | Video kompress uchun xotirada job holati + fon thread |
| `auth_service.py` | Parol hash, JWT chiqarish |
| `image_job_service.py` | Rasm joblari, navbat (sync), billing bilan bog‘lash |
| `ocr/` | Tesseract orqali matn ajratish |

**Sozlamalar:** `app/core/config.py` — `compress_max_upload_mb` (default **20×1024** MiB ≈ 20 GiB), `storage_root`, JWT, OCR va hokazo.

---

## 6. Ma’lumotlar oqimi (qisqa)

1. **Ro‘yxatdan o‘tish / kirish:** frontend `POST /api/v1/auth/...`, javobda JWT; `localStorage` + cookie (`imageclear_auth`) — middleware cookie kutadi.
2. **Kompress (video):** `POST /compress` → **202** + `job_id` → frontend `GET /compress/jobs/{id}` poll qiladi.
3. **Kompress (rasm / hujjat):** bir martalik `POST`, JSON da `compressed_url`, `original_size`, `compressed_size`.
4. **Rasm tiniqlashtirish (sahifa):** `POST` to‘g‘ridan-to‘g‘ri `:8000/api/v1/image_enhance` (Bearer).

---

## 7. `django_reference_pipeline` papkasi

Bu **Django** loyihasining qolgan/referens kodi; asosiy ishlaydigan ilova **frontend + backend** papkalarida. Yangi funksiyani shu yerga emas, **FastAPI / Next** ga qo‘shing.

---

## 8. Ishga tushirish

### Backend (8000)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (3000)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Brauzer: **http://localhost:3000**  
API dokumentatsiya: **http://localhost:8000/api/v1/docs**

---

## 9. Muhim muhit o‘zgaruvchilari

| Joy | O‘zgaruvchi | Ma’nosi |
|-----|-------------|---------|
| Backend `.env` | `COMPRESS_MAX_UPLOAD_MB` | Kompress/video yuklash limiti (MB, 1024²). Default ≈ 20 GiB |
| Frontend `.env.local` | `NEXT_PUBLIC_API_BASE_URL` | API (odatda Next orqali `/api/v1`) |
| Frontend | `NEXT_PUBLIC_LARGE_UPLOAD_API_BASE_URL` | Katta multipart uchun to‘g‘ridan-to‘g‘ri `http://localhost:8000/api/v1` |
| Frontend | `NEXT_PUBLIC_SITE_URL` | Ixtiyoriy; noto‘g‘ri bo‘lsa metadata uchun muammo bo‘lmasligi uchun faqat to‘g‘ri URL qo‘ying yoki bo‘sh qoldiring |
| Backend | `ADMIN_EMAILS` | Admin API uchun ruxsat berilgan emaillar |

---

## 10. Dizayn / CSS muammolari bo‘lsa

- `frontend` ichida: `rm -rf .next` keyin `npm run dev`
- **3000-portda boshqa loyiha** ishlamasin (`lsof -i :3000`)
- `globals.css` — Tailwind `@tailwind` + oddiy `body` stillari; `.page-noise` uchun `theme()` ishlatilmaydi (barqarorlik)

---

## 11. Keyingi rivojlantirish g‘oyalari (ixtiyoriy)

- Fon navbat: Celery / RQ
- Real-ESRGAN: `REAL_ESRGAN_ENABLED` va model yo‘li
- Production: PostgreSQL, S3, nginx `client_max_body_size`

---

*Oxirgi yangilanish: README loyiha bo‘yicha batafsil qo‘llanma sifatida to‘ldirildi.*
