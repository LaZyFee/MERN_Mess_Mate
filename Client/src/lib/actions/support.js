/**
 * Layer 1 — Server Actions: support desk (user side).
 */
import { serverApi } from "@/lib/api/serverApi";

export async function getMyTickets() {
  const data = await serverApi.get("/support/tickets");
  return {
    tickets: data?.tickets || [],
    nextCursor: data?.nextCursor || null,
    hasMore: Boolean(data?.hasMore),
  };
}

export async function getTicketThread(ticketId) {
  const data = await serverApi.get(`/support/tickets/${ticketId}`);
  return {
    ticket: data?.ticket || null,
    messages: data?.messages || [],
    permissions: data?.permissions || {
      canComment: false,
      reason: null,
      canResolve: false,
      canClose: false,
      canReopen: false,
    },
    slaStage: data?.slaStage || null,
  };
}
