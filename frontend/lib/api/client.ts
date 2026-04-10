/**
 * Brauzer uchun default: Next.js `rewrites` orqali 8000-portdagi FastAPI ga proxylanadi.
 * To'g'ridan-to'g'ri 8000 ga urinish: .env da `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`
 */
export function getEffectiveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!configured) {
    return "http://localhost:3000/api/v1";
  }
  if (configured.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${configured}`;
    }
    return `http://127.0.0.1:3000${configured}`;
  }
  return configured;
}

/** Eski importlar uchun; imkon qadar `getEffectiveApiBaseUrl()` ishlating. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000/api/v1";

export const UPLOAD_ENDPOINT =
  process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT?.trim() || "/images/upload";

export const RESULT_ENDPOINT_TEMPLATE =
  process.env.NEXT_PUBLIC_RESULT_ENDPOINT?.trim() || "/images/{image_id}/result";

export const HISTORY_ENDPOINT =
  process.env.NEXT_PUBLIC_HISTORY_ENDPOINT?.trim() || "/images/history";

export const HISTORY_DELETE_ENDPOINT_TEMPLATE =
  process.env.NEXT_PUBLIC_HISTORY_DELETE_ENDPOINT?.trim() || "/images/history/{image_id}";

export const AUTH_REGISTER_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTH_REGISTER_ENDPOINT?.trim() || "/auth/register";

export const AUTH_LOGIN_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_ENDPOINT?.trim() || "/auth/login";

export const AUTH_LOGOUT_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTH_LOGOUT_ENDPOINT?.trim() || "/auth/logout";

export const AUTH_ME_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTH_ME_ENDPOINT?.trim() || "/auth/me";

export const BILLING_OVERVIEW_ENDPOINT =
  process.env.NEXT_PUBLIC_BILLING_OVERVIEW_ENDPOINT?.trim() || "/billing/overview";

export const BILLING_SUBSCRIPTION_ENDPOINT =
  process.env.NEXT_PUBLIC_BILLING_SUBSCRIPTION_ENDPOINT?.trim() || "/billing/subscription";

// Backward-compatible legacy endpoint constant.
export const ENHANCE_ENDPOINT =
  process.env.NEXT_PUBLIC_ENHANCE_ENDPOINT?.trim() || "/images/enhance";

export class ApiRequestError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status;
    this.details = options?.details;
  }
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getEffectiveApiBaseUrl().replace(/\/+$/, "");
  const normalized = path.replace(/^\/+/, "");

  return `${base}/${normalized}`;
}

export function getBackendOrigin(): string {
  try {
    return new URL(getEffectiveApiBaseUrl()).origin;
  } catch {
    return "";
  }
}

/** Turn API-relative paths like `/storage/...` into absolute backend URLs for fetch/img. */
export function resolveBackendPublicUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null) {
    return null;
  }
  const s = pathOrUrl.trim();
  if (!s) {
    return null;
  }
  if (/^https?:\/\//i.test(s) || s.startsWith("blob:") || s.startsWith("data:")) {
    return s;
  }
  const origin = getBackendOrigin();
  const path = s.startsWith("/") ? s : `/${s.replace(/^\/+/, "")}`;
  return origin ? `${origin}${path}` : path;
}

export async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** FastAPI `HTTPException` (`detail`) va boshqa JSON xatolardan matn olish. */
export function extractApiErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const r = payload as Record<string, unknown>;
  if (typeof r.message === "string" && r.message.trim()) {
    return r.message.trim();
  }
  const d = r.detail;
  if (typeof d === "string" && d.trim()) {
    return d.trim();
  }
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0];
    if (first && typeof first === "object" && "msg" in first && typeof (first as { msg: unknown }).msg === "string") {
      return String((first as { msg: string }).msg).trim();
    }
  }
  return null;
}

/**
 * Katta fayl yuklash: Next.js rewrite orqali emas, to'g'ridan-to'g'ri FastAPI (localhost:8000).
 * Boshqa muhit: .env da NEXT_PUBLIC_LARGE_UPLOAD_API_BASE_URL
 */
export function buildLargeUploadApiUrl(path: string): string {
  const raw =
    process.env.NEXT_PUBLIC_LARGE_UPLOAD_API_BASE_URL?.trim() || "http://127.0.0.1:8000/api/v1";
  const base = raw.replace(/\/+$/, "");
  const normalized = path.replace(/^\/+/, "");
  return `${base}/${normalized}`;
}
