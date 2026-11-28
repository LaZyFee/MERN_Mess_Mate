"use client";

/**
 * Month grid — every member × every day of the month.
 * Table on desktop; on mobile it stays a scrollable table with a pinned member
 * column (reading 30 columns of cards is worse than one tidy scroll).
 */
import { LuCircleHelp, LuX, LuLayoutGrid } from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import { monthRange } from "@/lib/utils/format";
import { useMoney } from "@/lib/hooks/useMoney";
import { useT } from "@/lib/i18n/LangProvider";
import { SectionCard } from "../GroupUI";

const SLOT_SHORT = {
  breakfast: "B",
  lunch: "L",
  snacks: "S",
  dinner: "D",
};

function civilDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
    new Date(value),
  );
}

function mealUserId(meal) {
  return meal?.userId?._id || meal?.userId?.id || meal?.userId;
}

function slotState(meal, slot) {
  return meal?.slots?.[slot] || meal?.[slot] || { state: "unknown" };
}

function PortionMark({ value }) {
  if (value.state === "confirmed_zero") {
    return (
      <span
        className="flex size-[18px] items-center justify-center rounded-full bg-(--danger-bg) text-(--danger)"
        title="Absent"
      >
        <LuX size={11} aria-hidden="true" />
      </span>
    );
  }
  if (value.state === "unknown") {
    return (
      <span
        className="flex size-[18px] items-center justify-center rounded-full bg-(--warning-bg) text-(--warning)"
        title="Unknown"
      >
        <LuCircleHelp size={11} aria-hidden="true" />
      </span>
    );
  }
  const fraction =
    value.portionSubunits === 250
      ? "¼"
      : value.portionSubunits === 500
        ? "½"
        : value.portionSubunits === 750
          ? "¾"
          : "1";
  return (
    <span
      className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--pale) px-1 text-[10px] font-extrabold text-(--p)"
      title={`${fraction} portion`}
    >
      {fraction}
    </span>
  );
}

export default function MealMonthGrid({
  month,
  meals,
  memberships,
  enabledSlots,
  profileId,
}) {
  const t = useT();
  const { n } = useMoney();
  const { days } = monthRange(month);
  const dateList = Array.from({ length: days }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, "0")}`,
  );
  const members = (memberships ?? []).filter(
    (membership) => membership?.userId && !membership?.endDate,
  );

  // Index meals once: `${userId}|${date}` → meal
  const index = new Map();
  (meals ?? []).forEach((meal) => {
    const id = mealUserId(meal);
    const date = civilDate(meal.date);
    if (id && date) index.set(`${id}|${date}`, meal);
  });

  const isWeekend = (date) => {
    const day = new Date(`${date}T12:00:00+06:00`).getDay();
    return day === 5 || day === 6;
  };

  return (
    <SectionCard
      icon={LuLayoutGrid}
      title={t("meals.monthlyMeals")}
      subtitle={t("members.title")}
      bodyClassName="px-0 pb-2 sm:px-0"
    >
      {members.length === 0 ? (
        <p className="px-3.5 text-sm text-(--tm)">{t("members.empty")}</p>
      ) : (
        <div
          className="overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
          role="region"
          aria-label={t("meals.daysAria")}
          tabIndex={0}
        >
          <table className="w-max border-separate border-spacing-0 text-center">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 min-w-[124px] border-b border-(--bd) bg-(--bgs) px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                  {t("stmt.member")}
                </th>
                {dateList.map((date) => (
                  <th
                    key={date}
                    className={`min-w-[34px] border-b border-(--bd) px-0.5 py-2 text-[10.5px] font-semibold tabular-nums ${isWeekend(date) ? "bg-(--bgm) text-(--tm)" : "text-(--tm)"
                      }`}
                  >
                    {n(Number(date.slice(-2)))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((membership) => {
                const user = membership.userId;
                const id = user?._id || user?.id || user;
                const name =
                  membership.displayName ||
                  user?.username ||
                  user?.name ||
                  t("members.memberFallback");
                const isOwn = String(id) === String(profileId);
                return (
                  <tr key={membership._id || id}>
                    <th
                      className={`sticky left-0 z-10 border-b border-(--bd) bg-(--bgs) px-2 py-1.5 text-left ${isOwn ? "shadow-[inset_3px_0_0_var(--p)]" : ""
                        }`}
                    >
                      <div className="flex min-h-10 items-center gap-2">
                        <Avatar name={name} size="xs" src={user?.avatar} />
                        <span
                          className={`max-w-[84px] truncate text-[12.5px] ${isOwn ? "font-bold text-(--p)" : "font-semibold text-(--tp)"
                            }`}
                        >
                          {name}
                        </span>
                      </div>
                    </th>
                    {dateList.map((date) => {
                      const meal = index.get(`${id}|${date}`);
                      return (
                        <td
                          key={date}
                          className={`border-b border-l border-(--bd) px-0.5 py-1.5 ${isWeekend(date) ? "bg-(--bgm)/40" : ""
                            }`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {enabledSlots.map((slot) => {
                              const state = slotState(meal, slot);
                              return (
                                <div
                                  key={slot}
                                  className="flex items-center gap-[2px]"
                                  title={`${SLOT_SHORT[slot]}: ${state.state}`}
                                >
                                  <span className="w-2 text-[8px] font-bold uppercase text-(--tl)">
                                    {SLOT_SHORT[slot]}
                                  </span>
                                  <PortionMark value={state} />
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-3.5 text-[10.5px] text-(--tm)">
        <li className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-(--pale) ring-1 ring-(--p)/40" /> ¼ ½ ¾ 1
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-(--warning-bg) ring-1 ring-(--warning)/40" /> {t("meals.unknown")}
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-(--danger-bg) ring-1 ring-(--danger)/40" /> {t("meals.absent")}
        </li>
      </ul>
    </SectionCard>
  );
}
