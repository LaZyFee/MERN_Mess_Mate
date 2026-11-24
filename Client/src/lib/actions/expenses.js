/**
 * Layer 1 - Server Actions: expenses domain.
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getGroupExpenses(groupId, filters = {}) {
  const data = await serverApi.get(`/expenses/groups/${groupId}/expenses`, {
    params: {
      status: filters.status,
      costPeriod: filters.costPeriod,
      payable: filters.payable,
      cursor: filters.cursor,
      limit: filters.limit,
    },
  });
  return {
    expenses: Array.isArray(data?.expenses) ? data.expenses : [],
    nextCursor: data?.nextCursor || null,
    hasMore: Boolean(data?.hasMore),
  };
}
