"use client";

/**
 * Guest meals — add a visitor's meal for a date/slot and list the month's guests.
 * Mobile-first: the form is a single stacked sheet; toasts go through the shared
 * provider (no inline alerts).
 */
import { useEffect, useRef, useState } from "react";
import { LuUserPlus, LuUsers } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import RadioGroup from "@/components/shared/RadioGroup";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { mealsApi } from "@/lib/api/meals";
import { dhakaToday, monthRange } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState, SectionCard } from "../GroupUI";

const PORTIONS = [
  { value: "250", label: "¼" },
  { value: "500", label: "½" },
  { value: "750", label: "¾" },
  { value: "1000", label: "1" },
];

export default function GuestMealPanel({
  groupId,
  enabledSlots,
  month,
  initialGuests,
}) {
  const t = useT();
  const { n } = useMoney();
  const { showToast } = useToast();
  const [guests, setGuests] = useState(initialGuests ?? []);
  const [saving, setSaving] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
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
    }).catch(() => { });
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
    setMoreCursor(Array.isArray(data) ? null : data?.nextCursor || null);
  };

  const monthBounds = (monthValue) => {
    const { last } = monthRange(monthValue);
    return { from: `${monthValue}-01`, to: `${monthValue}-${String(last.getDate()).padStart(2, "0")}` };
  };

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const { from, to } = monthBounds(month);
      const data = await mealsApi.getGuests(groupId, from, to, moreCursor);
      const next = data?.guests || [];
      setGuests((current) => {
        const seen = new Set(current.map((g) => g._id));
        return [...current, ...next.filter((g) => !seen.has(g._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.message });
    } finally {
      setLoadingMore(false);
    }
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
      setForm((current) => ({ ...current, guestName: "", eventPoolRef: "" }));
      showToast({ status: "success", title: t("board.menu") });
    } catch (error) {
      showToast({
        status: "error",
        title: t("shell.error"),
        description: error?.message || error?.data?.msg,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <SectionCard icon={LuUserPlus} title={t("members.add")} subtitle="Guest meal">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            size="lg"
            label="Guest name"
            value={form.guestName}
            onChange={(event) => update("guestName", event.target.value)}
            placeholder={t("shell.optional")}
          />
          <Input
            size="lg"
            type="date"
            label={t("exp.date")}
            value={form.date}
            onChange={(event) => update("date", event.target.value)}
          />
          <Select
            size="lg"
            label={t("meals.mealMonth")}
            value={form.slot}
            options={enabledSlots.map((slot) => ({
              value: slot,
              label: t(`meals.slot.${slot}`),
            }))}
            onChange={(event) => update("slot", event.target.value)}
          />
          <Input
            size="lg"
            label="Event pool"
            value={form.eventPoolRef}
            onChange={(event) => update("eventPoolRef", event.target.value)}
            placeholder={t("shell.optional")}
          />
        </div>

        <div className="mt-3 space-y-3">
          <RadioGroup
            name="guest-portion"
            label={t("meals.totalPortions")}
            value={form.portionSubunits}
            size="lg"
            orientation="horizontal"
            options={PORTIONS}
            onChange={(event) => update("portionSubunits", event.target.value)}
          />
          <RadioGroup
            name="guest-pool"
            label={t("money.kind")}
            value={form.poolMode}
            size="md"
            orientation="vertical"
            options={[
              { value: "individual", label: "Individual — host pays" },
              { value: "universal", label: "Universal — shared pool" },
            ]}
            onChange={(event) => update("poolMode", event.target.value)}
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          isFullWidth
          className="mt-3 rounded-xl"
          isLoading={saving}
          onClick={submit}
        >
          {t("members.add")}
        </Button>
      </SectionCard>

      <SectionCard
        icon={LuUsers}
        title="Guest meals"
        subtitle={`${n(guests.length)} ${t("meals.entry")}`}
      >
        {guests.length === 0 ? (
          <EmptyState icon={LuUsers} title={t("shell.noResults")} body="No guest meals in this month." />
        ) : (
          <div className="space-y-2">
            {guests.map((guest) => (
              <div
                key={guest._id}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-(--bd) bg-(--bgs) px-3 py-2"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--pale) text-sm font-extrabold text-(--p)">
                  {n(
                    PORTIONS.find((item) => item.value === String(guest.portionSubunits))?.value
                      ? Number(guest.portionSubunits) / 1000
                      : guest.portionSubunits / 1000,
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-(--tp)">
                    {guest.guestName || "Guest"}
                  </p>
                  <p className="truncate text-[11px] text-(--tm)">
                    {guest.localDate} · {t(`meals.slot.${guest.slot}`)} · {guest.poolMode}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-(--bgm) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--ts)">
                  {PORTIONS.find((item) => item.value === String(guest.portionSubunits))?.label ||
                    `${guest.portionSubunits / 1000}`}
                </span>
              </div>
            ))}
            {moreCursor && (
              <Button variant="outline" size="md" isFullWidth isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
                {t("shell.loadMore")}
              </Button>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
