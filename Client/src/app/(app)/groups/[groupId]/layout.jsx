/**
 * SSR Layout — Layer 2.
 * Fetches group server-side; redirects/notFound on errors (privacy masking).
 * Renders GroupShell (CSR) with initialGroup so tabs have instant data.
 */
import { notFound, redirect } from "next/navigation";
import { getGroup } from "@/lib/actions/groups";
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
  try {
    group = await getGroup(groupId);
  } catch (err) {
    if (err?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}`)}`);
    if (err?.status === 404 || err?.status === 403) notFound();
    throw err;
  }

  if (!group) notFound();

  return (
    <GroupShell initialGroup={group} groupId={groupId}>
      {children}
    </GroupShell>
  );
}
