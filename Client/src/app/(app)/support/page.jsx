import { redirect } from "next/navigation";
import { getMyTickets } from "@/lib/actions/support";
import { getMyGroups } from "@/lib/actions/groups";
import SupportClient from "./SupportClient";

export const metadata = { title: "Support — MealMate" };

export default async function SupportPage() {
  try {
    const [initial, groups] = await Promise.all([getMyTickets(), getMyGroups().catch(() => [])]);
    return (
      <SupportClient
        initialTickets={initial.tickets}
        initialCursor={initial.nextCursor}
        initialHasMore={initial.hasMore}
        groups={Array.isArray(groups) ? groups.map((g) => ({ _id: g._id, name: g.name })) : []}
      />
    );
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent("/support")}`);
    throw error;
  }
}
