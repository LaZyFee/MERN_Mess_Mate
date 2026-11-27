import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getProfile } from "@/lib/actions/auth";
import { getInboxPreferences } from "@/lib/actions/inbox";
import ProfileClient from "./ProfileClient";
import NotificationPrefs from "@/components/inbox/NotificationPrefs";
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
      <header className="mb-6 rounded-3xl bg-(--brand-bg) px-5 py-7 text-(--brand-fg) sm:px-8 sm:py-9">
        <p className="text-sm font-semibold text-(--brand-on)">{t("profile.accountTitle")}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("profile.pageTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--brand-mute) sm:text-base">
          {t("profile.subtitle")}
        </p>
      </header>
      <ProfileClient
        initialProfile={profile}
        notificationPrefsSlot={<NotificationPrefs initialPreferences={prefs} />}
      />
    </main>
  );
}
