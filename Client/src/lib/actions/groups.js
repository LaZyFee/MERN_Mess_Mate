/**
 * Layer 1 — Server Actions: groups domain
 * Wraps serverApi calls. Called from Server Components / layouts only.
 * Returns plain serialisable objects. Throws typed errors (NotFound / Unauthorized / Forbidden).
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getMyGroups() {
  const data = await serverApi.get("/messgroups/my-groups");
  return data?.groups || data || [];
}

/** @throws {NotFoundError} when group not found or user not a member (privacy masking) */
export async function getGroup(groupId) {
  const data = await serverApi.get(`/messgroups/${groupId}`);
  return data?.group || data;
}

export async function getGroupDashboard(groupId) {
  const data = await serverApi.get(`/stats/groups/${groupId}/dashboard`);
  return data?.data || data || null;
}

export async function getGroupMemberships(groupId) {
  const data = await serverApi.get(`/memberships/groups/${groupId}/memberships`);
  return data?.memberships || data || [];
}

export async function getGroupCategories(groupId) {
  const data = await serverApi.get(`/messgroups/categories/${groupId}`);
  return data?.categories || data || [];
}

export async function getGroupPolicy(groupId) {
  const data = await serverApi.get(`/policies/groups/${groupId}/policies`);
  return data?.policies || (Array.isArray(data) ? data : [data].filter(Boolean)) || [];
}

function getMembershipRole(group, userId) {
  if (!userId) return group?.myRole;
  const membership = group?.memberships?.find((item) => {
    const memberUserId = item.userId?._id || item.userId;
    return memberUserId === userId;
  });
  return membership?.role || group?.myRole;
}

export async function getGroupPolicyPageData(groupId, userId) {
  const group = await getGroup(groupId);
  if (getMembershipRole(group, userId) !== "owner") return [];
  return getGroupPolicy(groupId);
}

export async function getInviteCodeMeta(groupId) {
  try {
    const data = await serverApi.get(`/invite/codes/${groupId}`);
    return data?.data || data || null;
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

export async function getGroupSettingsData(groupId, userId) {
  const group = await getGroup(groupId);
  const role = getMembershipRole(group, userId);
  if (!["owner", "manager"].includes(role)) {
    return { inviteMeta: null, categories: [] };
  }

  const [inviteMeta, categories] = await Promise.all([
    getInviteCodeMeta(groupId),
    getGroupCategories(groupId),
  ]);
  return { inviteMeta, categories };
}

export async function getGroupMembers(groupId) {
  const data = await serverApi.get(`/users/groups/${groupId}/members`);
  return data?.members || data || [];
}

export async function getRecurringRules(groupId) {
  const data = await serverApi.get(`/recurring/groups/${groupId}/recurring`);
  return data?.rules || data || [];
}
