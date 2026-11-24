"use client";

/** Small pure helpers shared by the expense builder, list cards and workflows. */

export function memberKey(membership) {
  return membership?._id || membership?.membershipId || "";
}

export function memberName(membership) {
  return (
    membership?.displayName ||
    membership?.username ||
    membership?.name ||
    membership?.user?.username ||
    "Member"
  );
}

export function membershipIdOf(value) {
  if (value && typeof value === "object") return value._id || value.membershipId || "";
  return value || "";
}

/** Active categories only (archived categories stay for history) */
export function activeCategories(categories = []) {
  return categories.filter((category) => !category.isArchived && !category.archivedAt);
}

export function toSelectOptions(list = [], labelFn = (item) => item.label) {
  return list.map((item) => ({ value: item.value, label: labelFn(item) }));
}

export const EMPTY_LINE = {
  description: "",
  categoryId: "",
  amount: "",
  splitMode: "",
  beneficiaries: [],
  fixedAmounts: {},
  weights: {},
  usageQuantities: {},
};
