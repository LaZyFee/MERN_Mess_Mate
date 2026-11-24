/* eslint-disable react-refresh/only-export-components */
import { notFound, redirect } from "next/navigation";
import { getGroup } from "@/lib/actions/groups";
import { getGroupExpenses } from "@/lib/actions/expenses";
import ExpensesClient from "./ExpensesClient";

export const metadata = { title: "Expenses — MealMate" };

export default async function ExpensesPage({ params }) {
  const { groupId } = await params;
  try {
    const [group, expensePage] = await Promise.all([
      getGroup(groupId),
      getGroupExpenses(groupId, { limit: 30 }),
    ]);
    return (
      <ExpensesClient
        groupId={groupId}
        initialGroup={group}
        initialExpensePage={expensePage}
      />
    );
  } catch (error) {
    if (error?.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/expenses`)}`);
    }
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
