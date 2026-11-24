/**
 * Layer 1 — Server Actions: auth domain
 * Wraps serverApi calls. Called from Server Components / layouts only.
 * Returns plain serialisable objects. Throws typed errors (NotFound / Unauthorized).
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getProfile() {
  const data = await serverApi.get("/users/profile");
  return data?.user || data;
}

export async function getSessions() {
  const data = await serverApi.get("/sessions/users/sessions");
  return data?.sessions || data || [];
}

export async function verifyEmailToken(token) {
  return serverApi.get(`/users/verify-email/${token}`);
}
