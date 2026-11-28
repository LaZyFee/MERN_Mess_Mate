/**
 * SSR Page — Layer 2.
 * Fetches groups server-side; passes initialGroups to HomeClient (CSR).
 */
import { redirect } from "next/navigation";
import { getMyGroups } from "@/lib/actions/groups";
import HomeClient from "../HomeClient";

export const metadata = { title: "Home — MealMate" };

export default async function AppHomePage() {
  let initialGroups;
  try {
    initialGroups = await getMyGroups();
  } catch (error) {
    if (error?.status === 401) redirect("/login?next=%2F");
    throw error;
  }

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-(--bg) px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <HomeClient initialGroups={initialGroups} />
      </div>
    </main>
  );
}
