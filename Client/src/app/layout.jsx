import { cookies } from "next/headers";
import "./globals.css";
import "@/lib/i18n/dict/common";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";

// Next.js config exports (not React components)

export const metadata = {
  title: "MealMate — Meal & Cost Tracker",
  description:
    "Meal, expense and money tracking for shared living, backed by a real double-entry ledger.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  // T14.17a — locale & theme come from cookies (server read, no flash).
  // mm_theme is the only readable theme cookie; setting data-theme during SSR
  // paints the right theme immediately and removes the client-side <script>
  // that React 19 flags during SSR.
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  const theme = cookieStore.get("mm_theme")?.value;

  return (
    <html lang={lang} suppressHydrationWarning data-theme={theme ?? "light"}>
      <head></head>
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
