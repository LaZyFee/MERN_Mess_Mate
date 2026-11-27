/**
 * SSR Page — Layer 2.
 * Fetches groups server-side; passes initialGroups to HomeClient (CSR).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LuBookOpen } from "react-icons/lu";
import { getMyGroups } from "@/lib/actions/groups";
import { LANG_COOKIE, normalizeLang, translate } from "@/lib/i18n";
import HomeClient from "./HomeClient";

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
  const t = (key) => translate(lang, key);

  return (
    <main
      className="[min-height:100dvh] [background:var(--bg)] [padding:var(--space-6)_var(--space-4)]"
    >
      <div className="[max-width:900px] mx-auto">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold [color:var(--tp)]">MealMate</h1>
            <p className="[color:var(--tm)] [font-size:0.9rem] mt-1">
              {t("shell.builtFor")}
            </p>
          </div>
          <Link
            href="/guide"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-(--bd) bg-(--bgs) px-3 text-xs font-semibold text-(--p) no-underline hover:bg-(--pale)"
          >
            <LuBookOpen size={14} /> {t("shell.guide")}
          </Link>
        </div>
        <HomeClient initialGroups={initialGroups} />
      </div>
    </main>
  );
}
