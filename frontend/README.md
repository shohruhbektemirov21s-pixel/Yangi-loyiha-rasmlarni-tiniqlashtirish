# ImageClear AI - Frontend

This is the Next.js frontend for the ImageClear AI application. Designed with modern web standards, it connects seamlessly to the FastAPI backend to offer a robust SaaS MVP for image enhancement and upscale operations.

## Features

- **Modern Stack:** Built on Next.js, React, and Tailwind CSS.
- **Authentication:** Session-based authentication with comprehensive route guards.
- **Image Processing UI:** Drag-and-drop file inputs, real-time progress indicators, and an interactive before/after result viewer.
- **Dashboard:** Unified dashboard to review account quotas and previous image jobs.
- **Responsive Design:** Optimized for mobile, tablet, and desktop interfaces.

## Environment Variables

Copy the `.env.example` file to `.env.local` to configure your environment variables:

```bash
cp .env.example .env.local
```

Key Variables:
- `NEXT_PUBLIC_API_BASE_URL`: Base URL for the imageclear API (e.g. `http://localhost:8000/api/v1`).

## Setup & Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   The site will be available at [http://localhost:3000](http://localhost:3000).

3. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Best Practices
- **Components:** Isolated React components in `/components`.
- **Hooks:** Reusable API wrappers and utilities in `/hooks`.
- **API Client:** Shared API client logic with robust error handling in `/lib/api/client.ts`.

## Deployment
Recommended deployment platforms include **Vercel** or any typical Node.js hosting. Make sure to define the relevant environment variables in the project settings of your Vercel dashboard.
