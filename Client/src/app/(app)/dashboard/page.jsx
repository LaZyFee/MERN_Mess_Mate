/**
 * SSR Page — Layer 2.
 * Fetches groups server-side; passes initialGroups to HomeClient (CSR).
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getMyGroups } from "@/lib/actions/groups";
import { LANG_COOKIE, normalizeLang, translate } from "@/lib/i18n";
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

  // Locale from the mm_lang cookie (same pattern as the root layout).
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-(--bg) px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 overflow-hidden rounded-3xl bg-(--brand-bg) px-5 py-7 text-(--brand-fg) sm:px-8 sm:py-9">
          <p className="text-sm font-semibold text-(--brand-on)">{translate(lang, "shell.builtFor")}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {translate(lang, "home.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--brand-mute) sm:text-base">
            {translate(lang, "home.dashboardIntro")}
          </p>
        </div>
        <HomeClient initialGroups={initialGroups} />
      </div>
    </main>
  );
}
