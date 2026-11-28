/**
 * SSR Layout — Layer 2.
 * Fetches group + membership intervals server-side (one round trip per tab
 * navigation) so the shell can resolve my role without a client waterfall.
 * Renders GroupShell (CSR) with initial data so tabs have instant content.
 */
import { notFound, redirect } from "next/navigation";
import { getGroup, getGroupMemberships } from "@/lib/actions/groups";
import GroupShell from "./GroupShell";

export async function generateMetadata({ params }) {
  const { groupId } = await params;
  try {
    const group = await getGroup(groupId);
    return { title: `${group?.name || "Group"} — MealMate` };
  } catch (error) {
    if (error?.status === 404 || error?.status === 403) return { title: "Group — MealMate" };
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}`)}`);
    throw error;
  }
}

export default async function GroupLayout({ children, params }) {
  const { groupId } = await params;

  let group;
  let memberships = [];
  try {
    [group, memberships] = await Promise.all([
      getGroup(groupId),
      // Not fatal: the shell still works with the group doc alone.
      getGroupMemberships(groupId).catch(() => []),
    ]);
  } catch (err) {
    if (err?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}`)}`);
    if (err?.status === 404 || err?.status === 403) notFound();
    throw err;
  }

  if (!group) notFound();

  return (
    <GroupShell
      initialGroup={group}
      initialMemberships={Array.isArray(memberships) ? memberships : []}
      groupId={groupId}
    >
      {children}
    </GroupShell>
  );
}
