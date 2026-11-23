"use server";

import { serverApi } from "./serverApi";

/**
 * Generic server actions. Client components call these to route every API
 * read/mutation through the server (cookies handled by serverApi), keeping
 * direct browser network calls limited to same-origin /api/bff via browserApi
 * only where truly needed.
 *
 * Every action returns { ok, data, error } so HTTP status and typed errors
 * survive Next.js server-action serialization.
 */

export async function serverGet(endpoint, options = {}) {
  try {
    const data = await serverApi.get(endpoint, options);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: serializeError(error, endpoint) };
  }
}

export async function serverPost(endpoint, body, options = {}) {
  try {
    const data = await serverApi.post(endpoint, body, options);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: serializeError(error, endpoint) };
  }
}

export async function serverPut(endpoint, body, options = {}) {
  try {
    const data = await serverApi.put(endpoint, body, options);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: serializeError(error, endpoint) };
  }
}

export async function serverPatch(endpoint, body, options = {}) {
  try {
    const data = await serverApi.patch(endpoint, body, options);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: serializeError(error, endpoint) };
  }
}

export async function serverDelete(endpoint, options = {}) {
  try {
    const data = await serverApi.delete(endpoint, options);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: serializeError(error, endpoint) };
  }
}

export async function clearApiCache() {
  serverApi.clearCache();
  return { ok: true };
}

function serializeError(error, endpoint) {
  return {
    message: error.message,
    status: error.status,
    code: error.code,
    data: error.data,
    endpoint,
    method: error.method,
    sessionExpired: Boolean(error.__sessionExpired),
  };
}
