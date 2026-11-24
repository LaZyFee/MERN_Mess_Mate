import { redirect } from "next/navigation";
import { getInboxPage } from "@/lib/actions/inbox";
import InboxClient from "./InboxClient";

export const metadata = { title: "Inbox — MealMate" };

export default async function InboxPage() {
  try {
    const initial = await getInboxPage();
    return (
      <InboxClient
        initialNotifications={initial.notifications}
        initialNextCursor={initial.nextCursor}
        initialHasMore={initial.hasMore}
      />
    );
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent("/inbox")}`);
    throw error;
  }
}
