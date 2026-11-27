"use client";

/**
 * Locale-bound money helpers.
 *
 * Every money value in the API is integer poisha; every money value the user
 * sees or types is Taka. Use this hook in components so formatting and parsing
 * automatically follow the active language (Bengali digits in Bangla mode):
 *
 *   const { fmt, toPoisha, parse, n } = useMoney();
 *   <Money poisha={row.amount} />     // ৳1,234.56
 *   fmt(row.amount, { signed: true }) // +৳125.00
 */
import { useMemo } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { formatTaka, formatNumber, parseTakaInput, takaToPoisha, poishaToTaka } from "@/lib/utils/money";

export function useMoney() {
  const { lang, t } = useLang();

  return useMemo(
    () => ({
      lang,
      /** integer poisha → localized Taka string */
      fmt: (poisha, opts = {}) => formatTaka(poisha, { lang, ...opts }),
      /** plain number (meals, counts) → localized digits */
      n: (value, opts = {}) => formatNumber(value, { lang, ...opts }),
      /** Taka number/string → integer poisha */
      toPoisha: takaToPoisha,
      /** integer poisha → Taka number */
      toTaka: poishaToTaka,
      /** strict input parse: { ok, poisha } | { ok:false, reason } */
      parse: (value, opts) => parseTakaInput(value, opts),
      /** localized message for a parse failure */
      errorText: (reason) => t(`money.err.${reason}`),
      /** e.g. "৳ 125" with no decimals, for compact chips */
      fmtShort: (poisha) => formatTaka(poisha, { lang, withSymbol: true }).replace(/\.00(?=.)/, ""),
    }),
    [lang, t],
  );
}
