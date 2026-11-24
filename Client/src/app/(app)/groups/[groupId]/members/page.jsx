import { notFound, redirect } from "next/navigation";
import { getGroupMemberships } from "@/lib/actions/groups";
import MembersClient from "./MembersClient";

export const metadata = { title: "Members — MealMate" };

export default async function MembersPage({ params }) {
  const { groupId } = await params;
  let initialMembers;
  try {
    initialMembers = await getGroupMemberships(groupId);
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/members`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
  return <MembersClient initialMembers={initialMembers} />;
}
