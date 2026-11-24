"use client";

import { LuCircleHelp, LuX } from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import Card from "@/components/shared/Card";
import { monthRange } from "@/lib/utils/format";

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
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-(--danger)/10 text-(--danger)" title="Absent">
        <LuX size={12} aria-hidden="true" />
      </span>
    );
  }
  if (value.state === "unknown") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-(--warning)/10 text-(--warning)" title="Unknown">
        <LuCircleHelp size={12} aria-hidden="true" />
      </span>
    );
  }
  const fraction =
    value.portionSubunits === 250
      ? "1/4"
      : value.portionSubunits === 500
        ? "1/2"
        : value.portionSubunits === 750
          ? "3/4"
          : "1";
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-(--pale) px-1 text-[10px] font-bold text-(--p)" title={`${fraction} portion`}>
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
  const { days } = monthRange(month);
  const dateList = Array.from({ length: days }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, "0")}`,
  );
  const members = (memberships ?? []).filter(
    (membership) => membership?.userId && !membership?.endDate,
  );

  return (
    <Card
      variant="outlined"
      header={
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-(--tm)">Month grid</p>
          <h2 className="text-lg font-bold text-(--tp)">Member meal states</h2>
        </div>
      }
    >
      {members.length === 0 ? (
        <p className="text-sm text-(--tm)">No active members to display.</p>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="Member meal month grid" tabIndex={0}>
          <table className="w-max border-separate border-spacing-0 text-center">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-36 border-b border-(--bd) bg-(--bgs) px-3 py-2 text-left text-xs text-(--tm)">
                  Member
                </th>
                {dateList.map((date) => (
                  <th key={date} className="min-w-16 border-b border-(--bd) px-1 py-2 text-xs text-(--tm)">
                    {Number(date.slice(-2))}
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
                  "Member";
                const isOwn = String(id) === String(profileId);
                return (
                  <tr key={membership._id || id}>
                    <th className="sticky left-0 z-10 border-b border-(--bd) bg-(--bgs) px-2 py-2 text-left">
                      <div className="flex min-h-11 items-center gap-2">
                        <Avatar name={name} size="sm" src={user?.avatar} />
                        <span className={`max-w-24 truncate text-sm ${isOwn ? "font-bold text-(--p)" : "font-semibold text-(--tp)"}`}>
                          {name}
                        </span>
                      </div>
                    </th>
                    {dateList.map((date) => {
                      const meal = meals.find(
                        (item) =>
                          String(mealUserId(item)) === String(id) &&
                          civilDate(item.date) === date,
                      );
                      return (
                        <td key={date} className="border-b border-l border-(--bd) px-1 py-2">
                          <div className="flex flex-col items-center gap-1">
                            {enabledSlots.map((slot) => (
                              <div key={slot} className="flex items-center gap-1" title={`${SLOT_SHORT[slot]}: ${slotState(meal, slot).state}`}>
                                <span className="w-3 text-[9px] font-bold text-(--tm)">
                                  {SLOT_SHORT[slot]}
                                </span>
                                <PortionMark value={slotState(meal, slot)} />
                              </div>
                            ))}
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
    </Card>
  );
}
