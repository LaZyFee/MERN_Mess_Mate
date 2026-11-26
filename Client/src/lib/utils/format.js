// Money: all amounts are integer poisha (100 poisha = ৳1)

const bdTaka = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Latin digits → Bengali digits (locale-aware number rendering, T14.17a). */
export function toBengaliDigits(value) {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** integer poisha → "৳ ১,২৩৪.৫৬" when lang is 'bn', else "৳1,234.56". */
export function formatPoisha(poisha, lang = "en") {
  if (poisha == null || Number.isNaN(Number(poisha))) return lang === "bn" ? "৳ ০.০০" : bdTaka.format(0);
  const formatted = bdTaka.format(Number(poisha) / 100);
  return lang === "bn" ? toBengaliDigits(formatted) : formatted;
}

/** plain number string for amount display without symbol */
export function formatPoishaPlain(poisha) {
  return (Number(poisha || 0) / 100).toFixed(2);
}

/** ৳ amount (string/number) → integer poisha */
export function parseTaka(value) {
  const n = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// ---- Month helpers (YYYY-MM) ----

export function toMonthString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(monthString) {
  if (!monthString) return "";
  const [y, m] = monthString.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
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

/** Pretty date label from "YYYY-MM-DD" */
export function formatDay(dateString) {
  if (!dateString) return "";
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export { idempotencyKey, withIdempotency } from "@/lib/api/browserApi";
