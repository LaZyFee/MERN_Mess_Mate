import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";
import GuideClient from "./GuideClient";

export const metadata = {
  title: "User guide — MealMate",
  description:
    "How MealMate works: roles, meals, expenses, financial formulas, month-end settlement and troubleshooting — in English and Bangla.",
};

/**
 * User Guide. Rendered inside the protected app shell (AppChrome), so the
 * existing navigation, language toggle and theme all apply. The page is static
 * content — there is no data fetch, therefore no auth probe beyond the layout's.
 */
export default async function GuidePage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  return <GuideClient initialLang={lang} />;
}
