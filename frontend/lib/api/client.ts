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
 * Katta multipart: to'g'ridan FastAPI (odatda :8000).
 * Agar env berilmasa, brauzer hostname'i ishlatiladi — localhost vs 127.0.0.1 CORS mosligi uchun.
 */
export function resolveLargeUploadApiBase(): string {
  const env = process.env.NEXT_PUBLIC_LARGE_UPLOAD_API_BASE_URL?.trim();
  if (env) {
    return env.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
}

export function buildLargeUploadApiUrl(path: string): string {
  const base = resolveLargeUploadApiBase();
  const normalized = path.replace(/^\/+/, "");
  return `${base}/${normalized}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type XhrJsonResult = { status: number; body: unknown };

/**
 * Katta fayl: yuklash progress va cheksiz kutish (brauzer default).
 * Katta video: XMLHttpRequest + upload progress; uzoq yuklashda fetch xatosi kamayishi mumkin.
 */
export function xhrPostFormDataWithProgress(
  url: string,
  formData: FormData,
  authHeaders: HeadersInit,
  onProgress?: (percent: number | null) => void
): Promise<XhrJsonResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    const h = authHeaders as Record<string, string>;
    if (h.Authorization) {
      xhr.setRequestHeader("Authorization", h.Authorization);
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress?.(Math.min(100, Math.round((100 * ev.loaded) / ev.total)));
      } else {
        onProgress?.(null);
      }
    };
    xhr.onload = () => {
      const text = xhr.responseText;
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = text;
        }
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("NETWORK"));
    xhr.ontimeout = () => reject(new Error("TIMEOUT"));
    xhr.timeout = 0;
    xhr.send(formData);
  });
}

export async function pollCompressJobUntilDone(
  jobId: string,
  accessToken: string | null,
  options?: { intervalMs?: number; maxAttempts?: number; isCancelled?: () => boolean }
): Promise<Record<string, unknown>> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 3600;
  const isCancelled = options?.isCancelled;

  for (let i = 0; i < maxAttempts; i++) {
    if (isCancelled?.()) {
      throw new Error("CANCELLED");
    }
    const r = await fetch(buildLargeUploadApiUrl(`compress/jobs/${jobId}`), {
      headers: bearerAuthHeaders(accessToken)
    });
    const body = (await parseJsonSafely(r)) as Record<string, unknown> | string | null;
    if (r.status === 401) {
      throw new Error("AUTH_401");
    }
    if (!r.ok) {
      throw new Error(extractApiErrorMessage(body) || `HTTP ${r.status}`);
    }
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>).data : null;
    const state = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    if (!state) {
      await sleep(intervalMs);
      continue;
    }
    const st = String(state.status || "");
    if (st === "done" && state.data && typeof state.data === "object") {
      return state.data as Record<string, unknown>;
    }
    if (st === "failed") {
      const err = typeof state.error === "string" ? state.error : "Compress failed";
      throw new Error(err);
    }
    await sleep(intervalMs);
  }
  throw new Error("POLL_TIMEOUT");
}

/** Bearer token for multipart uploads that hit FastAPI directly (not via Next rewrites). */
export function bearerAuthHeaders(accessToken: string | null | undefined): HeadersInit {
  if (!accessToken?.trim()) {
    return {};
  }
  return { Authorization: `Bearer ${accessToken.trim()}` };
}
