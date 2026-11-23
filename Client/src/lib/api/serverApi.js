import { cookies } from "next/headers";
/* global process */

const API_BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";
const BACKEND_API = `${API_BASE_URL}/api`;

// MealMate has no public unauthenticated GET endpoints — every API is
// group-scoped and requires the mm_at access cookie (§4 privacy model).
function isPublicEndpoint() {
  return false;
}

const responseCache = new Map();
const errorCache = new Map();
const inflight = new Map();
const CACHE_TTL = 30000;
const ERR_TTL = 10000;

function getCached(key, endpoint, cache) {
  if (!isPublicEndpoint(endpoint)) return null;
  const e = cache.get(key);
  if (!e) return null;
  if (e.expiry < Date.now()) { cache.delete(key); return null; }
  return e.data;
}
function setCached(key, data, endpoint, cache, ttl) {
  if (!isPublicEndpoint(endpoint)) return;
  cache.set(key, { data, expiry: Date.now() + ttl });
}
export function clearApiCaches() {
  responseCache.clear();
  errorCache.clear();
}
function reqKey(method, endpoint, body, token) {
  const bodyStr = body !== undefined && body !== null ? JSON.stringify(body) : "";
  return `${method}:${endpoint}:${token ? `:${token}` : ""}:${bodyStr}`;
}

function typedErr(status, data, msg) {
  const err = new Error(msg || "Request failed");
  err.status = status;
  err.data = data;
  if (status === 404) err.name = "NotFound";
  else if (status === 403) err.name = "Forbidden";
  else if (status === 401) err.name = "Unauthorized";
  return err;
}

let refreshing = null;
async function serverRefresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const jar = await cookies();
      const rt = jar ? jar.get("mm_rt")?.value || null : null;
      if (!rt) return false;
      const res = await fetch(`${API_BASE_URL}/api/users/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `mm_rt=${rt}` },
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      return res.ok && Boolean(d?.accessToken);
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function serverRequest(endpoint, options = {}) {
  const { method = "GET", body = null, headers = {}, isFormData = false, token, params } = options;
  if (method !== "GET") clearApiCaches();
  if (params && typeof params === "object") {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
    });
    const qs = sp.toString();
    if (qs) endpoint += (endpoint.includes("?") ? "&" : "?") + qs;
  }
  const publicEndpoint = isPublicEndpoint(endpoint);
  const jar = await cookies();
  const cookieHeader = jar ? jar.getAll().map(({ n, v }) => `${n}=${v}`).join("; ") : "";
  const mmAt = jar ? jar.get("mm_at")?.value || null : null;
  const auth = token || (!publicEndpoint ? mmAt : null);
  const h = {};
  if (auth) h.Authorization = `Bearer ${auth}`;
  if (cookieHeader) h.Cookie = cookieHeader;
  if (!isFormData && !headers["Content-Type"]) h["Content-Type"] = "application/json";
  Object.assign(h, headers);
  h["X-Client"] = "web";
  const config = { method, headers: h, cache: options.cache || (publicEndpoint ? undefined : "no-store") };
  if (options.next) config.next = options.next;
  if (typeof AbortSignal.timeout === "function") config.signal = AbortSignal.timeout(options.timeout || 25000);
  if (body) {
    if (isFormData && body instanceof FormData) config.body = body;
    else if (isFormData && typeof body === "object") {
      const fd = new FormData();
      Object.entries(body).forEach(([k, v]) => {
        if (v == null) return;
        if (Array.isArray(v)) v.forEach((it) => fd.append(k, it instanceof Blob ? it : String(it)));
        else if (typeof v === "object") fd.append(k, JSON.stringify(v));
        else fd.append(k, String(v));
      });
      config.body = fd;
    } else if (!isFormData && typeof body === "object") config.body = JSON.stringify(body);
    else config.body = body;
  }
  const key = reqKey(method, endpoint, body, auth);
  if (method === "GET") {
    const c = getCached(key, endpoint, responseCache);
    if (c !== null) return c;
    const ce = getCached(key, endpoint, errorCache);
    if (ce) throw ce;
  }
  if (method === "GET" && inflight.has(key)) return inflight.get(key);
  const promise = (async () => {
    const res = await fetch(`${BACKEND_API}${endpoint}`, config);
    const ct = res.headers.get("content-type");
    let data = {};
    if (ct && ct.includes("application/json")) {
      try { data = await res.json(); } catch {
        if (res.ok) { const err = new Error("Invalid JSON response"); err.status = 502; err.code = "INVALID_RESPONSE"; throw err; }
        data = { message: "Invalid JSON response" };
      }
    } else { try { data = { message: await res.text() }; } catch { data = {}; } }
    if (!res.ok) {
      let msg = "Request failed";
      if (data?.message && typeof data.message === "string") msg = data.message;
      else if (data?.error) msg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
      else if (Array.isArray(data?.errors)) msg = data.errors.map((x) => x?.message || x).join(", ");
      if (res.status === 429) msg = "Too many requests. Please try again later.";
      else if (res.status === 401) msg = "Unauthorized. Please log in again.";
      else if (res.status === 403) msg = "Forbidden request.";
      else if (res.status === 404) msg = "Resource not found.";
      else if (res.status === 500) msg = "Server error. Please try again later.";
      const err = typedErr(res.status, data, msg);
      err.endpoint = endpoint; err.method = method;
      if (res.status === 401) {
        const ok = await serverRefresh();
        if (ok) return serverRequest(endpoint, options);
        err.__sessionExpired = true;
      }
      if (method === "GET" && res.status === 429) {
        try { setCached(key, { message: msg, status: err.status, statusText: err.statusText, data: err.data, endpoint, method }, endpoint, errorCache, ERR_TTL); } catch { /* ignore cache failures */ }
      }
      throw err;
    }
    if (method === "GET") setCached(key, data, endpoint, responseCache, CACHE_TTL);
    return data;
  })();
  if (method === "GET") inflight.set(key, promise);
  promise.finally(() => { if (method === "GET") inflight.delete(key); }).catch(() => {});
  return promise;
}

const serverApiClient = {
  clearCache: clearApiCaches,
  get: (e, o) => serverRequest(e, { ...o, method: "GET" }),
  post: (e, b, o) => serverRequest(e, { ...o, method: "POST", body: b }),
  put: (e, b, o) => serverRequest(e, { ...o, method: "PUT", body: b }),
  patch: (e, b, o) => serverRequest(e, { ...o, method: "PATCH", body: b }),
  delete: (e, o) => serverRequest(e, { ...o, method: "DELETE" }),
};
export function createServerApi() { return { ...serverApiClient }; }
export const serverApi = createServerApi();
export default serverApiClient;
