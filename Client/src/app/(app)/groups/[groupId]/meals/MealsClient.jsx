"use client";

/**
 * Meals tab — pick a day, set each slot (absent / unknown / portion), save.
 * Mobile-first: month stepper, a snap-scrolling day rail, big touch targets for
 * portions, and a sticky save bar. Errors go through the shared toast provider.
 */
import { useMemo, useState } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuLockKeyhole,
  LuMinus,
  LuRefreshCw,
  LuTrash2,
  LuUtensilsCrossed,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { SectionCard, SegmentedControl, StickyActions, MiniStat } from "../GroupUI";
import GuestMealPanel from "./GuestMealPanel";
import MealMonthGrid from "./MealMonthGrid";
import AdminMealTools from "./AdminMealTools";
import { mealsApi } from "@/lib/api/meals";
import {
  addMonths,
  dhakaToday,
  formatMonth,
  monthRange,
} from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const SLOT_KEYS = ["breakfast", "lunch", "snacks", "dinner"];

const PORTIONS = [
  { label: "1/4", value: 250 },
  { label: "1/2", value: 500 },
  { label: "3/4", value: 750 },
  { label: "1", value: 1000 },
];

function slotState(meal, slotName) {
  return meal?.slots?.[slotName] || meal?.[slotName] || { state: "unknown" };
}

function civilDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
    new Date(value),
  );
}

export default function MealsClient({
  groupId,
  initialGroup,
  initialProfile,
  initialMonth,
  initialMeals,
  initialGuests,
  initialMemberships,
  initialPolicies,
}) {
  const t = useT();
  const { lang, n } = useMoney();
  const { showToast } = useToast();
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(dhakaToday());
  const [meals, setMeals] = useState(initialMeals ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState("today");

  const enabledSlots = useMemo(
    () =>
      (initialGroup?.mealSlots?.length
        ? initialGroup.mealSlots
        : SLOT_KEYS
      ).filter((slot) => SLOT_KEYS.includes(slot)),
    [initialGroup],
  );

  const profileId = initialProfile?._id || initialProfile?.id;
  const policy = Array.isArray(initialPolicies)
    ? [...initialPolicies].reverse().find(Boolean)
    : initialPolicies;
  const cutoffHour = Number(policy?.entryCutoffHour ?? 23);
  const currentHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const isPastCutoff = selectedDate < dhakaToday() ||
    (selectedDate === dhakaToday() && currentHour >= cutoffHour);
  const myMembership = (initialMemberships ?? []).find((membership) => {
    const id = membership.userId?._id || membership.userId?.id || membership.userId;
    return String(id) === String(profileId);
  });
  const myRole = myMembership?.role || initialGroup?.myRole;
  const canAdminMeals = myRole === "owner";
  const ownMeal = useMemo(
    () =>
      meals.find((meal) => {
        const mealUserId = meal.userId?._id || meal.userId?.id || meal.userId;
        const date = civilDate(meal.date);
        return String(mealUserId) === String(profileId) && date === selectedDate;
      }),
    [meals, profileId, selectedDate],
  );

  const [draft, setDraft] = useState(() => {
    const states = {};
    enabledSlots.forEach((slot) => {
      states[slot] = slotState(ownMeal, slot);
    });
    return states;
  });

  const refresh = async (nextMonth = month) => {
    const data = await mealsApi.getMonth(groupId, nextMonth);
    setMeals(Array.from(data ?? []));
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (ex) {
      showToast({ status: "error", title: t("meals.refresh"), description: ex?.message });
    } finally {
      setRefreshing(false);
    }
  };

  const changeMonth = async (nextMonth) => {
    if (!nextMonth) return;
    setMonth(nextMonth);
    const { first } = monthRange(nextMonth);
    setSelectedDate(`${nextMonth}-${String(first.getDate()).padStart(2, "0")}`);
    await refresh(nextMonth);
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    const meal = meals.find((item) => {
      const mealUserId = item.userId?._id || item.userId?.id || item.userId;
      return String(mealUserId) === String(profileId) && civilDate(item.date) === date;
    });
    const nextDraft = {};
    enabledSlots.forEach((slot) => {
      nextDraft[slot] = slotState(meal, slot);
    });
    setDraft(nextDraft);
  };

  const setSlot = (slot, value) => {
    setDraft((current) => ({ ...current, [slot]: value }));
  };

  const save = async () => {
    if (isPastCutoff) {
      showToast({ status: "warning", title: t("meals.lockedToast", { hour: cutoffHour }) });
      return;
    }
    setSaving(true);
    try {
      await mealsApi.upsert(groupId, { date: selectedDate, slots: draft });
      await refresh(month);
      showToast({ status: "success", title: t("meals.saved") });
    } catch (error) {
      showToast({
        status: "error",
        title: t("meals.couldNotSave"),
        description: error?.response?.data?.msg || error?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOwnEntry = async () => {
    if (!ownMeal?._id || isPastCutoff) {
      showToast({
        status: ownMeal?._id ? "warning" : "info",
        title: ownMeal?._id ? t("meals.lockedToast", { hour: cutoffHour }) : t("meals.noEntry"),
      });
      return;
    }
    setDeleting(true);
    try {
      await mealsApi.deleteEntry(ownMeal._id);
      await refresh(month);
      showToast({ status: "success", title: t("meals.deleted") });
    } catch (error) {
      showToast({
        status: error?.status === 410 ? "warning" : "error",
        title: error?.status === 410 ? t("meals.gone") : t("meals.couldNotDelete"),
        description: error?.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const { days } = monthRange(month);
  const dateOptions = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return `${month}-${String(day).padStart(2, "0")}`;
  });

  const selectedCount = enabledSlots.filter((slot) => {
    const value = draft[slot];
    return value?.state === "consumed" || value?.state === "confirmed_zero";
  }).length;
  const totalPortions = enabledSlots.reduce((sum, slot) => {
    const value = draft[slot];
    return value?.state === "consumed" ? sum + Number(value.portionSubunits || 0) : sum;
  }, 0);

  const weekdayFmt = (date) =>
    new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
      weekday: "short",
      timeZone: "Asia/Dhaka",
    }).format(new Date(`${date}T12:00:00+06:00`));

  return (
    <div className="min-w-0 space-y-3">
      {/* ── Month + day rail ─────────────────────────────────── */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs)">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p)">
              <LuCalendarDays size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                {t("meals.monthlyMeals")}
              </p>
              <h2 className="truncate text-[15px] font-extrabold leading-tight text-(--tp)">
                {formatMonth(month, lang)}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="sm"
              isRound
              ariaLabel={t("meals.prevMonth")}
              onClick={() => changeMonth(addMonths(month, -1))}
            >
              <LuChevronLeft size={17} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              isRound
              ariaLabel={t("meals.nextMonth")}
              onClick={() => changeMonth(addMonths(month, 1))}
            >
              <LuChevronRight size={17} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              isRound
              ariaLabel={t("meals.refresh")}
              isLoading={refreshing}
              onClick={manualRefresh}
            >
              <LuRefreshCw size={15} />
            </Button>
          </div>
        </div>

        <div
          className="flex snap-x gap-1.5 overflow-x-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4"
          role="list"
          aria-label={t("meals.daysAria")}
        >
          {dateOptions.map((date) => {
            const active = selectedDate === date;
            const isToday = date === dhakaToday();
            return (
              <button
                key={date}
                type="button"
                role="listitem"
                onClick={() => selectDate(date)}
                aria-pressed={active}
                className={`flex min-h-[52px] w-[52px] shrink-0 snap-start flex-col items-center justify-center rounded-xl border text-center transition-colors ${active
                  ? "border-(--p) bg-(--p) text-(--bgs) shadow-sm shadow-(--p)/25"
                  : isToday
                    ? "border-(--p)/45 bg-(--pale) text-(--p)"
                    : "border-(--bd) bg-(--bgs) text-(--tm) hover:border-(--bd2)"
                  }`}
              >
                <span className="text-[10px] font-semibold uppercase leading-none opacity-80">
                  {weekdayFmt(date)}
                </span>
                <span className="mt-1 text-[15px] font-extrabold leading-none tabular-nums">
                  {n(Number(date.slice(-2)))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <SegmentedControl
        ariaLabel={t("meals.monthlyMeals")}
        value={view}
        onChange={setView}
        options={[
          { value: "today", label: t("board.today"), icon: LuUtensilsCrossed },
          { value: "grid", label: t("members.title"), icon: LuCalendarDays },
          { value: "guests", label: "Guest meals" },
          ...(canAdminMeals ? [{ value: "admin", label: t("exp.advanced") }] : []),
        ]}
      />

      {view === "today" && (
        <>
          {/* ── Slot picker ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {enabledSlots.map((slot) => {
              const value = draft[slot] || { state: "unknown" };
              const consumed = value.state === "consumed";
              const absent = value.state === "confirmed_zero";
              const portionLabel =
                PORTIONS.find((item) => item.value === value.portionSubunits)?.label || t("meals.set");
              return (
                <div
                  key={slot}
                  className={`min-w-0 rounded-2xl border bg-(--bgs) p-3 transition-colors ${consumed || absent ? "border-(--p)/45" : "border-(--bd)"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-(--tp)">{t(`meals.slot.${slot}`)}</h3>
                    {consumed && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--pale) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--p)">
                        <LuCheck size={11} /> {portionLabel}
                      </span>
                    )}
                    {absent && (
                      <span className="shrink-0 rounded-full bg-(--danger-bg) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--danger)">
                        {t("meals.absent")}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      aria-pressed={value.state === "unknown"}
                      onClick={() => setSlot(slot, { state: "unknown" })}
                      className={`min-h-11 rounded-xl border text-[13px] font-semibold transition-colors ${value.state === "unknown"
                        ? "border-(--warning) bg-(--warning-bg) text-(--warning)"
                        : "border-(--bd) text-(--ts) hover:border-(--bd2)"
                        }`}
                    >
                      {t("meals.unknown")}
                    </button>
                    <button
                      type="button"
                      aria-pressed={absent}
                      onClick={() => setSlot(slot, { state: "confirmed_zero", portionSubunits: 0 })}
                      className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border text-[13px] font-semibold transition-colors ${absent
                        ? "border-(--danger) bg-(--danger-bg) text-(--danger)"
                        : "border-(--bd) text-(--ts) hover:border-(--bd2)"
                        }`}
                    >
                      <LuMinus size={14} /> {t("meals.absent")}
                    </button>
                  </div>

                  <div
                    className="mt-1.5 grid grid-cols-4 gap-1.5"
                    role="group"
                    aria-label={t("meals.portionsAria", { slot: t(`meals.slot.${slot}`) })}
                  >
                    {PORTIONS.map((portion) => {
                      const on = consumed && value.portionSubunits === portion.value;
                      return (
                        <button
                          key={portion.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setSlot(slot, { state: "consumed", portionSubunits: portion.value })
                          }
                          className={`min-h-11 rounded-xl border text-sm font-extrabold tabular-nums transition-colors ${on
                            ? "border-(--p) bg-(--p) text-(--bgs)"
                            : "border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--p)/50 hover:text-(--p)"
                            }`}
                        >
                          {portion.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniStat label={t("meals.selectedSlots")} value={`${n(selectedCount)}/${n(enabledSlots.length)}`} />
            <MiniStat label={t("meals.totalPortions")} value={`${n(totalPortions / 1000)}×`} tone="success" />
            <MiniStat label={t("meals.entry")} value={ownMeal?._id ? t("meals.set") : "—"} />
          </div>

          {isPastCutoff && (
            <div className="flex items-start gap-2 rounded-2xl border border-(--warning)/40 bg-(--warning-bg) px-3 py-2.5 text-[12.5px] font-semibold leading-snug text-(--warning)">
              <LuLockKeyhole size={15} className="mt-px shrink-0" />
              {t("meals.lockedAfter", { hour: cutoffHour })}
            </div>
          )}

          <StickyActions>
            {ownMeal?._id && (
              <Button
                variant="danger"
                size="lg"
                isRound
                isLoading={deleting}
                isDisabled={isPastCutoff}
                ariaLabel={t("meals.deleteEntry")}
                onClick={deleteOwnEntry}
              >
                <LuTrash2 size={18} />
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              isFullWidth
              className="rounded-xl"
              isLoading={saving}
              isDisabled={isPastCutoff}
              onClick={save}
            >
              {t("meals.saveEntry")}
            </Button>
          </StickyActions>
        </>
      )}

      {view === "grid" && (
        <MealMonthGrid
          month={month}
          meals={meals}
          memberships={initialMemberships}
          enabledSlots={enabledSlots}
          profileId={profileId}
        />
      )}

      {view === "guests" && (
        <GuestMealPanel
          groupId={groupId}
          enabledSlots={enabledSlots}
          month={month}
          initialGuests={initialGuests}
        />
      )}

      {view === "admin" && canAdminMeals && (
        <SectionCard icon={LuUtensilsCrossed} title={t("exp.advanced")} subtitle={t("members.title")}>
          <AdminMealTools
            groupId={groupId}
            memberships={initialMemberships}
            enabledSlots={enabledSlots}
          />
        </SectionCard>
      )}
    </div>
  );
}
