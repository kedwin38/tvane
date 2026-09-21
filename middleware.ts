import { NextResponse, type NextRequest } from "next/server";

// Lightweight edge-safe cookie presence check only — middleware runs on
// the Edge runtime and can't touch Postgres/node:crypto, so it can't
// fully verify a session here. It just gates on "is there a plausible
// session cookie at all" to keep unauthenticated traffic off protected
// pages cheaply; every route handler underneath still calls
// getCurrentUser()/getCurrentAdmin() (lib/auth/*-session.ts) for the
// real, DB-backed check before trusting the session or returning data.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/terminal")) {
    const hasSession = req.cookies.has("tv_session");
    if (!hasSession) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasAdminSession = req.cookies.has("tv_admin_session");
    if (!hasAdminSession) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/terminal/:path*", "/admin/:path*"],
};
