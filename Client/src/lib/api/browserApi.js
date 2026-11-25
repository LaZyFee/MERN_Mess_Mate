"use client";
/* global process */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/bff";

/**
 * Browser-side fetch client. Only ever talks to same-origin /api/bff.
 * Tokens ride HttpOnly cookies (mm_at / mm_rt) set by the backend via the BFF
 * — never readable/writable by JS. credentials: "include" sends them automatically.
 * 401 → single-flight refresh → retry. Failure → redirect to /login.
 */

/* ---------- cookie helpers (readable cookies only) ---------- */

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/* ---------- auth events ---------- */
function dispatchTokenExpiredEvent(
  message = "Your session has expired. Please log in again.",
) {
  if (typeof window === "undefined" || !window.CustomEvent) return;
  try {
    window.dispatchEvent(
      new CustomEvent("mealmate:auth-token-expired", {
        detail: { message },
      }),
    );
  } catch (error) {
    console.warn("Failed to dispatch auth token expired event", error);
  }
}

export function dispatchRateLimitEvent(detail) {
  if (typeof window === "undefined" || !window.CustomEvent) return;
  try {
    window.dispatchEvent(
      new CustomEvent("mealmate:rate-limit-exceeded", {
        detail,
      }),
    );
  } catch (error) {
    console.warn("Failed to dispatch rate limit event", error);
  }
}

export function isRateLimitResponse(res) {
  if (!res) return false;
  const dataMessage = res.data?.message;
  const message = res.message;
  return (
    res.status === 429 ||
    res.statusCode === 429 ||
    res.statusText === "Too Many Requests" ||
    (typeof dataMessage === "string" &&
      dataMessage.toLowerCase().includes("too many requests")) ||
    (typeof message === "string" &&
      message.toLowerCase().includes("too many requests"))
  );
}

/* ---------- token store ---------- */
// mm_at / mm_rt are HttpOnly: document.cookie cannot read them on the client,
// but credentials: "include" sends them automatically. Readable cookies
// (mm_csrf, mm_theme) still work through getCookie/deleteCookie.
export const tokenStore = {
  getAccess() {
    if (typeof window === "undefined") {
      return getCookie("mm_at") || null;
    }
    return getCookie("mm_at") || null;
  },
  getRefresh() {
    if (typeof window === "undefined") {
      return getCookie("mm_rt") || null;
    }
    return getCookie("mm_rt") || null;
  },
  setTokens() {
    // Tokens are managed server-side via HttpOnly cookies.
    // Client-side document.cookie writing is disabled for security (anti-XSS).
  },
  clear() {
    if (typeof window === "undefined") return;
    deleteCookie("mm_at");
    deleteCookie("mm_rt");
    deleteCookie("mm_csrf");
    deleteCookie("mm_theme");
    deleteCookie("auth-token");
    deleteCookie("user-role");
    deleteCookie("user-roles");
    deleteCookie("pending-verification-email");
    deleteCookie("session_expired");

  },
};

function getCsrfToken() {
  // mm_csrf is intentionally readable (double-submit)
  const match = document.cookie.match(/(?:^|;\s*)mm_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

let redirecting = false;

function failAndLogout() {
  if (redirecting) return;
  redirecting = true;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
}

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this._refreshing = null;
  }

  async request(endpoint, options = {}) {
    const {
      method = "GET",
      body = null,
      headers = {},
      isFormData = false,
    } = options;

    const token = tokenStore.getAccess();

    const config = {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      credentials: "include",
      cache: options.cache || "no-store",
    };

    const csrf = getCsrfToken();
    if (csrf) config.headers["x-csrf-token"] = csrf;
    config.headers["X-Client"] = "web";

    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${this.baseURL}${endpoint}`, config);
    } catch (error) {
      throw {
        status: 500,
        message: error.message || "Network error",
        data: {},
      };
    }

    let data;
    if (response.status === 204) {
      data = null;
    } else {
      try {
        data = await response.json();
      } catch {
        data = null;
        if (response.ok) {
          throw {
            status: response.status,
            code: "INVALID_RESPONSE",
            message: "Invalid JSON response",
            data: null,
          };
        }
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await this._refreshToken();
        if (refreshed) return this.request(endpoint, options);

        tokenStore.clear();
        const message =
          data?.message || "Your session has expired. Please log in again.";
        dispatchTokenExpiredEvent(message);
        failAndLogout();

        const error = {
          status: response.status,
          code: "TOKEN_EXPIRED",
          message,
          data,
          expired: true,
        };
        console.error(`❌ API Error [${response.status}]:`, error);
        throw error;
      }

      if (response.status === 429) {
        const rawRetry =
          response.headers.get("Retry-After") ??
          data?.retryAfter ??
          data?.retry_after ??
          null;
        const retryAfterParsed = rawRetry != null ? parseInt(rawRetry, 10) : null;
        let retryAfter = null;
        if (!isNaN(retryAfterParsed) && retryAfterParsed > 0) {
          if (retryAfterParsed > 1e11) {
            const targetTime =
              retryAfterParsed > 1e11 ? retryAfterParsed : retryAfterParsed * 1000;
            retryAfter = Math.max(
              1,
              Math.ceil((targetTime - Date.now()) / 1000),
            );
          } else if (retryAfterParsed >= 1000) {
            retryAfter = Math.ceil(retryAfterParsed / 1000);
          } else {
            retryAfter = retryAfterParsed;
          }
        }

        dispatchRateLimitEvent({
          status: 429,
          statusText: response.statusText || "Too Many Requests",
          data: data || { message: "Too many requests, please try again later" },
          endpoint,
          retryAfter,
        });

        const error = {
          status: 429,
          statusText: response.statusText || "Too Many Requests",
          message:
            data?.message || "Too many requests, please try again later",
          data: data || { message: "Too many requests, please try again later" },
          retryAfter,
        };
        console.error("❌ API Error [429]:", error);
        throw error;
      }

      const error = {
        status: response.status,
        message: data?.message || "Request failed",
        data,
      };
      console.error(`❌ API Error [${response.status}]:`, error);
      throw error;
    }

    return data;
  }

  async _refreshToken() {
    if (this._refreshing) return this._refreshing;

    this._refreshing = (async () => {
      try {
        const refreshToken = tokenStore.getRefresh();
        if (!refreshToken) {
          tokenStore.clear();
          return false;
        }

        const response = await fetch(`${this.baseURL}/users/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.accessToken) {
          tokenStore.setTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
          return true;
        }

        tokenStore.clear();
        return false;
      } catch {
        tokenStore.clear();
        return false;
      } finally {
        this._refreshing = null;
      }
    })();

    return this._refreshing;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: "PATCH", body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

const apiClient = new APIClient();
export default apiClient;

/** Random idempotency key for financial mutations (re-exported by lib/utils/format.js) */
export function idempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function withIdempotency(config = {}) {
  return {
    ...config,
    headers: { ...(config.headers || {}), "Idempotency-Key": idempotencyKey() },
  };
}
