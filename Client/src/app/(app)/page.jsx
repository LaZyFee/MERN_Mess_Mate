/**
 * SSR Page â€” Layer 2.
 * Fetches groups server-side; passes initialGroups to HomeClient (CSR).
 */
import { getMyGroups } from "@/lib/actions/groups";
import HomeClient from "./HomeClient";
import { redirect } from "next/navigation";

export const metadata = { title: "Home â€” MealMate" };

export default async function AppHomePage() {
  let initialGroups;
  try {
    initialGroups = await getMyGroups();
  } catch (error) {
    if (error?.status === 401) redirect("/login?next=%2F");
    throw error;
  }

  return (
    <main
      className="[min-height:100dvh] [background:var(--bg)] [padding:var(--space-6)_var(--space-4)]"
    >
      <div className="[max-width:900px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold [color:var(--tp)]">MealMate</h1>
          <p className="[color:var(--tm)] [font-size:0.9rem] mt-1">
            Your shared living meal &amp; cost tracker.
          </p>
        </div>
        <HomeClient initialGroups={initialGroups} />
      </div>
    </main>
  );
}

