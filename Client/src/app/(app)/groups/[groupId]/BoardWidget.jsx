"use client";

import { useState } from "react";
import {
  LuChefHat,
  LuCheck,
  LuClipboardList,
  LuPin,
  LuRefreshCw,
  LuUsers,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";

function taskLabel(duty) {
  return duty?.area || duty?.task || duty?.title || duty?.dutyType || "Duty";
}

function DutyRow({ groupId, duty, onDone, canAct }) {
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
    <li className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-(--bgs) px-2 py-1.5">
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-(--tp)">{taskLabel(duty)}</span>
        <span className="block truncate text-[11px] text-(--tm)">
          {duty?.membershipName || duty?.displayName || duty?.assignedTo?.displayName || "Unassigned"}
        </span>
      </span>
      {done ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-(--success)">
          <LuCheck size={12} /> Done
        </span>
      ) : (
        canAct && (
          <Button size="sm" variant="outline" isLoading={busy} isDisabled={busy} onClick={markDone}>
            Done
          </Button>
        )
      )}
    </li>
  );
}

/**
 * Today's board — duties, menu, pinned notes and active hand-overs (P9.1).
 * Server-rendered initial data; refresh re-reads /routines/.../board/today.
 */
export default function BoardWidget({ groupId, initialBoard, canAct = true }) {
  const { showToast } = useToast();
  const [board, setBoard] = useState(initialBoard);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await routinesApi.boardToday(groupId);
      setBoard(data);
    } catch (ex) {
      showToast({ status: "error", title: "Could not refresh board", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  };

  const duties = board?.duties || [];
  const menu = board?.menu;
  const pinned = board?.pinnedNotes || [];
  const handovers = board?.activeHandovers || [];

  if (!board) {
    return (
      <Card padding="md" variant="outlined">
        <p className="text-xs text-(--tm)">Routine board is not available for this group yet.</p>
      </Card>
    );
  }

  return (
    <Card
      padding="md"
      className="min-w-0"
      header={
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
            <LuClipboardList size={16} className="text-(--p)" /> Today
          </h2>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-(--tm)">{board.date ? formatDay(board.date) : ""}</span>
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh board" isLoading={loading} onClick={refresh}>
              <LuRefreshCw size={14} />
            </Button>
          </div>
        </div>
      }
    >
      {handovers.length > 0 && (
        <div className="mb-3 rounded-lg border border-(--warning) bg-(--warning-bg) px-2 py-1.5">
          <p className="flex items-center gap-1 text-[11px] font-bold text-(--warning)">
            <LuUsers size={12} /> Hand-over active
          </p>
          <p className="text-[11px] text-(--warning)">{handovers.length} hand-over note(s) awaiting action</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">Duties</p>
          {duties.length === 0 ? (
            <p className="text-xs text-(--tm)">No duties scheduled today.</p>
          ) : (
            <ul className="space-y-1">
              {duties.map((duty) => (
                <DutyRow key={duty._id} groupId={groupId} duty={duty} onDone={refresh} canAct={canAct} />
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
            <LuChefHat size={12} /> Today&apos;s menu
          </p>
          {!menu ? (
            <p className="text-xs text-(--tm)">No menu planned.</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-(--ts)">
              {["breakfast", "lunch", "snacks", "dinner"].map((slot) => (
                <li key={slot} className="truncate capitalize">
                  <span className="text-(--tm)">{slot}: </span>
                  {menu[slot] || menu.slots?.[slot] || "—"}
                </li>
              ))}
              {menu.cook && (
                <li className="truncate text-[11px] text-(--tm)">
                  Cook: {menu.cook.displayName || menu.cook}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="mt-3 border-t border-(--bd) pt-2">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
            <LuPin size={12} /> Pinned notes
          </p>
          <ul className="space-y-1">
            {pinned.slice(0, 3).map((note) => (
              <li key={note._id} className="truncate text-xs text-(--ts)">
                {note.title || note.body}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
