/**
 * Layer 1 — Server Actions: inbox (personal notifications) for the App Router.
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getInboxPage({ unread = false, cursor = null, limit = 20 } = {}) {
  const data = await serverApi.get("/inbox", { params: { unread: unread ? "1" : "", cursor, limit } });
  return {
    notifications: data?.notifications || [],
    nextCursor: data?.nextCursor || null,
    hasMore: Boolean(data?.hasMore),
  };
}

export async function getInboxUnreadCount() {
  try {
    const data = await serverApi.get("/inbox/unread-count");
    return data?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getInboxPreferences() {
  try {
    const data = await serverApi.get("/inbox/preferences");
    return data?.preferences || { types: {}, quietHours: { from: "22:00", to: "07:00" } };
  } catch {
    return { types: {}, quietHours: { from: "22:00", to: "07:00" } };
  }
}
