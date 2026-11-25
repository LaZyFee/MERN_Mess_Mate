import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/actions/auth";
import { getGroupContext } from "@/lib/actions/groups";
import {
  getBoardToday,
  getDuties,
  getMenuPlans,
  getNotes,
  getRosters,
  getShoppingList,
  getKitchenInventory,
  getPolls,
} from "@/lib/actions/routines";
import BoardClient from "./BoardClient";

export const metadata = { title: "Board — MealMate" };

export default async function BoardPage({ params }) {
  const { groupId } = await params;
  try {
    const user = await getProfile();
    const ctx = await getGroupContext(groupId, user?._id);
    const role = ctx.myRole;
    const canManage = ["owner", "manager"].includes(role);
    const canConvert = ["owner", "manager", "treasurer"].includes(role);

    const [board, duties, menus, notes, rosters, shopping, inventory, polls] = await Promise.all([
      getBoardToday(groupId),
      getDuties(groupId).catch(() => []),
      getMenuPlans(groupId),
      getNotes(groupId),
      getRosters(groupId),
      getShoppingList(groupId),
      getKitchenInventory(groupId),
      getPolls(groupId),
    ]);

    return (
      <BoardClient
        groupId={groupId}
        canManage={canManage}
        canConvert={canConvert}
        memberships={ctx.memberships}
        categories={ctx.categories}
        initialBoard={board}
        initialDuties={duties}
        initialMenus={menus}
        initialNotes={notes}
        initialRosters={rosters}
        initialShopping={shopping}
        initialInventory={inventory}
        initialPolls={polls}
      />
    );
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/board`)}`);
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
