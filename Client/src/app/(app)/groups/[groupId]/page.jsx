/**
 * SSR Page — Layer 2 (Group Overview).
 * Dashboard data fetched server-side; passed to GroupOverviewClient.
 */
import { getGroupDashboard } from "@/lib/actions/groups";
import GroupOverviewClient from "./GroupOverviewClient";
import { notFound, redirect } from "next/navigation";

export default async function GroupOverviewPage({ params }) {
  const { groupId } = await params;
  let initialDash;
  try {
    initialDash = await getGroupDashboard(groupId);
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }

  return <GroupOverviewClient initialDash={initialDash} groupId={groupId} />;
}
