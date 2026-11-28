"use client";

/**
 * Today's board — duties, menu, pinned notes and active hand-overs.
 * Server-rendered initial data; refresh re-reads /routines/.../board/today.
 * Mobile: one column of "chips"; desktop: two columns.
 */
import { useState } from "react";
import Link from "next/link";
import {
  LuChefHat,
  LuCheck,
  LuClipboardList,
  LuPin,
  LuRefreshCw,
  LuUsers,
  LuArrowRight,
  LuCalendarCheck,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const SLOTS = ["breakfast", "lunch", "snacks", "dinner"];

function taskLabel(duty) {
  return duty?.area || duty?.task || duty?.title || duty?.dutyType || "Duty";
}

function DutyRow({ groupId, duty, onDone, canAct, markLabel, doneLabel }) {
  const [busy, setBusy] = useState(false);
  const done = duty?.state === "done" || duty?.status === "done" || Boolean(duty?.completedAt);

  const markDone = async () => {
    setBusy(true);
    try {
      await routinesApi.markDutyDone(groupId, duty._id);
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-(--bd) bg-(--bgs) px-2.5 py-1.5">
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-(--tp)">{taskLabel(duty)}</span>
        <span className="block truncate text-[11px] text-(--tm)">
          {duty?.membershipName || duty?.displayName || duty?.assignedTo?.displayName || "—"}
        </span>
      </span>
      {done ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--success-bg) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--success)">
          <LuCheck size={11} /> {doneLabel}
        </span>
      ) : (
        canAct && (
          <Button
            size="sm"
            variant="outline"
            isLoading={busy}
            isDisabled={busy}
            onClick={markDone}
            className="shrink-0 rounded-full !px-3"
          >
            {markLabel}
          </Button>
        )
      )}
    </li>
  );
}

export default function BoardWidget({ groupId, initialBoard, canAct = true }) {
  const t = useT();
  const { lang } = useMoney();
  const { showToast } = useToast();
  const [board, setBoard] = useState(initialBoard);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await routinesApi.boardToday(groupId);
      setBoard(data);
    } catch (ex) {
      showToast({ status: "error", title: t("overview.couldNotRefresh"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  };

  const duties = board?.duties || [];
  const menu = board?.menu;
  const pinned = board?.pinnedNotes || [];
  const handovers = board?.activeHandovers || [];

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs)">
      <header className="flex items-center justify-between gap-2 border-b border-(--bd) px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p)">
            <LuClipboardList size={14} />
          </span>
          <h2 className="truncate text-sm font-bold text-(--tp)">{t("board.today")}</h2>
          {board?.date && (
            <span className="shrink-0 rounded-full bg-(--bgm) px-2 py-0.5 text-[10px] font-semibold text-(--tm)">
              {formatDay(board.date, lang)}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href={`/groups/${groupId}/board`}
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-[11.5px] font-semibold text-(--p) no-underline hover:bg-(--pale)"
          >
            {t("shell.more")} <LuArrowRight size={12} />
          </Link>
          <Button
            size="sm"
            variant="ghost"
            isRound
            ariaLabel={t("shell.refresh")}
            isLoading={loading}
            onClick={refresh}
          >
            <LuRefreshCw size={14} />
          </Button>
        </div>
      </header>

      {!board ? (
        <p className="px-3.5 py-4 text-xs text-(--tm)">{t("board.noDuties")}</p>
      ) : (
        <div className="space-y-3 px-3.5 py-3 sm:px-4">
          {handovers.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-(--warning)/40 bg-(--warning-bg) px-2.5 py-2">
              <LuUsers size={13} className="mt-0.5 shrink-0 text-(--warning)" />
              <p className="min-w-0 text-[11px] font-semibold leading-snug text-(--warning)">
                {t("board.handover")} ·{" "}
                {handovers.length} {t("board.notes")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                <LuCalendarCheck size={11} /> {t("board.duties")}
              </p>
              {duties.length === 0 ? (
                <p className="rounded-xl bg-(--bgm) px-2.5 py-2 text-xs text-(--tm)">{t("board.noDuties")}</p>
              ) : (
                <ul className="space-y-1">
                  {duties.map((duty) => (
                    <DutyRow
                      key={duty._id}
                      groupId={groupId}
                      duty={duty}
                      onDone={refresh}
                      canAct={canAct}
                      markLabel={t("board.markDone")}
                      doneLabel={t("board.dutyStatus.done")}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="min-w-0">
              <p className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                <LuChefHat size={11} /> {t("board.menu")}
              </p>
              {!menu ? (
                <p className="rounded-xl bg-(--bgm) px-2.5 py-2 text-xs text-(--tm)">{t("board.noMenu")}</p>
              ) : (
                <ul className="space-y-1">
                  {SLOTS.map((slot) => {
                    const value = menu[slot] || menu.slots?.[slot];
                    if (!value) return null;
                    return (
                      <li
                        key={slot}
                        className="flex min-h-9 items-center gap-2 rounded-xl bg-(--bgm) px-2.5 text-xs"
                      >
                        <span className="shrink-0 font-bold text-(--tm)">{t(`meals.slot.${slot}`)}</span>
                        <span className="min-w-0 truncate text-(--ts)">{value}</span>
                      </li>
                    );
                  })}
                  {menu.cook && (
                    <li className="px-1 pt-0.5 text-[11px] text-(--tm)">
                      {t("board.cook")}: {menu.cook.displayName || menu.cook}
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {pinned.length > 0 && (
            <div className="border-t border-(--bd) pt-2">
              <p className="mb-1 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                <LuPin size={11} /> {t("board.pinnedNotes")}
              </p>
              <ul className="space-y-0.5">
                {pinned.slice(0, 3).map((note) => (
                  <li key={note._id} className="truncate text-xs text-(--ts)">
                    · {note.title || note.body}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
