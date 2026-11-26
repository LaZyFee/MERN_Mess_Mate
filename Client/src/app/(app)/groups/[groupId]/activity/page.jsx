import { notFound, redirect } from "next/navigation";
import { getGroupActivity } from "@/lib/actions/activity";
import ActivityClient from "./ActivityClient";

export const metadata = { title: "Activity — MealMate" };

export default async function ActivityPage({ params }) {
  const { groupId } = await params;
  let events = [];
  try {
    events = await getGroupActivity(groupId);
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/activity`)}`);
    // 403 = not an owner/manager/treasurer/auditor: show the explanatory card instead
    if (error?.status === 404) notFound();
  }
  return <ActivityClient initialEvents={events} />;
}
