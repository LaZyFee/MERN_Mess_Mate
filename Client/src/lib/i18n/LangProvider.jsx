"use client";

/**
 * T14.17a — language provider + hook.
 * Server layouts read the `mm_lang` cookie and pass it as `initialLang`, so the
 * first paint is already in the right language (no flash). Switching writes the
 * cookie and updates the tree in place.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLang, setLangCookie, translate, readLangCookie } from "@/lib/i18n";

const LangContext = createContext({ lang: "en", t: (k) => k, setLang: () => { } });

export function LangProvider({ initialLang = "en", children }) {
  const [lang, setLangState] = useState(() => normalizeLang(initialLang));

  useEffect(() => {
    // follow cookie changes from other tabs / early client reads
    const sync = () => setLangState(readLangCookie());
    window.addEventListener("mealmate:lang-changed", sync);
    return () => window.removeEventListener("mealmate:lang-changed", sync);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((next) => setLangState(setLangCookie(next)), []);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
