import { notFound, redirect } from "next/navigation";
import { getGroup } from "@/lib/actions/groups";
import { getGroupExpensesPageData } from "@/lib/actions/expenses";
import ExpensesClient from "./ExpensesClient";

export const metadata = { title: "Expenses — MealMate" };

export default async function ExpensesPage({ params }) {
  const { groupId } = await params;
  let group;
  let pageData;
  try {
    [group, pageData] = await Promise.all([
      getGroup(groupId),
      getGroupExpensesPageData(groupId, { limit: 30 }),
    ]);
  } catch (error) {
    if (error?.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/expenses`)}`);
    }
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }

  return (
    <ExpensesClient
      groupId={groupId}
      initialGroup={group}
      initialExpensePage={pageData.expensePage}
      initialCategories={pageData.categories}
      initialMemberships={pageData.memberships}
    />
  );
}
