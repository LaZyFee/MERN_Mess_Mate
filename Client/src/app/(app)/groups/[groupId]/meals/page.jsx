 
import { notFound, redirect } from "next/navigation";
import { getGroup, getGroupMemberships, getGroupPolicy } from "@/lib/actions/groups";
import { getProfile } from "@/lib/actions/auth";
import { getGuestMeals, getMonthMeals } from "@/lib/actions/meals";
import { dhakaToday, monthRange, toMonthString } from "@/lib/utils/format";
import MealsClient from "./MealsClient";

export const metadata = { title: "Meals — MealMate" };

export default async function MealsPage({ params }) {
  const { groupId } = await params;
  const month = toMonthString(new Date(`${dhakaToday()}T12:00:00+06:00`));
  const { last } = monthRange(month);
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(last.getDate()).padStart(2, "0")}`;

  try {
    const [group, profile, meals, guests, memberships, policies] = await Promise.all([
      getGroup(groupId),
      getProfile(),
      getMonthMeals(groupId, month),
      getGuestMeals(groupId, firstDay, lastDay),
      getGroupMemberships(groupId),
      getGroupPolicy(groupId),
    ]);
    return (
      <MealsClient
        groupId={groupId}
        initialGroup={group}
        initialProfile={profile}
        initialMonth={month}
        initialMeals={meals}
        initialGuests={guests}
        initialMemberships={memberships}
        initialPolicies={policies}
      />
    );
  } catch (error) {
    if (error?.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/meals`)}`);
    }
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
