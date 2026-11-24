import { cookies } from "next/headers";
import { serverApi } from "../api/serverApi";
import {
  cacheUserData,
  getCachedUserData,
  invalidateUserCache,
} from "./userCache";

/**
 * Get mm_at access token from incoming cookies.
 * Returns null when no session exists (e.g. SSR for logged-out user).
 */
export async function getAccessToken() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("mm_at")?.value || null;
  } catch {
    return null;
  }
}

/**
 * Get access token or throw "Authentication required".
 */
export async function requireAccessToken() {
  const token = await getAccessToken();
  if (!token) throw new Error("Authentication required");
  return token;
}

/**
 * Verify the current session and return the user profile.
 * Uses the cached profile when available, otherwise fetches via serverApi.
 * @returns {object|null} user profile or null
 */
export async function verifyToken(token = null) {
  const accessToken = token || (await getAccessToken());
  if (!accessToken) return null;

  try {
    const cached = getCachedUserData(accessToken);
    if (cached) return cached;

    const data = await serverApi.get("/users/profile");
    const user = data?.user || data || null;
    if (user) cacheUserData(accessToken, user);
    return user;
  } catch {
    return null;
  }
}

/**
 * Set a MealMate rate-limit cookie so the client can surface a retry-after UI.
 * Only settable from Server Actions / Route Handlers (cookies() writable).
 */
function setRateLimitCookie(retryAfter, payload) {
  try {
    const cookieStore = cookies();
    cookieStore.set("mealmate_rate_limit", JSON.stringify(payload), {
      path: "/",
      maxAge: retryAfter,
      sameSite: "lax",
    });
  } catch {
    // cookies() may be read-only during some SSR contexts
  }
}

/**
 * Higher-order authenticated server action wrapper.
 * Usage: export const myAction = withAuth(async (token, user) => { ... });
 *
 * Returns { ok: true, data } or { ok: false, error } so status survives
 * Next.js server-action serialization.
 */
export async function withAuth(action, options = {}) {
  const { redirectTo = "/login", handleError = true, bypassCache = false } = options;

  try {
    const token = await requireAccessToken();

    let user = null;
    if (!bypassCache) {
      user = getCachedUserData(token);
    }
    if (!user) {
      user = await verifyToken(token);
      if (!user) throw new Error("Authentication required");
    }

    const result = await action(token, user);
    return { ok: true, data: result };
  } catch (error) {
    console.error(error);

    if (error.message === "Authentication required") {
      return { ok: false, error: "Authentication required", redirectTo };
    }

    if (error.status === 429 || error.statusCode === 429) {
      const retryAfter = error.retryAfter ?? null;
      setRateLimitCookie(retryAfter, {
        status: 429,
        statusText: error.statusText || "Too Many Requests",
        data: error.data || { message: error.message || "Too many requests, please try again later" },
        endpoint: error.endpoint,
        method: error.method,
        retryAfter,
        timestamp: Date.now(),
      });
      return {
        ok: false,
        status: 429,
        statusCode: 429,
        statusText: error.statusText || "Too Many Requests",
        data: error.data || { message: error.message || "Too many requests, please try again later" },
        error: error.message || "Too many requests, please try again later",
        message: error.message || "Too many requests, please try again later",
        validationMessages: error.validationMessages || [],
        validationDetails: error.validationDetails || null,
        endpoint: error.endpoint,
        method: error.method,
        retryAfter: retryAfter ?? null,
      };
    }

    if (handleError) {
      return {
        ok: false,
        status: error.status || null,
        statusCode: error.status,
        statusText: error.statusText,
        data: error.data,
        error: error.message || "Authentication failed",
        message: error.message || "Authentication failed",
        validationMessages: error.validationMessages || [],
      };
    }

    throw error;
  }
}

/**
 * Invalidate the auth cache (use on logout).
 */
export async function invalidateAuthCache() {
  const token = await getAccessToken();
  if (token) invalidateUserCache(token);
}

/**
 * Wrapper for actions that may run with or without auth.
 * @param {Function} action - (token: string | null) => Promise<any>
 */
export async function withOptionalAuth(action) {
  try {
    const token = await getAccessToken();
    return await action(token);
  } catch (error) {
    console.error("Optional auth error:", error);
    return { ok: false, error: error.message };
  }
}
