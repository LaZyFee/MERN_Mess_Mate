"use client";

import { useEffect, useRef, useState } from "react";
import { LuUserPlus } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import RadioGroup from "@/components/shared/RadioGroup";
import Select from "@/components/shared/Select";
import Toast from "@/components/shared/Toast";
import { mealsApi } from "@/lib/api/meals";
import { dhakaToday, monthRange } from "@/lib/utils/format";

const SLOT_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

const PORTIONS = [
  { value: "250", label: "1/4" },
  { value: "500", label: "1/2" },
  { value: "750", label: "3/4" },
  { value: "1000", label: "1" },
];

export default function GuestMealPanel({
  groupId,
  enabledSlots,
  month,
  initialGuests,
}) {
  const [guests, setGuests] = useState(initialGuests ?? []);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    guestName: "",
    date: dhakaToday(),
    slot: enabledSlots[0] || "lunch",
    portionSubunits: "500",
    poolMode: "individual",
    eventPoolRef: "",
  });
  const previousMonth = useRef(month);

  useEffect(() => {
    if (previousMonth.current === month) return;
    previousMonth.current = month;
    const { last } = monthRange(month);
    const from = `${month}-01`;
    const to = `${month}-${String(last.getDate()).padStart(2, "0")}`;
    mealsApi.getGuests(groupId, from, to).then((data) => {
      setGuests(Array.isArray(data) ? data : data?.guests || []);
    }).catch(() => {});
  }, [groupId, month]);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const refreshGuests = async (date = form.date) => {
    const monthValue = date.slice(0, 7);
    const { last } = monthRange(monthValue);
    const from = `${monthValue}-01`;
    const to = `${monthValue}-${String(last.getDate()).padStart(2, "0")}`;
    const data = await mealsApi.getGuests(groupId, from, to);
    setGuests(Array.isArray(data) ? data : data?.guests || []);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await mealsApi.createGuest(groupId, {
        date: form.date,
        guestName: form.guestName.trim(),
        slot: form.slot,
        portionSubunits: Number(form.portionSubunits),
        poolMode: form.poolMode,
        eventPoolRef: form.eventPoolRef.trim(),
      });
      await refreshGuests();
      setToast({ type: "success", message: "Guest meal added" });
    } catch (error) {
      setToast({
        type: "error",
        message: error?.message || "Could not add guest meal",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <Card
        header={
          <div className="flex items-center gap-2">
            <LuUserPlus size={20} className="text-(--p)" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-(--tm)">Guest meal</p>
              <h2 className="text-lg font-bold text-(--tp)">Add visitor</h2>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            size="lg"
            label="Guest name"
            value={form.guestName}
            onChange={(event) => update("guestName", event.target.value)}
            placeholder="Optional"
          />
          <Input
            size="lg"
            type="date"
            label="Date"
            value={form.date}
            onChange={(event) => update("date", event.target.value)}
          />
          <Select
            size="lg"
            label="Meal slot"
            value={form.slot}
            options={enabledSlots.map((slot) => ({
              value: slot,
              label: SLOT_LABELS[slot],
            }))}
            onChange={(event) => update("slot", event.target.value)}
          />
          <Input
            size="lg"
            label="Event pool reference"
            value={form.eventPoolRef}
            onChange={(event) => update("eventPoolRef", event.target.value)}
            placeholder="Optional"
          />
          <RadioGroup
            name="guest-portion"
            label="Portion"
            value={form.portionSubunits}
            size="lg"
            orientation="horizontal"
            options={PORTIONS}
            onChange={(event) => update("portionSubunits", event.target.value)}
          />
          <RadioGroup
            name="guest-pool"
            label="Pool mode"
            value={form.poolMode}
            size="md"
            orientation="vertical"
            options={[
              { value: "individual", label: "Individual — host pays" },
              { value: "universal", label: "Universal — raises meal-rate denominator" },
            ]}
            onChange={(event) => update("poolMode", event.target.value)}
          />
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            size="lg"
            isFullWidth
            isLoading={saving}
            onClick={submit}
          >
            Add guest meal
          </Button>
        </div>
      </Card>

      <Card variant="outlined">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-(--tp)">Guest meals</h3>
          <span className="text-xs font-semibold text-(--tm)">
            {guests.length} entries
          </span>
        </div>
        {guests.length === 0 ? (
          <p className="text-sm text-(--tm)">No guest meals in this month.</p>
        ) : (
          <div className="space-y-2">
            {guests.map((guest) => (
              <div
                key={guest._id}
                className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-(--bd) bg-(--bgs) px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-(--tp)">
                    {guest.guestName || "Guest"}
                  </p>
                  <p className="text-xs text-(--tm)">
                    {guest.localDate} · {SLOT_LABELS[guest.slot] || guest.slot} · {guest.poolMode}
                  </p>
                </div>
                <span className="rounded-full bg-(--pale) px-3 py-1 text-sm font-bold text-(--p)">
                  {PORTIONS.find((item) => item.value === String(guest.portionSubunits))?.label ||
                    `${guest.portionSubunits / 1000}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
