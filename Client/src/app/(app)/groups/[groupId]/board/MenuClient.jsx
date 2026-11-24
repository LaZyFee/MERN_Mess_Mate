"use client";

/**
 * T9.4 — Weekly menu: template editor (manager+) and read-only week view.
 * Today's menu (with cook) is rendered from the board payload.
 */
import { useEffect, useMemo, useState } from "react";
import { LuChefHat, LuPlus, LuRefreshCw, LuSave, LuTrash2 } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { dhakaToday, formatPoisha } from "@/lib/utils/format";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { MEAL_SLOT_LIST, memberLabel } from "./boardHelpers";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const start = new Date(d.getTime() - day * 86400000);
  return start.toISOString().slice(0, 10);
}

function emptyDays() {
  return WEEKDAYS.map((_, weekday) => ({ weekday, slots: {} }));
}

function planToDays(plan) {
  const base = emptyDays();
  (plan?.days || []).forEach((day) => {
    const slotMap = {};
    MEAL_SLOT_LIST.forEach((slot) => {
      const items = day.slots?.[slot] || [];
      slotMap[slot] = items.map((item) => item.name).join(", ");
    });
    base[day.weekday] = {
      weekday: day.weekday,
      slots: slotMap,
      cookMembershipId: day.cookMembershipId?._id || day.cookMembershipId || "",
      estCostPoisha: day.estCostPoisha || 0,
      note: day.note || "",
    };
  });
  return base;
}

function daysToPayload(days) {
  return days.map((day) => {
    const slots = {};
    MEAL_SLOT_LIST.forEach((slot) => {
      const text = (day.slots?.[slot] || "").trim();
      if (text) slots[slot] = text.split(",").map((name) => ({ name: name.trim() })).filter((item) => item.name);
    });
    return {
      weekday: day.weekday,
      slots,
      ...(day.cookMembershipId ? { cookMembershipId: day.cookMembershipId } : {}),
      ...(day.estCostPoisha ? { estCostPoisha: Number(day.estCostPoisha) } : {}),
      ...(day.note ? { note: day.note } : {}),
    };
  });
}

export default function MenuClient({ groupId, initialPlans = [], canEdit = false, memberships = [], todayMenu = null }) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState(initialPlans || []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dhakaToday()));
  const [days, setDays] = useState(() => emptyDays());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const current = useMemo(
    () => plans.find((plan) => plan.weekStart === weekStart) || null,
    [plans, weekStart],
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await routinesApi.menu(groupId, { weekStart });
      const list = data?.menus || (data?.menu ? [data.menu] : []);
      setPlans(list);
      const next = list.find((plan) => plan.weekStart === weekStart) || null;
      setDays(planToDays(next));
      setDirty(false);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load menu", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return onRealtime((event) => {
      if (event === "menu-updated") load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, groupId]);

  const setSlot = (weekday, slot, value) => {
    setDirty(true);
    setDays((prev) =>
      prev.map((day) => (day.weekday === weekday ? { ...day, slots: { ...day.slots, [slot]: value } } : day)),
    );
  };

  const setDayField = (weekday, field, value) => {
    setDirty(true);
    setDays((prev) => prev.map((day) => (day.weekday === weekday ? { ...day, [field]: value } : day)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await routinesApi.setMenu(groupId, { weekStart, days: daysToPayload(days) });
      showToast({ status: "success", title: "Menu saved" });
      setDirty(false);
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not save menu", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const weekDays = days.map((day) => ({
    ...day,
    date: new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + day.weekday * 86400000).toISOString().slice(0, 10),
  }));

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md" header={<h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)"><LuChefHat size={15} className="text-(--p)" /> Today&apos;s menu</h2>}>
        {!todayMenu ? (
          <p className="text-xs text-(--tm)">No menu planned for today.</p>
        ) : (
          <div className="space-y-1">
            {MEAL_SLOT_LIST.map((slot) => {
              const items = todayMenu.slots?.[slot] || [];
              if (!items.length) return null;
              return (
                <p key={slot} className="text-xs text-(--ts)">
                  <span className="font-bold capitalize text-(--tm)">{slot}: </span>
                  {items.map((item) => item.name || item).join(", ")}
                </p>
              );
            })}
            {todayMenu.cookMembershipId && (
              <p className="text-[11px] text-(--tm)">Cook: {memberLabel(todayMenu.cookMembershipId)}</p>
            )}
            {todayMenu.estCostPoisha ? (
              <p className="text-[11px] text-(--tm)">Estimated: {formatPoisha(todayMenu.estCostPoisha)}</p>
            ) : null}
          </div>
        )}
      </Card>

      <Card
        padding="md"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-(--tp)">Week plan</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Input size="sm" type="date" value={weekStart} onChange={(event) => setWeekStart(startOfWeek(event.target.value))} aria-label="Week starting" />
              <Button size="sm" variant="ghost" isRound ariaLabel="Reload" isLoading={loading} onClick={load}>
                <LuRefreshCw size={14} />
              </Button>
            </div>
          </div>
        }
      >
        {!canEdit && !current && (
          <p className="text-xs text-(--tm)">No menu has been published for this week.</p>
        )}

        <div className="space-y-3">
          {weekDays.map((day) => (
            <div key={day.weekday} className="rounded-lg border border-(--bd) p-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">
                  {WEEKDAYS[day.weekday]} · {day.date.slice(5)}
                </p>
              </div>
              {canEdit ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MEAL_SLOT_LIST.map((slot) => (
                    <Input
                      key={slot}
                      size="sm"
                      label={slot}
                      value={day.slots?.[slot] || ""}
                      placeholder="Items, comma separated"
                      onChange={(event) => setSlot(day.weekday, slot, event.target.value)}
                    />
                  ))}
                  <Input
                    size="sm"
                    label="Note"
                    value={day.note || ""}
                    maxLength={300}
                    onChange={(event) => setDayField(day.weekday, "note", event.target.value)}
                  />
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-(--tm)">Cook</span>
                    <select
                      value={day.cookMembershipId || ""}
                      onChange={(event) => setDayField(day.weekday, "cookMembershipId", event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-(--bd) bg-(--bgs) px-2 text-base text-(--ts)"
                    >
                      <option value="">—</option>
                      {memberships.map((m) => (
                        <option key={m._id} value={m._id}>{memberLabel(m)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <ul className="list-none space-y-0.5">
                  {MEAL_SLOT_LIST.map((slot) => {
                    const text = day.slots?.[slot];
                    if (!text) return null;
                    return (
                      <li key={slot} className="truncate text-xs text-(--ts)">
                        <span className="font-semibold capitalize text-(--tm)">{slot}: </span>{text}
                      </li>
                    );
                  })}
                  {!MEAL_SLOT_LIST.some((slot) => day.slots?.[slot]) && (
                    <li className="text-xs text-(--tm)">No meals planned.</li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button isFullWidth leftIcon={<LuSave size={14} />} isLoading={saving} isDisabled={saving || !dirty} onClick={save}>
              Save week menu
            </Button>
            <Button variant="outline" leftIcon={<LuPlus size={14} />} onClick={() => { setDays(emptyDays()); setDirty(true); }}>
              Clear week
            </Button>
            {current && (
              <Button variant="ghost" leftIcon={<LuTrash2 size={14} />} onClick={() => { setDays(planToDays(current)); setDirty(false); }}>
                Reset edits
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
