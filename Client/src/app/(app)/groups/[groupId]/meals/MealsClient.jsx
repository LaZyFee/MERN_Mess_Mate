"use client";

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
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Toast from "@/components/shared/Toast";
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
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(dhakaToday());
  const [meals, setMeals] = useState(initialMeals ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

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

  const changeMonth = async (nextMonth) => {
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
      setToast({
        type: "error",
        message: t("meals.lockedToast", { hour: cutoffHour }),
      });
      return;
    }
    setSaving(true);
    try {
      await mealsApi.upsert(groupId, { date: selectedDate, slots: draft });
      await refresh(month);
      setToast({ type: "success", message: t("meals.saved") });
    } catch (error) {
      setToast({
        type: "error",
        message: error?.response?.data?.msg || error?.message || t("meals.couldNotSave"),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOwnEntry = async () => {
    if (!ownMeal?._id || isPastCutoff) {
      setToast({
        type: "error",
        message: ownMeal?._id
          ? t("meals.lockedToast", { hour: cutoffHour })
          : t("meals.noEntry"),
      });
      return;
    }
    setDeleting(true);
    try {
      await mealsApi.deleteEntry(ownMeal._id);
      await refresh(month);
      setToast({ type: "success", message: t("meals.deleted") });
    } catch (error) {
      setToast({
        type: error?.status === 410 ? "warning" : "error",
        message: error?.status === 410
          ? t("meals.gone")
          : error?.message || t("meals.couldNotDelete"),
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

  return (
    <div className="min-w-0 space-y-4">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <Card
        header={
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--tm)">{t("meals.monthlyMeals")}</p>
              <h2 className="truncate text-lg font-bold text-(--tp)">{formatMonth(month, lang)}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="lg"
                isRound
                ariaLabel={t("meals.prevMonth")}
                onClick={() => changeMonth(addMonths(month, -1))}
              >
                <LuChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                isRound
                ariaLabel={t("meals.nextMonth")}
                onClick={() => changeMonth(addMonths(month, 1))}
              >
                <LuChevronRight size={18} />
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LuCalendarDays size={18} className="text-(--p)" />
            <Input
              type="month"
              aria-label={t("meals.mealMonth")}
              value={month}
              onChange={(event) => changeMonth(event.target.value)}
              className="min-w-0"
            />
            <Button
              variant="outline"
              size="lg"
              isRound
              ariaLabel={t("meals.refresh")}
              onClick={() => refresh()}
            >
              <LuRefreshCw size={18} />
            </Button>
          </div>

          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="list"
            aria-label={t("meals.daysAria")}
          >
            {dateOptions.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => selectDate(date)}
                className={`min-h-11 min-w-14 shrink-0 rounded-xl border px-2 text-center transition-colors ${
                  selectedDate === date
                    ? "border-(--p) bg-(--pale) text-(--p)"
                    : "border-(--bd) bg-(--bgs) text-(--tm)"
                }`}
              >
                <span className="block text-xs">
                  {new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
                    weekday: "short",
                    timeZone: "Asia/Dhaka",
                  }).format(new Date(`${date}T12:00:00+06:00`))}
                </span>
                <span className="block text-sm font-bold">{n(Number(date.slice(-2)))}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {enabledSlots.map((slot) => {
          const value = draft[slot] || { state: "unknown" };
          return (
            <Card key={slot} variant="outlined" padding="sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-(--tp)">{t(`meals.slot.${slot}`)}</h3>
                  {value.state === "consumed" && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-(--p)">
                      <LuCheck size={14} />
                      {PORTIONS.find((item) => item.value === value.portionSubunits)?.label || t("meals.set")}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={value.state === "unknown" ? "primary" : "outline"}
                    size="lg"
                    onClick={() => setSlot(slot, { state: "unknown" })}
                  >
                    {t("meals.unknown")}
                  </Button>
                  <Button
                    variant={value.state === "confirmed_zero" ? "secondary" : "outline"}
                    size="lg"
                    leftIcon={<LuMinus size={16} />}
                    onClick={() => setSlot(slot, { state: "confirmed_zero", portionSubunits: 0 })}
                  >
                    {t("meals.absent")}
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-1" aria-label={t("meals.portionsAria", { slot: t(`meals.slot.${slot}`) })}>
                  {PORTIONS.map((portion) => (
                    <button
                      key={portion.value}
                      type="button"
                      onClick={() =>
                        setSlot(slot, {
                          state: "consumed",
                          portionSubunits: portion.value,
                        })
                      }
                      className={`min-h-11 rounded-lg border text-sm font-bold transition-colors ${
                        value.state === "consumed" && value.portionSubunits === portion.value
                          ? "border-(--p) bg-(--p) text-(--bgs)"
                          : "border-(--bd) bg-(--bgs) text-(--ts)"
                      }`}
                    >
                      {portion.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <MealMonthGrid
        month={month}
        meals={meals}
        memberships={initialMemberships}
        enabledSlots={enabledSlots}
        profileId={profileId}
      />

      {isPastCutoff && (
        <div className="flex min-h-11 items-center gap-2 rounded-xl border border-(--warning)/30 bg-(--warning)/10 px-3 text-sm font-semibold text-(--warning)">
          <LuLockKeyhole size={16} />
          {t("meals.lockedAfter", { hour: cutoffHour })}
        </div>
      )}

      {canAdminMeals && (
        <AdminMealTools
          groupId={groupId}
          memberships={initialMemberships}
          enabledSlots={enabledSlots}
        />
      )}

      <GuestMealPanel
        groupId={groupId}
        enabledSlots={enabledSlots}
        month={month}
        initialGuests={initialGuests}
      />

      <div className="sticky bottom-3 z-20 rounded-2xl border border-(--bd) bg-(--gl) p-2 shadow-lg backdrop-blur-md">
        <div className="flex gap-2">
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
            isLoading={saving}
            isDisabled={isPastCutoff}
            onClick={save}
          >
            {t("meals.saveEntry")}
          </Button>
        </div>
      </div>
    </div>
  );
}
