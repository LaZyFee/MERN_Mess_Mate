 
import { notFound, redirect } from "next/navigation";
import { getGroup } from "@/lib/actions/groups";
import { getStatementsPageData } from "@/lib/actions/statements";
import StatementsClient from "./StatementsClient";

export const metadata = { title: "Statements — MealMate" };

export default async function StatementsPage({ params, searchParams }) {
  const { groupId } = await params;
  const { month } = (await searchParams) || {};
  try {
    const [group, data] = await Promise.all([
      getGroup(groupId),
      getStatementsPageData(groupId, month),
    ]);
    return <StatementsClient groupId={groupId} initialGroup={group} initialData={data} />;
  } catch (error) {
    if (error?.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/statements`)}`);
    }
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
}
