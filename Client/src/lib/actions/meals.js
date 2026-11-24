/**
 * Layer 1 - Server Actions: meals domain.
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getMonthMeals(groupId, month) {
  const data = await serverApi.get(`/meals/${groupId}`, { params: { month } });
  return Array.isArray(data) ? data : data?.meals || [];
}

export async function getGuestMeals(groupId, from, to) {
  const data = await serverApi.get(`/meals/${groupId}/guests`, {
    params: { from, to },
  });
  return Array.isArray(data) ? data : data?.guests || [];
}
