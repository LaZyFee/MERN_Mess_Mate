import { notFound, redirect } from "next/navigation";
import { getTicketThread } from "@/lib/actions/support";
import TicketThreadClient from "./TicketThreadClient";

export const metadata = { title: "Support ticket — MealMate" };

export default async function TicketThreadPage({ params }) {
  const { ticketId } = await params;
  try {
    const data = await getTicketThread(ticketId);
    if (!data.ticket) notFound();
    return (
      <TicketThreadClient
        ticketId={ticketId}
        initialTicket={data.ticket}
        initialMessages={data.messages}
        initialPermissions={data.permissions}
        initialSlaStage={data.slaStage}
      />
    );
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/support/tickets/${ticketId}`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
