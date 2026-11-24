/**
 * Layer 1 — Server Actions: routine & board domain (board widget, duties, menu, notes).
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getBoardToday(groupId) {
  try {
    const data = await serverApi.get(`/routines/groups/${groupId}/board/today`);
    return {
      date: data?.date || null,
      duties: data?.duties || [],
      menu: data?.menu || null,
      pinnedNotes: data?.pinnedNotes || [],
      activeHandovers: data?.activeHandovers || [],
    };
  } catch (error) {
    // Board is optional chrome — never break the Overview tab if it is unavailable.
    if ([403, 404, 500].includes(error?.status)) return null;
    if (error?.status === 401) throw error;
    return null;
  }
}

export async function getDuties(groupId, filters = {}) {
  const data = await serverApi.get(`/routines/groups/${groupId}/duties`, {
    params: { from: filters.from, to: filters.to, userId: filters.userId },
  });
  return data?.duties || data?.assignments || data || [];
}

export async function getMenu(groupId, filters = {}) {
  const data = await serverApi.get(`/routines/groups/${groupId}/menu`, {
    params: { weekStart: filters.weekStart },
  });
  return data?.menus || data?.plans || data || [];
}

export async function getNotes(groupId) {
  const data = await serverApi.get(`/routines/groups/${groupId}/notes`);
  return data?.notes || data || [];
}

export async function getRoutinePageData(groupId) {
  const [board, duties, menus, notes] = await Promise.all([
    getBoardToday(groupId),
    getDuties(groupId).catch(() => []),
    getMenu(groupId).catch(() => []),
    getNotes(groupId).catch(() => []),
  ]);
  return { board, duties, menus, notes };
}
