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
import { useToast } from "@/components/shared/ToastProvider";
import { inboxApi } from "@/lib/api/platform";

const KNOWN_TYPES = [
  { key: "support.admin_replied", label: "Support replies" },
  { key: "support.ticket_closed", label: "Support updates" },
  { key: "statement.finalized", label: "Statements finalized" },
  { key: "expense.approved", label: "Expense approvals" },
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-(--tm)">
              <th className="py-1 font-semibold">Type</th>
              <th className="py-1 text-center font-semibold">In-app</th>
              <th className="py-1 text-center font-semibold">Email</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-(--tm)">No notification types available.</td>
              </tr>
            ) : (
              entries.map(([key, value]) => (
                <tr key={key} className="border-t border-(--bd)">
                  <td className="min-w-0 truncate py-2 pr-2 text-(--ts)">{key}</td>
                  {["inApp", "email"].map((channel) => (
                    <td key={channel} className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(value[channel])}
                        onChange={() => toggle(key, channel)}
                        aria-label={`${key} ${channel}`}
                        className="size-5 accent-(--p)"
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      <Button isFullWidth className="mt-4" leftIcon={<LuSave size={14} />} isLoading={saving} isDisabled={saving} onClick={save}>
        Save preferences
      </Button>
    </Card>
  );
}
