import { notFound, redirect } from "next/navigation";
import { getGroupSettingsData } from "@/lib/actions/groups";
import { getProfile } from "@/lib/actions/auth";
import GroupMoreClient from "./GroupMoreClient";

export const metadata = { title: "Group Settings — MealMate" };

export default async function GroupMorePage({ params }) {
  const { groupId } = await params;
  try {
    const user = await getProfile();
    const { inviteMeta, categories } = await getGroupSettingsData(groupId, user?._id);
    return (
      <GroupMoreClient
        initialInviteMeta={inviteMeta}
        initialCategories={categories}
      />
    );
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/more`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
