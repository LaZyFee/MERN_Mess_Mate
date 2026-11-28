import { NextResponse } from "next/server";
/* global process */

const PROTECTED_PREFIXES = ["/groups", "/profile", "/inbox", "/support/my", "/admin"];
const PUBLIC_AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

// Socket.IO origin(s) for connect-src (server-side env only, never NEXT_PUBLIC_*).
const SOCKET_ORIGINS = (process.env.SOCKET_ORIGIN || process.env.BACKEND_URL || "http://localhost:5000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .join(" ");

/** Edge middleware: cheap cookie gate + security headers. Never trusts it for authorisation. */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  // Background does NOT set a readable access-token cookie — `mm_at` is correct.
  // The refresh cookie is named `refreshToken` (backend utils/tokens.js), NOT
  // `mm_rt`; checking `mm_rt` made this gate mis-read a valid session as absent.
  // Both are HttpOnly, so the middleware can only see their presence, never a value.
  const hasSession =
    request.cookies.has("mm_at") || request.cookies.has("refreshToken");

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAuthPage = PUBLIC_AUTH_PAGES.includes(pathname);

  let response;
  if (pathname === "/" && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    response = NextResponse.rewrite(url);
  } else if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    response = NextResponse.redirect(url);
  } else if (isAuthPage && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: res.cloudinary.com",
    "connect-src 'self' wss: ws: https://challenges.cloudflare.com",
    SOCKET_ORIGINS,
    "font-src 'self' data:",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!api/bff|_next/static|_next/image|favicon.ico).*)"],
};
