import { notFound, redirect } from "next/navigation";
import { getStatsPageData } from "@/lib/actions/stats";
import ChartsClient from "./ChartsClient";

export const metadata = { title: "Charts — MealMate" };

export default async function ChartsPage({ params }) {
  const { groupId } = await params;
  let data;
  try {
    data = await getStatsPageData(groupId);
  } catch (error) {
    if (error?.status === 401) {
      redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}/charts`)}`);
    }
    if (error?.status === 404 || error?.status === 403) notFound();
    throw error;
  }
  return <ChartsClient groupId={groupId} initialStats={data} initialMonth={data.month} />;
}
