// Bengali i18n infrastructure (T14.17a).
// Cookie-based locale (no URL prefix, so every existing route keeps working):
//   mm_lang = "en" | "bn"
// The server layout reads the cookie and seeds `<LangProvider>`; client components
// read it through `useT()`. Dictionaries are plain objects — a missing key falls
// back to English, then to the key itself, so a partial translation never breaks UI.

export const LANGS = ["en", "bn"];
export const DEFAULT_LANG = "en";
export const LANG_COOKIE = "mm_lang";

export const normalizeLang = (value) => (LANGS.includes(value) ? value : DEFAULT_LANG);

const dictionaries = {
  en: {},
  bn: {},
};

/** Register a dictionary namespace (called from each `dict/*.js` module). */
export const registerDictionary = (lang, namespace, entries) => {
  if (!dictionaries[lang]) dictionaries[lang] = {};
  dictionaries[lang][namespace] = { ...(dictionaries[lang][namespace] || {}), ...entries };
};

/** Look up "namespace.key"; falls back bn → en → key. */
export const translate = (lang, key, vars = {}) => {
  const [namespace, ...rest] = String(key).split(".");
  const path = rest.join(".");
  const pick = (l) => (l === "bn" ? dictionaries.bn?.[namespace]?.[path] : dictionaries.en?.[namespace]?.[path]);
  let text = pick(lang) ?? pick("en") ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
};

/** Set the locale cookie (browser only) and notify listeners. */
export const setLangCookie = (lang) => {
  const next = normalizeLang(lang);
  if (typeof document === "undefined") return next;
  document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.setAttribute("lang", next);
  window.dispatchEvent(new CustomEvent("mealmate:lang-changed", { detail: next }));
  return next;
};

/** Read the locale cookie (works on the server via a passed cookie string). */
export const readLangCookie = (cookieHeader = "") => {
  if (typeof document !== "undefined" && !cookieHeader) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
    return normalizeLang(match?.[1]);
  }
  const match = String(cookieHeader).match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return normalizeLang(match?.[1]);
};

/** Available namespaces (used by tests/tooling to prove the dict loads). */
export const dictionaryNamespaces = (lang) => Object.keys(dictionaries[lang] || {});
