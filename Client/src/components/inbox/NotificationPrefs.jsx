"use client";

/**
 * P11.3 — Notification preferences (per type in-app/email toggles + quiet hours).
 * Seeds from server-rendered props; saves through PUT /inbox/preferences.
 */
import { useState } from "react";
import { LuBellRing, LuMoonStar, LuSave } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Checkbox from "@/components/shared/Checkbox";
import { useToast } from "@/components/shared/ToastProvider";
import { inboxApi } from "@/lib/api/platform";

const KNOWN_TYPES = [
  { key: "support.admin_replied", label: "Support replies" },
  { key: "support.ticket_closed", label: "Support updates" },
  { key: "statement.finalized", label: "Statements finalized" },
  { key: "expense.approved", label: "Expense approvals" },
  { key: "payment_reminder", label: "Payment reminders (you owe)" },
  { key: "money.confirmed", label: "Money confirmations" },
  { key: "duty.reminder", label: "Duty reminders" },
  { key: "emergency.broadcast", label: "Emergency broadcasts" },
];

function normalizePrefs(prefs) {
  const types = {};
  KNOWN_TYPES.forEach(({ key }) => {
    types[key] = { inApp: prefs?.types?.[key]?.inApp ?? true, email: prefs?.types?.[key]?.email ?? true };
  });
  Object.entries(prefs?.types || {}).forEach(([key, value]) => {
    if (!types[key]) types[key] = { inApp: value?.inApp ?? true, email: value?.email ?? true };
  });
  return { types, quietHours: prefs?.quietHours || { from: "22:00", to: "07:00" } };
}

export default function NotificationPrefs({ initialPreferences }) {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState(() => normalizePrefs(initialPreferences));
  const [saving, setSaving] = useState(false);

  const toggle = (typeKey, channel) =>
    setPrefs((prev) => ({
      ...prev,
      types: { ...prev.types, [typeKey]: { ...prev.types[typeKey], [channel]: !prev.types[typeKey][channel] } },
    }));

  const setQuiet = (field, value) =>
    setPrefs((prev) => ({ ...prev, quietHours: { ...prev.quietHours, [field]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await inboxApi.savePreferences(prefs);
      showToast({ status: "success", title: "Notification preferences saved" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not save preferences", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const entries = Object.entries(prefs.types);

  return (
    <Card
      padding="md"
      header={
        <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
          <LuBellRing size={15} className="text-(--p)" /> Notification preferences
        </h2>
      }
    >
      <div className="space-y-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_5rem_5rem] gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-(--tm) sm:grid">
          <span>Notification type</span><span className="text-center">In-app</span><span className="text-center">Email</span>
        </div>
        {entries.length === 0 ? (
          <p className="rounded-xl bg-(--bgm) px-3 py-4 text-center text-sm text-(--tm)">No notification types available.</p>
        ) : entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] items-center gap-2 rounded-xl border border-(--bd) px-3 py-2 sm:grid-cols-[minmax(0,1fr)_5rem_5rem]">
            <span className="min-w-0 break-words text-sm text-(--ts)">{KNOWN_TYPES.find((entry) => entry.key === key)?.label || key.replaceAll(".", " ")}</span>
            {["inApp", "email"].map((channel) => (
              <span key={channel} className="flex justify-center">
                <Checkbox isChecked={Boolean(value[channel])} onChange={() => toggle(key, channel)} aria-label={`${key} ${channel}`} />
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-(--bd) pt-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          <LuMoonStar size={12} /> Quiet hours
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            size="lg"
            type="time"
            label="From"
            value={prefs.quietHours.from}
            onChange={(event) => setQuiet("from", event.target.value)}
          />
          <Input
            size="lg"
            type="time"
            label="To"
            value={prefs.quietHours.to}
            onChange={(event) => setQuiet("to", event.target.value)}
          />
        </div>
      </div>

      <Button variant="primary" isFullWidth className="mt-4" leftIcon={<LuSave size={14} />} isLoading={saving} isDisabled={saving} onClick={save}>
        Save preferences
      </Button>
    </Card>
  );
}
