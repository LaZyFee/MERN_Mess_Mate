import { notFound, redirect } from "next/navigation";
import { getGroupPolicyPageData } from "@/lib/actions/groups";
import { getProfile } from "@/lib/actions/auth";
import PolicyClient from "./PolicyClient";

export const metadata = { title: "Group Policy — MealMate" };

export default async function PolicyPage({ params }) {
  const { groupId } = await params;
  let initialPolicies;
  try {
    const user = await getProfile();
    initialPolicies = await getGroupPolicyPageData(groupId, user?._id);
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/policy`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
  return <PolicyClient initialPolicies={initialPolicies} />;
}
