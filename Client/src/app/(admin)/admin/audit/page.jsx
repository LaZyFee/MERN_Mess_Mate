import { notFound } from "next/navigation";
import { getAdminAudit } from "@/lib/actions/platform";
import AdminAuditClient from "./AdminAuditClient";

export const metadata = { title: "Audit — Control plane", robots: { index: false, follow: false } };

export default async function AdminAuditPage() {
  const data = await getAdminAudit(100);
  if (!data) notFound();
  return <AdminAuditClient initialEvents={data.events || []} />;
}
