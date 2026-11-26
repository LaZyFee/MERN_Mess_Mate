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
  // T14.17a — locale comes from the mm_lang cookie (server read, no flash)
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid flash; mm_theme is the only readable cookie */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/mm_theme=(dark|light)/);var t=m?m[1]:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
