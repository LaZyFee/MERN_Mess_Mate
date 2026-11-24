/**
 * Layer 1 — Server Actions: platform control plane (hidden admin).
 * Every helper returns `null` on 404/403 so hidden routes can call notFound().
 */
import { serverApi } from "@/lib/api/serverApi";

async function optionalGet(path, params) {
  try {
    const data = await serverApi.get(path, params ? { params } : undefined);
    return data || null;
  } catch (error) {
    if (error?.status === 401) throw error;
    return null;
  }
}

export const getAdminOverview = () => optionalGet("/admin/overview");
export const getAdminSupportTicket = (ticketId) => optionalGet(`/admin/support/tickets/${ticketId}`);
export const getAdminUsers = (q = "") => optionalGet("/admin/users", { q });
export const getAdminGroups = (q = "") => optionalGet("/admin/groups", { q });
export const getAdminAudit = () => optionalGet("/admin/audit");

export async function isPlatformAdmin() {
  return (await getAdminOverview()) !== null;
}

export async function getAdminSupportStats() {
  return (await optionalGet("/admin/support/stats")) || null;
}
