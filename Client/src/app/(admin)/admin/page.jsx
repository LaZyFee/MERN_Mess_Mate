import { notFound } from "next/navigation";
import { getAdminOverview, getAdminTraffic } from "@/lib/actions/platform";
import AdminOverviewClient from "./AdminOverviewClient";

export const metadata = { title: "Overview — Control plane", robots: { index: false, follow: false } };

export default async function AdminOverviewPage() {
  const [overview, traffic] = await Promise.all([getAdminOverview(), getAdminTraffic(30)]);
  if (!overview) notFound();
  return <AdminOverviewClient initialOverview={overview} initialTraffic={traffic} />;
}
