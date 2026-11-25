/* global process */
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// Allowlist of backend route prefixes the browser may reach
const ALLOWED_PREFIXES = [
  "users",
  "sessions",
  "messgroups",
  "memberships",
  "meals",
  "expenses",
  "money",
  "policies",
  "periods",
  "statements",
  "recurring",
  "reconciliation",
  "disputes",
  "notifications",
  "attachments",
  "assets",
  "stats",
  "summary",
  "inbox",
  "support",
  "routines",
  "shopping-list",
  "kitchen-inventory",
  "polls",
  "invite",
  "admin",
];

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
]);

function filterRequestHeaders(headers) {
  const out = new Headers();
  for (const [key, value] of headers.entries()) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (
      [
        "cookie",
        "idempotency-key",
        "x-csrf-token",
        "authorization",
        "content-type",
        "accept",
      ].includes(key.toLowerCase())
    ) {
      out.set(key, value);
    }
  }
  out.set("X-Client", "web");
  return out;
}

// Optional defense-in-depth for the hidden admin plane: the backend only checks
// X-Admin-Key when ADMIN_PANEL_KEY is set, so the key is attached here (server
// env only — never NEXT_PUBLIC_*) and only for admin paths.
const ADMIN_PANEL_KEY = process.env.ADMIN_PANEL_KEY || "";

function withAdminKey(headers, isAdminPath) {
  if (isAdminPath && ADMIN_PANEL_KEY) headers.set("X-Admin-Key", ADMIN_PANEL_KEY);
  return headers;
}

function filterResponseHeaders(headers) {
  const out = new Headers();
  for (const [key, value] of headers.entries()) {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) continue;
    if (k === "set-cookie") {
      out.append("set-cookie", value);
      continue;
    }
    if (["content-type", "content-disposition", "cache-control"].includes(k)) {
      out.set(key, value);
    }
  }
  return out;
}

async function handler(request, { params }) {
  const { path } = await params;
  const segments = Array.isArray(path) ? path : [];
  const [first] = segments;
  if (!first || !ALLOWED_PREFIXES.includes(first)) {
    return NextResponse.json({ msg: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const target = `${BACKEND_URL}/api/${segments.join("/")}${url.search}`;
  const method = request.method;

  const body = ["GET", "HEAD"].includes(method)
    ? undefined
    : await request.arrayBuffer();

  const res = await fetch(target, {
    method,
    headers: withAdminKey(filterRequestHeaders(request.headers), first === "admin"),
    body,
    credentials: "include",
    redirect: "manual",
  });

  const headers = filterResponseHeaders(res.headers);

  if (res.headers.get("content-type")?.includes("application/json") || res.status === 204) {
    const data = await res.text();
    return new NextResponse(data, { status: res.status, headers });
  }
  // stream blobs (attachments, xlsx, pdf)
  return new NextResponse(res.body, { status: res.status, headers });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };