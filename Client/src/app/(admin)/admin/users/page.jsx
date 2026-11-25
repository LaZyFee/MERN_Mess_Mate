import { notFound } from "next/navigation";
import { getAdminUsers } from "@/lib/actions/platform";
import AdminUsersClient from "./AdminUsersClient";

export const metadata = { title: "Users — Control plane", robots: { index: false, follow: false } };

export default async function AdminUsersPage({ searchParams }) {
  const { q = "" } = (await searchParams) || {};
  const data = await getAdminUsers(typeof q === "string" ? q : "");
  if (!data) notFound();
  return <AdminUsersClient initialUsers={data.items || []} initialCursor={data.nextCursor} initialHasMore={Boolean(data.hasMore)} initialQuery={q || ""} />;
}
