"use client";
/* global process */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/bff";

/**
 * Browser-side fetch client. Only ever talks to same-origin /api/bff.
 * Tokens ride HttpOnly cookies set by the backend through the BFF:
 *   mm_at        (access, Path=/)        — never readable by JS
 *   refreshToken (refresh, Path=/api)    — never readable by JS
 * `credentials: "include"` sends them automatically.
 * 401 → single-flight POST /users/refresh → retry once. Failure → /login.
 */

/* ---------- cookie helpers (readable cookies only) ---------- */

// Only used for mm_csrf (double-submit) and mm_theme — see getCsrfToken below.

function getCookie(name) { // eslint-disable-line no-unused-vars -- kept for mm_csrf/mm_theme readers
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
// `mm_at` and `refreshToken` are HttpOnly — `document.cookie` can NEVER read them.
// They are sent automatically because every request uses credentials: "include".
// The store below is therefore deliberately empty for tokens; only the readable
// `mm_csrf` / `mm_theme` cookies are accessible from JS. Do not "fix" this by
// writing tokens into readable cookies or localStorage — that reopens XSS theft.
export const tokenStore = {
  getAccess() {
    return null; // HttpOnly: not readable by design
  },
  getRefresh() {
    return null; // HttpOnly: not readable by design
  },
  setTokens() {
    // Tokens are managed server-side via HttpOnly cookies.
    // Client-side document.cookie writing is disabled for security (anti-XSS).
  },
  clear() {
    if (typeof window === "undefined") return;
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

    const config = {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

      // 410 Gone — a legacy endpoint passed its sunset date (D4). Surface it once
      // per session so the user is steered to the V2 flow instead of retrying.
      if (response.status === 410) {
        const error = {
          status: 410,
          code: "LEGACY_RETIRED",
          message: data?.msg || "This older feature has been retired. Use the new workflow instead.",
          data,
        };
        if (typeof window !== "undefined" && !window.__mmLegacy410Shown) {
          window.__mmLegacy410Shown = true;
          window.dispatchEvent(new CustomEvent("mealmate:legacy-retired", { detail: error }));
        }
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
        // The refresh token lives in an HttpOnly cookie scoped to /api, so it is
        // sent automatically. We cannot (and must not) read it from JS.
        const response = await fetch(`${this.baseURL}/users/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Client": "web" },
          credentials: "include",
        });

        // Success = new HttpOnly cookies were set by the backend via the BFF.
        if (response.ok) return true;

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
