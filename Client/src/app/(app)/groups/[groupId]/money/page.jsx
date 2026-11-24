import { notFound, redirect } from "next/navigation";
import { getGroup, getGroupMemberships } from "@/lib/actions/groups";
import { getMoneyPageData } from "@/lib/actions/money";
import { getProfile } from "@/lib/actions/auth";
import MoneyClient from "./MoneyClient";

export const metadata = { title: "Money — MealMate" };

export default async function MoneyPage({ params }) {
  const { groupId } = await params;
  try {
    const [group, memberships, user] = await Promise.all([
      getGroup(groupId),
      getGroupMemberships(groupId),
      getProfile(),
    ]);
    const mine = (memberships || []).find(
      (m) => String(m.userId?._id || m.userId) === String(user?._id),
    );
    const data = await getMoneyPageData(groupId, mine?._id, { limit: 25 });
    return (
      <MoneyClient
        groupId={groupId}
        initialGroup={group}
        initialMemberships={memberships}
        initialPage={data.page}
        initialFunds={data.funds}
        initialBalance={data.balance}
        myMembershipId={mine?._id || null}
      />
    );
  } catch (error) {
    if (error?.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/money`)}`);
    }
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
