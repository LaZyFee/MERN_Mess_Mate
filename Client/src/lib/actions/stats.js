/**
 * Layer 1 — Server Actions: stats domain.
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getStats(groupId, filters = {}) {
  const data = await serverApi.get(`/stats/${groupId}`, {
    params: {
      granularity: filters.granularity,
      year: filters.year,
      month: filters.month,
      userId: filters.userId,
    },
  });
  return {
    totals: data?.totals || null,
    mealsSeries: data?.mealsSeries || [],
    expenseSeries: data?.expenseSeries || [],
    categoryBreakdown: data?.categoryBreakdown || [],
  };
}

export async function getStatsPageData(groupId, month) {
  const data = await getStats(groupId, { granularity: "month", month });
  return { ...data, month, granularity: "month" };
}
