"use client";

/** T14.17a — EN/বাংলা toggle. Writes the `mm_lang` cookie and re-renders the tree. */
import { LuLanguages } from "react-icons/lu";
import { useLang } from "@/lib/i18n/LangProvider";

export default function LanguageToggle({ className = "" }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      aria-label={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
      title={lang === "bn" ? "English" : "বাংলা"}
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-full border border-(--bd) px-3 text-xs font-bold text-(--ts) hover:bg-(--bgm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p) ${className}`}
    >
      <LuLanguages size={14} />
      {lang === "bn" ? "EN" : "বাং"}
    </button>
  );
}
