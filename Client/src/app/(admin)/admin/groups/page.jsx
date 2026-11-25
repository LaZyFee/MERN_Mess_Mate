import { notFound } from "next/navigation";
import { getAdminGroups } from "@/lib/actions/platform";
import AdminGroupsClient from "./AdminGroupsClient";

export const metadata = { title: "Groups — Control plane", robots: { index: false, follow: false } };

export default async function AdminGroupsPage({ searchParams }) {
  const { q = "" } = (await searchParams) || {};
  const data = await getAdminGroups(typeof q === "string" ? q : "");
  if (!data) notFound();
  return <AdminGroupsClient initialGroups={data.items || []} initialQuery={q || ""} />;
}
