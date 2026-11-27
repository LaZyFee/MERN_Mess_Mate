/**
 * MealMate money utilities — the ONLY place where Taka ⇄ Poisha conversion and
 * Taka formatting live.
 *
 * Backend & database always use integer poisha (100 poisha = ৳1).
 * The UI always shows, and always accepts, Taka (BDT).
 *
 * All conversions are done on the decimal string, never with binary floats,
 * so `19.99` → `1999` exactly (a plain `19.99 * 100` yields 1998.9999999999998).
 */

export const POISHA_PER_TAKA = 100;

// Number formatters (no currency style): we compose the ৳ glyph ourselves so the
// output never depends on the ICU build (Node with small ICU renders BDT as
// "BDT 1,234.56" instead of the Bangla glyph).
const NUMBER_EN = new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER_BN = new Intl.NumberFormat("bn-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CURRENCY_SYMBOL = "৳";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const BN_DIGIT_MAP = Object.fromEntries(BN_DIGITS.map((d, i) => [d, String(i)]));

/** Latin digits → Bengali digits (used for plain counters, not money). */
export function toBengaliDigits(value) {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Bengali digits → Latin digits (so a user typing "১২৫" is understood). */
export function toLatinDigits(value) {
  return String(value).replace(/[০-৯]/g, (d) => BN_DIGIT_MAP[d] ?? d);
}

const isFiniteNumber = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

/**
 * Integer poisha → Taka number.
 * `poishaToTaka(12550) === 125.5` · `poishaToTaka(0) === 0` · negative preserved.
 */
export function poishaToTaka(poisha) {
  const n = Number(poisha);
  if (!Number.isFinite(n)) return 0;
  return n / POISHA_PER_TAKA;
}

/**
 * Taka (number or string) → integer poisha, exactly.
 * Accepts "125", "125.5", "125.50", "1,250.75", "৳125.50", "১২৫.৫০", -12.5.
 * Returns 0 for empty/invalid input.
 */
export function takaToPoisha(taka) {
  const n = Number(toLatinDigits(String(taka ?? "")).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * POISHA_PER_TAKA);
}

/**
 * Strict Taka parser for form input.
 * Returns `{ ok: true, poisha, taka }` or `{ ok: false, reason }` where reason is
 * one of: "empty" | "invalid" | "precision" | "negative" | "zero".
 *
 * @param {string|number} input   raw field value
 * @param {object} [opts]
 * @param {boolean} [opts.allowZero=false]   accept 0 as a valid amount
 * @param {boolean} [opts.allowNegative=false] accept negative amounts
 */
export function parseTakaInput(input, { allowZero = false, allowNegative = false } = {}) {
  const raw = toLatinDigits(String(input ?? "")).trim();
  if (!raw) return { ok: false, reason: "empty" };

  // Allow grouping separators and a leading currency glyph.
  const cleaned = raw.replace(/[৳,]/g, "").replace(/\s+/g, "");
  // Reject anything that is not a plain decimal: no exponents, no letters.
  if (!/^-?\d*(\.\d*)?$/.test(cleaned) || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return { ok: false, reason: "invalid" };
  }
  const decimals = cleaned.split(".")[1] || "";
  if (decimals.length > 2) return { ok: false, reason: "precision" };

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
  if (value < 0 && !allowNegative) return { ok: false, reason: "negative" };
  if (value === 0 && !allowZero) return { ok: false, reason: "zero" };

  const digits = cleaned.replace("-", "").split(".");
  const takaPart = Number(digits[0] || "0");
  const poishaPart = Number((digits[1] || "").padEnd(2, "0") || "0");
  const poisha = takaPart * POISHA_PER_TAKA + poishaPart;

  return {
    ok: true,
    poisha: cleaned.startsWith("-") ? -poisha : poisha,
    taka: cleaned.startsWith("-") ? -value : value,
  };
}

/**
 * Format integer poisha as a Taka string for display.
 * @param {number} poisha
 * @param {{ lang?: "en"|"bn", withSymbol?: boolean, signed?: boolean }} [opts]
 *   - lang: "bn" renders Bengali digits (১,২৩৪.৫৬)
 *   - withSymbol: default true ("৳1,234.56"); false → "1,234.56"
 *   - signed: prefix "+" on positive values (balances)
 */
export function formatTaka(poisha, { lang = "en", withSymbol = true, signed = false } = {}) {
  const valid = isFiniteNumber(poisha);
  const taka = valid ? poishaToTaka(poisha) : 0;
  const abs = Math.abs(taka);

  const body = (lang === "bn" ? NUMBER_BN : NUMBER_EN).format(abs);
  const negative = taka < 0;
  const prefix = negative ? "-" : signed && taka > 0 ? "+" : "";
  const symbol = withSymbol ? CURRENCY_SYMBOL : "";
  return `${prefix}${symbol}${body}`;
}

/**
 * Format a plain (non-money) number with locale-aware digits.
 * @param {number} value
 * @param {{ lang?: "en"|"bn", fractionDigits?: number }} [opts]
 */
export function formatNumber(value, { lang = "en", fractionDigits } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return lang === "bn" ? "০" : "0";
  const opts = fractionDigits == null
    ? {}
    : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits };
  return new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-BD", opts).format(n);
}

/** Human label for a parseTakaInput failure (English; UI should prefer i18n keys). */
export const MONEY_INPUT_ERROR = {
  empty: "Enter a Taka amount",
  invalid: "Enter a valid amount",
  precision: "Use at most 2 decimal places",
  negative: "Amount cannot be negative",
  zero: "Amount must be greater than 0",
};

// ---------------------------------------------------------------------------
// Shared enum labels (kept here so the money module stays the single import for
// money-related UI helpers). Values are API enums — never translated.
// ---------------------------------------------------------------------------

const SPLIT_MODES = [
  { value: "meal_units", label: "Meal units (weighted meals)" },
  { value: "equal_all", label: "Equal — all active members" },
  { value: "equal_selected", label: "Equal — selected members" },
  { value: "member_days", label: "Member days (service window)" },
  { value: "fixed_amounts", label: "Fixed amounts per member" },
  { value: "weighted", label: "Weighted shares" },
  { value: "usage", label: "Usage quantities" },
  { value: "personal", label: "Personal (one member)" },
];

export const SPLIT_MODE_LABELS = SPLIT_MODES.reduce((acc, mode) => {
  acc[mode.value] = mode.label;
  return acc;
}, {});

export const MONEY_KINDS = [
  { value: "contribution", label: "Contribution" },
  { value: "payout", label: "Payout" },
  { value: "supplier_payment", label: "Supplier payment" },
  { value: "member_settlement", label: "Member settlement" },
  { value: "transfer", label: "Fund transfer" },
  { value: "fee", label: "Fee" },
];

export const MONEY_KIND_LABELS = MONEY_KINDS.reduce((acc, kind) => {
  acc[kind.value] = kind.label;
  return acc;
}, {});

export const MONEY_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

export const MONEY_METHOD_LABELS = MONEY_METHODS.reduce((acc, method) => {
  acc[method.value] = method.label;
  return acc;
}, {});

export const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snacks", label: "Snacks" },
  { key: "dinner", label: "Dinner" },
];

export const PORTION_OPTIONS = [250, 500, 750, 1000];

export { SPLIT_MODES };

/** 0..1000 subunits → "¼ / ½ / ¾ / 1" label */
export function portionLabel(subunits) {
  const map = { 250: "¼", 500: "½", 750: "¾", 1000: "1" };
  return map[Number(subunits)] || "";
}
