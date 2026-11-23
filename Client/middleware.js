import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/groups", "/profile", "/inbox", "/support/my", "/admin"];
const PUBLIC_AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/** Edge middleware: cheap cookie gate + security headers. Never trusts it for authorisation. */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("mm_at") || request.cookies.has("mm_rt");

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAuthPage = PUBLIC_AUTH_PAGES.includes(pathname);

  let response;
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    response = NextResponse.redirect(url);
  } else if (isAuthPage && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: res.cloudinary.com",
    "connect-src 'self' wss: ws: http://localhost:5000",
    "font-src 'self' data:",
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
