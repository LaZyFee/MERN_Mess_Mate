// Locale-aware formatting helpers.
//
// Money is ALWAYS integer poisha in the API/database (100 poisha = ৳1) and is
// ALWAYS shown/accepted in Taka. All conversion + currency formatting lives in
// `@/lib/utils/money`; this module re-exports it so existing imports keep working.

import { formatTaka, takaToPoisha } from "./money";

export {
  formatTaka,
  takaToPoisha,
  poishaToTaka,
  toBengaliDigits,
  formatNumber,
  parseTakaInput,
  MONEY_INPUT_ERROR,
  POISHA_PER_TAKA,
} from "./money";

const localeOf = (lang) => (lang === "bn" ? "bn-BD" : "en-GB");

/**
 * integer poisha → "৳1,234.56" (en) / "১,২৩৪.৫৬৳" (bn).
 * Kept for backwards compatibility with existing call sites.
 */
export function formatPoisha(poisha, lang = "en") {
  return formatTaka(poisha, { lang });
}

/** Plain Taka string without the currency symbol: "1234.56". */
export function formatPoishaPlain(poisha) {
  return (Number(poisha || 0) / 100).toFixed(2);
}

/**
 * Loose parser kept for backwards compatibility.
 * @deprecated Prefer `parseTakaInput()` from `@/lib/utils/money`, which validates
 * precision/negatives and returns a discriminated result.
 */
export function parseTaka(value) {
  return takaToPoisha(value);
}

// ---- Month helpers (YYYY-MM) ----

export function toMonthString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-03" → "March 2026" (en) / "মার্চ ২০২৬" (bn). */
export function formatMonth(monthString, lang = "en") {
  if (!monthString) return "";
  const [y, m] = monthString.split("-").map(Number);
  if (!y || !m) return "";
  return new Date(y, m - 1, 1).toLocaleDateString(localeOf(lang), { month: "long", year: "numeric" });
}

export function monthRange(monthString) {
  const [y, m] = monthString.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { first, last, days: last.getDate() };
}

export function addMonths(monthString, delta) {
  const [y, m] = monthString.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthString(d);
}

// ---- Dhaka civil date helpers ----

const DHAKA = "Asia/Dhaka";

/** "YYYY-MM-DD" civil date in Dhaka timezone */
export function dhakaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA }).format(new Date());
}

/** Convert a Date to Dhaka civil "YYYY-MM-DD" */
export function toDhakaDate(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA }).format(date);
}

/** Pretty date label from "YYYY-MM-DD": "Mon, 5 Jan" (en) / "সোম, ৫ জানু" (bn). */
export function formatDay(dateString, lang = "en") {
  if (!dateString) return "";
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString(localeOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Weekday short label for a "YYYY-MM-DD" Dhaka date. */
export function formatWeekday(dateString, lang = "en") {
  return new Date(`${dateString}T12:00:00+06:00`).toLocaleDateString(localeOf(lang), {
    weekday: "short",
    timeZone: DHAKA,
  });
}

export { idempotencyKey, withIdempotency } from "@/lib/api/browserApi";
