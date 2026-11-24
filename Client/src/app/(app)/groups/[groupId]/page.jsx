/**
 * SSR Page — Layer 2 (Group Overview).
 * Dashboard + today's board fetched server-side; passed to GroupOverviewClient.
 */
import { notFound, redirect } from "next/navigation";
import { getGroupDashboard } from "@/lib/actions/groups";
import { getBoardToday } from "@/lib/actions/routines";
import GroupOverviewClient from "./GroupOverviewClient";

export default async function GroupOverviewPage({ params }) {
  const { groupId } = await params;
  let dash;
  let board = null;
  try {
    [dash, board] = await Promise.all([getGroupDashboard(groupId), getBoardToday(groupId)]);
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }

  return <GroupOverviewClient initialDash={dash} initialBoard={board} groupId={groupId} />;
}
