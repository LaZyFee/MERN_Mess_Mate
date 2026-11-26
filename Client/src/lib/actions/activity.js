import { serverApi } from "@/lib/api/serverApi";

/**
 * Layer 1 — server reads for the group activity (audit) feed.
 * Owner / manager / treasurer / auditor only; the backend answers 403 otherwise.
 */
export async function getGroupActivity(groupId, filters = {}) {
  const params = {};
  if (filters.action) params.action = filters.action;
  if (filters.limit) params.limit = filters.limit;
  const data = await serverApi.get(`/messgroups/audit-log/${groupId}`, { params });
  return data?.events || [];
}
