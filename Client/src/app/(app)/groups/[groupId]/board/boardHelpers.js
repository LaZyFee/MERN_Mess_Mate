export const POOL_MODES = [
  { value: "individual", label: "Individual (charged to me)" },
  { value: "universal", label: "Universal (shared pool)" },
];

export const NOTE_KINDS = [
  { value: "note", label: "Note" },
  { value: "announcement", label: "Announcement" },
  { value: "alert", label: "Alert" },
  { value: "handover", label: "Hand-over" },
];

export const ROSTER_TYPES = [
  { value: "bazar", label: "Bazar" },
  { value: "cleaning", label: "Cleaning" },
  { value: "cooking", label: "Cooking" },
  { value: "custom", label: "Custom" },
];

export const ROTATION_MODES = [
  { value: "round_robin", label: "Round robin" },
  { value: "weekly_template", label: "Weekly template" },
  { value: "fair", label: "Fair (balanced load)" },
  { value: "manual", label: "Manual" },
];

export const DUTY_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "done", label: "Done" },
  { value: "swapped", label: "Swapped" },
  { value: "skipped", label: "Skipped" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
];

export const MEAL_SLOT_LIST = ["breakfast", "lunch", "snacks", "dinner"];

export function memberLabel(membership) {
  return membership?.displayName || membership?.user?.username || "Member";
}

/** Duties grouped by localDate for agenda rendering. */
export function groupDutiesByDate(duties = []) {
  return duties.reduce((acc, duty) => {
    const day = duty.localDate || String(duty.date || "").slice(0, 10);
    if (!day) return acc;
    if (!acc[day]) acc[day] = [];
    acc[day].push(duty);
    return acc;
  }, {});
}

export function dutyAreaLabel(duty) {
  return duty?.area || duty?.taskKey || duty?.title || "Duty";
}
