/**
 * SSR Page — Layer 2.
 * Fetches groups server-side; passes initialGroups to HomeClient (CSR).
 */
import { getMyGroups } from "@/lib/actions/groups";
import HomeClient from "./HomeClient";
import { redirect } from "next/navigation";

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
    <main
      className={["[min-height:100dvh]", "[background:var(--bg)]", "[padding:var(--space-6)_var(--space-4)]"].filter(Boolean).join(" ")}
    >
      <div className={["[max-width:900px]", "[margin:0_auto]"].filter(Boolean).join(" ")}>
        <div className={["[margin-bottom:var(--space-6)]"].filter(Boolean).join(" ")}>
          <h1 className={["[font-size:1.5rem]", "font-extrabold", "[color:var(--tp)]"].filter(Boolean).join(" ")}>MealMate</h1>
          <p className={["[color:var(--tm)]", "[font-size:0.9rem]", "[margin-top:var(--space-1)]"].filter(Boolean).join(" ")}>
            Your shared living meal &amp; cost tracker.
          </p>
        </div>
        <HomeClient initialGroups={initialGroups} />
      </div>
    </main>
  );
}
