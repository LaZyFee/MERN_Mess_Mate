// Bengali i18n dictionary registry.
//
// Holds the mutable `dictionaries` map and the `registerDictionary` helper used
// by each `dict/*.js` module to self-register at load time.
//
// This module is intentionally a leaf (it imports nothing) so that
// `dict/*.js` modules can import `registerDictionary` without creating a cycle.
// `index.js` also imports `dict/common` as a side effect; ES modules hoist that
// side-effect import to the top of `index.js`. If `registerDictionary` lived in
// `index.js`, `dict/common` would run while `registerDictionary` was still in the
// temporal dead zone, throwing "can't access lexical declaration ... before
// initialization". Keeping the registry here breaks that cycle.

export const dictionaries = {
  en: {},
  bn: {},
};

/** Register a dictionary namespace (called from each `dict/*.js` module). */
export const registerDictionary = (lang, namespace, entries) => {
  if (!dictionaries[lang]) dictionaries[lang] = {};
  dictionaries[lang][namespace] = {
    ...(dictionaries[lang][namespace] || {}),
    ...entries,
  };
};
