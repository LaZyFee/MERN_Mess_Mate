/**
 * Layer 1 — Server Actions: hidden platform control plane.
 * Every helper returns `null` on 403/404 so hidden routes can call notFound()
 * without ever confirming that the admin plane exists.
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
export const getAdminTraffic = (days = 30) => optionalGet("/admin/traffic", { days });
export const getAdminUsers = (q = "") => optionalGet("/admin/users", { q });
export const getAdminGroups = (q = "") => optionalGet("/admin/groups", { q });
export const getAdminAudit = (limit = 50) => optionalGet("/admin/audit", { limit });
export const getAdminJobs = () => optionalGet("/admin/jobs");

export const getAdminSupportQueue = (filters = {}) =>
  optionalGet("/admin/support/tickets", filters);
export const getAdminSupportTicket = (ticketId) => optionalGet(`/admin/support/tickets/${ticketId}`);
export const getAdminSupportStats = () => optionalGet("/admin/support/stats");
export const getAdminCannedReplies = () => optionalGet("/admin/support/canned-replies");

/** Probing helper for the (admin) layout: true only when the backend answered. */
export async function isPlatformAdmin() {
  return (await getAdminOverview()) !== null;
}
