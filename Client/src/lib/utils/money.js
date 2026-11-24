/**
 * Money / split-mode constants shared by the expense builder, recurring rules and
 * the category manager. All money is integer poisha (100 poisha = ৳1).
 */
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
