/**
 * Layer 1 — Server Actions: money domain.
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getMoneyTransactions(groupId, filters = {}) {
  const data = await serverApi.get(`/money/groups/${groupId}/money`, {
    params: { status: filters.status, kind: filters.kind, cursor: filters.cursor, limit: filters.limit },
  });
  return {
    transactions: data?.transactions || [],
    nextCursor: data?.nextCursor || null,
    hasMore: Boolean(data?.hasMore),
  };
}

export async function getFunds(groupId) {
  const data = await serverApi.get(`/money/groups/${groupId}/funds`);
  return data?.funds || data || [];
}

export async function getMembershipBalance(groupId, membershipId) {
  try {
    const data = await serverApi.get(`/money/groups/${groupId}/memberships/${membershipId}/balance`);
    return data;
  } catch (error) {
    if (error?.status === 404 || error?.status === 403) return null;
    throw error;
  }
}

export async function getMoneyPageData(groupId, membershipId, filters = {}) {
  const [page, funds, balance] = await Promise.all([
    getMoneyTransactions(groupId, filters),
    getFunds(groupId).catch(() => []),
    membershipId ? getMembershipBalance(groupId, membershipId) : Promise.resolve(null),
  ]);
  return { page, funds, balance };
}
