import { notFound, redirect } from "next/navigation";
import { getGroupMembers, getGroupMemberships } from "@/lib/actions/groups";
import MembersClient from "./MembersClient";

export const metadata = { title: "Members — MealMate" };

export default async function MembersPage({ params }) {
  const { groupId } = await params;
  let initialMembers;
  let initialDirectory;
  try {
    initialMembers = await getGroupMemberships(groupId);
    // Co-member directory is optional: a failure only degrades the extra panel.
    initialDirectory = await getGroupMembers(groupId).catch(() => null);
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/members`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
  return <MembersClient initialMembers={initialMembers} initialDirectory={initialDirectory} />;
}
