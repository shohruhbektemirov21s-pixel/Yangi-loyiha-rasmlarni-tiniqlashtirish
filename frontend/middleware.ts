import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_KEY = "imageclear_auth";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const hasAuthCookie = Boolean(request.cookies.get(AUTH_COOKIE_KEY)?.value);
    if (!hasAuthCookie) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
