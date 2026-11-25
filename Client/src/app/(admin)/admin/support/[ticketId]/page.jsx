import { notFound } from "next/navigation";
import { getAdminCannedReplies, getAdminSupportTicket } from "@/lib/actions/platform";
import AdminTicketClient from "./AdminTicketClient";

export const metadata = { title: "Ticket — Control plane", robots: { index: false, follow: false } };

export default async function AdminTicketPage({ params }) {
  const { ticketId } = await params;
  const [thread, canned] = await Promise.all([
    getAdminSupportTicket(ticketId),
    getAdminCannedReplies().catch(() => null),
  ]);
  if (!thread?.ticket) notFound();
  return (
    <AdminTicketClient
      ticketId={ticketId}
      initialThread={thread}
      initialCannedReplies={canned?.replies || []}
    />
  );
}
