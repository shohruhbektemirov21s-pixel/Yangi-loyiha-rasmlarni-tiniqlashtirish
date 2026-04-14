/** Kirish/ro'yxatdan keyin yo'naltirish (turlab keladigan query nomlari). */
const AUTH_FORM_PATHS = new Set(["/login", "/log-in", "/signup", "/sign-up", "/register"]);

function pathOnlyLower(raw: string): string {
  const noHash = raw.split("#")[0] ?? raw;
  const noQuery = noHash.split("?")[0] ?? noHash;
  let p = noQuery.trim();
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p.toLowerCase();
}

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  return true;
}

export function resolvePostAuthPath(searchParams: { get: (key: string) => string | null }): string {
  const keys = ["next", "callbackUrl", "from", "redirect", "returnTo"] as const;
  for (const key of keys) {
    const raw = searchParams.get(key);
    if (!raw?.trim()) continue;
    let path = raw.trim();
    try {
      path = decodeURIComponent(path);
    } catch {
      // qolda ishlatamiz
    }
    if (!isSafeInternalPath(path)) continue;
    const base = pathOnlyLower(path);
    if (AUTH_FORM_PATHS.has(base)) continue;
    return path;
  }
  return "/";
}

/** Sessiya tayyor bo'lgach — to'liq sahifa yangilanishi uchun (login forma "ilashib" qolmasin). */
export function finalizePostAuthRedirect(path: string): void {
  if (typeof window === "undefined") return;
  let target = path.startsWith("/") ? path : "/";
  const base = pathOnlyLower(target.split("?")[0] ?? target);
  if (AUTH_FORM_PATHS.has(base)) target = "/";
  window.location.assign(target);
}
