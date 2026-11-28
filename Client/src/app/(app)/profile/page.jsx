import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getProfile } from "@/lib/actions/auth";
import { getInboxPreferences } from "@/lib/actions/inbox";
import ProfileClient from "./ProfileClient";
import NotificationPrefs from "@/components/inbox/NotificationPrefs";
import PageHeader from "@/components/shared/PageHeader";
import { normalizeLang, translate, LANG_COOKIE } from "@/lib/i18n";

export const metadata = { title: "Profile — MealMate" };

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  const t = (key) => translate(lang, key);

  let profile;
  let prefs = null;
  try {
    [profile, prefs] = await Promise.all([getProfile(), getInboxPreferences()]);
  } catch (error) {
    if (error?.status === 401) redirect("/login?next=%2Fprofile");
    throw error;
  }

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-9">
      <PageHeader
        className="mb-6"
        eyebrow={t("profile.accountTitle")}
        title={t("profile.pageTitle")}
        description={t("profile.subtitle")}
      />
      <ProfileClient
        initialProfile={profile}
        notificationPrefsSlot={<NotificationPrefs initialPreferences={prefs} />}
      />
    </main>
  );
}
