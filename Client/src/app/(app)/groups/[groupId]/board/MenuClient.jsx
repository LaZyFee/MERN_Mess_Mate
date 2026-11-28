"use client";

/**
 * Weekly menu: today's menu summary, plus a week editor (manager+) or a
 * read-only week view. Money: stored as poisha, edited as Taka.
 *
 * Mobile-first: every weekday is a collapsible block; the four slots stack.
 */
import { useEffect, useMemo, useState } from "react";
import { LuChefHat, LuPlus, LuRefreshCw, LuSave, LuTrash2, LuSun } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { dhakaToday } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { SectionCard } from "../GroupUI";
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
      estCostTaka: day.estCostPoisha ? String(day.estCostPoisha / 100) : "",
      note: day.note || "",
    };
  });
  return base;
}

function daysToPayload(days, toPoisha) {
  return days.map((day) => {
    const slots = {};
    MEAL_SLOT_LIST.forEach((slot) => {
      const text = (day.slots?.[slot] || "").trim();
      if (text) slots[slot] = text.split(",").map((name) => ({ name: name.trim() })).filter((item) => item.name);
    });
    const estCostPoisha = day.estCostTaka ? toPoisha(day.estCostTaka) : 0;
    return {
      weekday: day.weekday,
      slots,
      ...(day.cookMembershipId ? { cookMembershipId: day.cookMembershipId } : {}),
      ...(estCostPoisha > 0 ? { estCostPoisha } : {}),
      ...(day.note ? { note: day.note } : {}),
    };
  });
}

export default function MenuClient({ groupId, initialPlans = [], canEdit = false, memberships = [], todayMenu = null }) {
  const t = useT();
  const { lang, fmt, toPoisha } = useMoney();
  const { showToast } = useToast();
  const [plans, setPlans] = useState(initialPlans || []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dhakaToday()));
  const [days, setDays] = useState(() => emptyDays());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const current = useMemo(() => plans.find((plan) => plan.weekStart === weekStart) || null, [plans, weekStart]);

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
      showToast({ status: "error", title: t("board.noMenu"), description: ex?.data?.msg || ex?.message });
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
      await routinesApi.setMenu(groupId, { weekStart, days: daysToPayload(days, toPoisha) });
      showToast({ status: "success", title: t("board.saveWeek") });
      setDirty(false);
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("board.saveWeek"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const weekDays = days.map((day) => ({
    ...day,
    date: new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + day.weekday * 86400000).toISOString().slice(0, 10),
  }));

  const cookOptions = [
    { value: "", label: "—" },
    ...memberships.map((m) => ({ value: m._id, label: memberLabel(m) })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <SectionCard icon={LuSun} title={t("board.today")} subtitle={t("board.menu")}>
        {!todayMenu ? (
          <p className="rounded-xl bg-(--bgm) px-3 py-2.5 text-xs text-(--tm)">{t("board.noMenu")}</p>
        ) : (
          <div className="space-y-1.5">
            {MEAL_SLOT_LIST.map((slot) => {
              const items = todayMenu.slots?.[slot] || [];
              if (!items.length) return null;
              return (
                <div key={slot} className="flex items-start gap-2 rounded-xl bg-(--bgm) px-2.5 py-1.5">
                  <span className="w-[74px] shrink-0 text-[11px] font-bold text-(--tm)">{t(`meals.slot.${slot}`)}</span>
                  <span className="min-w-0 flex-1 text-xs text-(--ts)">
                    {items.map((item) => item.name || item).join(", ")}
                  </span>
                </div>
              );
            })}
            {todayMenu.cookMembershipId && (
              <p className="px-1 text-[11px] text-(--tm)">
                {t("board.cook")}: {memberLabel(todayMenu.cookMembershipId)}
              </p>
            )}
            {todayMenu.estCostPoisha ? (
              <p className="px-1 text-[11px] text-(--tm)">
                {t("board.estimated")}: {fmt(todayMenu.estCostPoisha)}
              </p>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={LuChefHat}
        title={t("board.menuPlan")}
        subtitle={weekStart}
        actions={
          <>
            <Input
              size="sm"
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(startOfWeek(event.target.value))}
              aria-label={t("board.weekStarting")}
              className="!w-[132px]"
            />
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
          </>
        }
      >
        {!canEdit && !current && (
          <p className="mb-2 rounded-xl bg-(--bgm) px-3 py-2 text-xs text-(--tm)">{t("board.noPublishedMenu")}</p>
        )}

        <div className="space-y-2">
          {weekDays.map((day) => {
            const weekdayLabel =
              lang === "bn"
                ? new Date(`${day.date}T12:00:00+06:00`).toLocaleDateString("bn-BD", {
                  weekday: "short",
                  timeZone: "Asia/Dhaka",
                })
                : WEEKDAYS[day.weekday];
            const hasAny = MEAL_SLOT_LIST.some((slot) => day.slots?.[slot]);

            return (
              <details
                key={day.weekday}
                open={day.date === dhakaToday() || canEdit}
                className="overflow-hidden rounded-2xl border border-(--bd)"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 bg-(--bgm) px-2.5">
                  <span className="text-[11.5px] font-bold uppercase tracking-wide text-(--ts)">
                    {weekdayLabel} <span className="font-medium text-(--tm)">· {day.date.slice(5)}</span>
                  </span>
                  {!canEdit && (
                    <span className="truncate text-[11px] text-(--tm)">{hasAny ? t("meals.set") : t("board.noMealPlanned")}</span>
                  )}
                </summary>

                <div className="p-2.5">
                  {canEdit ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {MEAL_SLOT_LIST.map((slot) => (
                        <Input
                          key={slot}
                          size="md"
                          label={t(`meals.slot.${slot}`)}
                          value={day.slots?.[slot] || ""}
                          placeholder={t("board.itemsPlaceholder")}
                          onChange={(event) => setSlot(day.weekday, slot, event.target.value)}
                        />
                      ))}
                      <Input
                        size="md"
                        label={t("board.note")}
                        value={day.note || ""}
                        maxLength={300}
                        onChange={(event) => setDayField(day.weekday, "note", event.target.value)}
                      />
                      <Input
                        size="md"
                        label={t("board.estimatedTaka")}
                        inputMode="decimal"
                        value={day.estCostTaka || ""}
                        placeholder="0.00"
                        onChange={(event) => setDayField(day.weekday, "estCostTaka", event.target.value)}
                      />
                      <Select
                        size="md"
                        label={t("board.cook")}
                        options={cookOptions}
                        value={day.cookMembershipId || ""}
                        onChange={(event) => setDayField(day.weekday, "cookMembershipId", event.target.value)}
                      />
                    </div>
                  ) : (
                    <ul className="list-none space-y-1">
                      {MEAL_SLOT_LIST.map((slot) => {
                        const text = day.slots?.[slot];
                        if (!text) return null;
                        return (
                          <li key={slot} className="flex items-start gap-2 text-xs">
                            <span className="w-[74px] shrink-0 font-semibold text-(--tm)">{t(`meals.slot.${slot}`)}</span>
                            <span className="min-w-0 flex-1 text-(--ts)">{text}</span>
                          </li>
                        );
                      })}
                      {!hasAny && <li className="text-xs text-(--tm)">{t("board.noMealPlanned")}</li>}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>

        {canEdit && (
          <div className="sticky bottom-2 z-10 mt-3 rounded-2xl border border-(--bd) bg-(--glb) p-2 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-xl"
                isFullWidth
                leftIcon={<LuSave size={14} />}
                isLoading={saving}
                isDisabled={saving || !dirty}
                onClick={save}
              >
                {t("board.saveWeek")}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                leftIcon={<LuPlus size={14} />}
                onClick={() => {
                  setDays(emptyDays());
                  setDirty(true);
                }}
              >
                {t("board.clearWeek")}
              </Button>
              {current && (
                <Button
                  variant="ghost"
                  className="rounded-xl"
                  leftIcon={<LuTrash2 size={14} />}
                  onClick={() => {
                    setDays(planToDays(current));
                    setDirty(false);
                  }}
                >
                  {t("board.resetEdits")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
