import { notFound } from "next/navigation";
import { getAdminSupportQueue, getAdminSupportStats } from "@/lib/actions/platform";
import AdminSupportClient from "./AdminSupportClient";

export const metadata = { title: "Support queue — Control plane", robots: { index: false, follow: false } };

export default async function AdminSupportPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const pick = (key) => (typeof sp[key] === "string" && sp[key] ? sp[key] : undefined);
  const filters = {
    status: pick("status"),
    priority: pick("priority"),
    overdue: pick("overdue"),
    q: pick("q"),
    assignee: pick("assignee"),
  };
  const [queue, stats] = await Promise.all([
    getAdminSupportQueue(filters),
    getAdminSupportStats(),
  ]);
  if (!queue) notFound();
  return (
    <AdminSupportClient
      initialTickets={queue.tickets || []}
      initialCursor={queue.nextCursor || null}
      initialHasMore={Boolean(queue.hasMore)}
      initialStats={stats}
      initialFilters={filters}
    />
  );
}
