/**
 * Layer 1 — Server Actions: expenses domain.
 * Draft builder needs the group's categories + active memberships (Layer 2 / SSR),
 * mutations run in the CSR layer via lib/api/expenses.js.
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

export async function getExpenseCategories(groupId) {
  const data = await serverApi.get(`/messgroups/categories/${groupId}`);
  return data?.categories || data || [];
}

export async function getActiveMemberships(groupId) {
  const data = await serverApi.get(`/memberships/groups/${groupId}/memberships/active`);
  return data?.memberships || data?.active || data || [];
}

export async function getExpenseBuilderData(groupId) {
  const [categories, memberships] = await Promise.all([
    getExpenseCategories(groupId),
    getActiveMemberships(groupId),
  ]);
  return { categories, memberships };
}

export async function getGroupExpensesPageData(groupId, filters = {}) {
  const [expensePage, builderData] = await Promise.all([
    getGroupExpenses(groupId, filters),
    getExpenseBuilderData(groupId),
  ]);
  return { expensePage, ...builderData };
}
