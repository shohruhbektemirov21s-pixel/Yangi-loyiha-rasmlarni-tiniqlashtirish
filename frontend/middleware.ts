import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_KEY = "imageclear_auth";

function requiresAuth(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) {
    return true;
  }
  if (pathname === "/compress" || pathname.startsWith("/compress/")) {
    return true;
  }
  if (pathname === "/video-enhance" || pathname.startsWith("/video-enhance/")) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  const hasAuthCookie = Boolean(request.cookies.get(AUTH_COOKIE_KEY)?.value);
  if (!hasAuthCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const returnTo = `${pathname}${search}`;
    loginUrl.searchParams.set("next", returnTo);
    loginUrl.searchParams.set("callbackUrl", returnTo);
    loginUrl.searchParams.set("from", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/compress", "/compress/:path*", "/video-enhance", "/video-enhance/:path*"],
};
