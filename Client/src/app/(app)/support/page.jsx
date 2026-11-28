import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getMyTickets } from "@/lib/actions/support";
import { getMyGroups } from "@/lib/actions/groups";
import { LANG_COOKIE, normalizeLang, translate } from "@/lib/i18n";
import SupportClient from "./SupportClient";
import PageHeader from "@/components/shared/PageHeader";

export const metadata = { title: "Support — MealMate" };

export default async function SupportPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  const t = (key) => translate(lang, key);

  try {
    const [initial, groups] = await Promise.all([getMyTickets(), getMyGroups().catch(() => [])]);
    return (
      <main className="px-4 py-6 sm:px-6 sm:py-9">
        <PageHeader
          className="mb-6"
          eyebrow={t("support.title")}
          title={t("support.pageTitle")}
          description={t("support.subtitle")}
        />
        <SupportClient
          initialTickets={initial.tickets}
          initialCursor={initial.nextCursor}
          initialHasMore={initial.hasMore}
          groups={Array.isArray(groups) ? groups.map((g) => ({ _id: g._id, name: g.name })) : []}
        />
      </main>
    );
  } catch (error) {
    if (error?.status === 401) redirect(`/login?next=${encodeURIComponent("/support")}`);
    throw error;
  }
}
