/**
 * Layer 1 — Server Actions: routine & board domain (board, duties, rosters,
 * menu, notes, shopping list, kitchen inventory, polls).
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
    if (error?.status === 401) throw error;
    return null;
  }
}

export async function getDuties(groupId, filters = {}) {
  const data = await serverApi.get(`/routines/groups/${groupId}/duties`, {
    params: { localDate: filters.localDate, membershipId: filters.membershipId, status: filters.status },
  });
  return data?.duties || [];
}

export async function getMenuPlans(groupId) {
  try {
    const data = await serverApi.get(`/routines/groups/${groupId}/menu`);
    return data?.menus || (Array.isArray(data?.menu) ? data.menu : data?.menu ? [data.menu] : []);
  } catch {
    return [];
  }
}

export async function getNotes(groupId) {
  try {
    const data = await serverApi.get(`/routines/groups/${groupId}/notes`);
    return data?.notes || [];
  } catch {
    return [];
  }
}

export async function getRosters(groupId) {
  try {
    const data = await serverApi.get(`/routines/groups/${groupId}/rosters`);
    return data?.rosters || [];
  } catch {
    return [];
  }
}

export async function getShoppingList(groupId) {
  try {
    const data = await serverApi.get(`/shopping-list/groups/${groupId}`);
    return data?.list || null;
  } catch {
    return null;
  }
}

export async function getKitchenInventory(groupId) {
  try {
    const data = await serverApi.get(`/kitchen-inventory/groups/${groupId}`);
    return data?.items || (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

export async function getPolls(groupId) {
  try {
    const data = await serverApi.get(`/polls/groups/${groupId}`);
    return data?.polls || [];
  } catch {
    return [];
  }
}

export async function getRoutinePageData(groupId) {
  const [board, duties, menus, notes] = await Promise.all([
    getBoardToday(groupId),
    getDuties(groupId).catch(() => []),
    getMenuPlans(groupId),
    getNotes(groupId),
  ]);
  return { board, duties, menus, notes };
}
