import { AuthSession } from "@/lib/api/auth";

const SESSION_STORAGE_KEY = "imageclear.auth.session";
const AUTH_COOKIE_KEY = "imageclear_auth";

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  setAuthCookie(true, session.expiresIn);
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  setAuthCookie(false);
}

function setAuthCookie(enabled: boolean, expiresInSec?: number): void {
  if (typeof document === "undefined") {
    return;
  }

  if (!enabled) {
    document.cookie = `${AUTH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  const maxAge = Math.max(Math.min(expiresInSec ?? 0, 60 * 60 * 24 * 30), 60);
  document.cookie = `${AUTH_COOKIE_KEY}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
