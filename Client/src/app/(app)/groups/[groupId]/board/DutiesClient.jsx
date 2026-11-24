"use client";

/**
 * T9.2 — Duties calendar / agenda with mark-done and swap requests.
 * Mobile renders a grouped agenda; desktop shows the same data as a grid.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuCheckCheck, LuChevronLeft, LuChevronRight, LuRefreshCw, LuRepeat } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatDay, formatPoisha, toMonthString, addMonths, monthRange } from "@/lib/utils/format";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { dutyAreaLabel, memberLabel } from "./boardHelpers";

const DUTY_CONFIG = {
  scheduled: { variant: "info", label: "Scheduled" },
  done: { variant: "success", label: "Done" },
  swapped: { variant: "subtle", label: "Swapped" },
  skipped: { variant: "secondary", label: "Skipped" },
  missed: { variant: "danger", label: "Missed" },
  cancelled: { variant: "secondary", label: "Cancelled" },
};

function swapState(status) {
  if (status === "accepted") return "resolved";
  if (status === "declined" || status === "cancelled") return "closed";
  return "pending";
}

function dutiesInMonth(duties, month) {
  const { days } = monthRange(month);
  const byDay = {};
  duties.forEach((duty) => {
    const day = duty.localDate;
    if (!day || !day.startsWith(month)) return;
    byDay[day] = byDay[day] || [];
    byDay[day].push(duty);
  });
  return { byDay, days };
}

export default function DutiesClient({ groupId, memberships = [] }) {
  const { showToast } = useToast();
  const [month, setMonth] = useState(() => toMonthString(new Date()));
  const [duties, setDuties] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [swapFor, setSwapFor] = useState(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [fairness, setFairness] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dutyData, fairnessData] = await Promise.all([
        routinesApi.duties(groupId),
        routinesApi.dutyFairness(groupId).catch(() => null),
      ]);
      setDuties(dutyData?.duties || []);
      setFairness(fairnessData || null);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load duties", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    load();
    return onRealtime((event) => {
      if (event === "duty-updated" || event === "roster-published") load();
    });
  }, [load]);

  const markDone = async (duty) => {
    setBusy(duty._id);
    try {
      await routinesApi.markDutyDone(groupId, duty._id);
      showToast({ status: "success", title: "Duty marked done" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not update duty", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const requestSwap = async () => {
    if (!swapFor) return;
    setBusy("swap");
    try {
      await routinesApi.swaps(groupId, {
        assignmentId: swapFor._id,
        toMembershipId: target || undefined,
        reason: reason.trim() || undefined,
      });
      showToast({ status: "success", title: target ? "Swap request sent" : "Open swap offer posted" });
      setSwapFor(null);
      setTarget("");
      setReason("");
    } catch (ex) {
      showToast({ status: "error", title: "Could not create swap", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const respond = async (swap, accept) => {
    setBusy(swap._id);
    try {
      await routinesApi.respondSwap(groupId, swap._id, accept);
      setSwaps((prev) => prev.filter((row) => row._id !== swap._id));
      showToast({ status: accept ? "success" : "info", title: accept ? "Swap accepted" : "Swap declined" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not respond", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const { byDay, days } = useMemo(() => dutiesInMonth(duties, month), [duties, month]);
  const dayKeys = Object.keys(byDay).sort();
  const pendingForMe = swaps.filter((swap) => swap.status === "pending");
  const totalDone = duties.filter((duty) => duty.status === "done").length;

  return (
    <div className="flex flex-col gap-4">
      <Card
        padding="md"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-(--tp)">Duties</h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" isRound ariaLabel="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
                <LuChevronLeft size={16} />
              </Button>
              <span className="min-w-24 text-center text-xs font-semibold text-(--ts)">
                {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
              <Button size="sm" variant="ghost" isRound ariaLabel="Next month" onClick={() => setMonth(addMonths(month, 1))}>
                <LuChevronRight size={16} />
              </Button>
              <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
                <LuRefreshCw size={14} />
              </Button>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-2">
            <Skeleton variant="rect" height={64} />
            <Skeleton variant="rect" height={64} />
          </div>
        ) : dayKeys.length === 0 ? (
          <div className="py-8 text-center">
            <LuCheckCheck size={24} className="mx-auto mb-2 text-(--tl)" />
            <p className="text-sm font-semibold text-(--tp)">No duties scheduled this month</p>
            <p className="mt-1 text-xs text-(--tm)">A manager can publish a roster to generate duties.</p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-(--tm)">
              {totalDone} of {duties.length} duties done · {days} days in month
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {dayKeys.map((day) => (
                <div key={day} className="rounded-lg border border-(--bd) bg-(--bgs) p-2">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{formatDay(day)}</p>
                  <ul className="list-none space-y-1">
                    {byDay[day].map((duty) => {
                      const done = duty.status === "done";
                      return (
                        <li key={duty._id} className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-(--bgm) px-2 py-1">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-(--tp)">{dutyAreaLabel(duty)}</span>
                            <span className="block truncate text-[11px] text-(--tm)">{memberLabel(duty)}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <StatusBadge
                              config={DUTY_CONFIG}
                              status={duty.status || "scheduled"}
                              size="sm"
                            />
                            {!done && (
                              <>
                                <Button size="sm" variant="ghost" isRound ariaLabel="Mark done" isLoading={busy === duty._id} onClick={() => markDone(duty)}>
                                  <LuCheckCheck size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" isRound ariaLabel="Request swap" onClick={() => setSwapFor(duty)}>
                                  <LuRepeat size={14} />
                                </Button>
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card padding="md" header={<h2 className="text-sm font-bold text-(--tp)">Swap requests</h2>}>
        {pendingForMe.length === 0 ? (
          <p className="text-xs text-(--tm)">No open swap requests. Use the swap icon on a duty to offer it to a co-member.</p>
        ) : (
          <ul className="list-none space-y-2">
            {pendingForMe.map((swap) => (
              <li key={swap._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--bd) p-2">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-(--tp)">
                    {swap.assignmentId?.area || swap.assignmentId?.taskKey || "Duty"} · {formatDay(swap.assignmentId?.localDate || "")}
                  </span>
                  <span className="block truncate text-[11px] text-(--tm)">
                    {swap.reason || "No reason given"}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <StatusBadge
                    status="pending"
                    config={{
                      pending: { variant: "warning", label: swapState(swap.status) },
                    }}
                  />
                  <Button size="sm" isLoading={busy === swap._id} onClick={() => respond(swap, true)}>Accept</Button>
                  <Button size="sm" variant="outline" isDisabled={busy === swap._id} onClick={() => respond(swap, false)}>Decline</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {fairness && (
        <Card padding="md" header={<h2 className="text-sm font-bold text-(--tp)">Fairness</h2>}>
          <ul className="list-none grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(fairness.members || fairness.rows || []).map((row, index) => (
              <li key={row.membershipId || index} className="flex items-center justify-between rounded-md bg-(--bgm) px-2 py-1 text-xs">
                <span className="min-w-0 truncate text-(--ts)">{memberLabel(row)}</span>
                <span className="shrink-0 font-bold tabular-nums text-(--tp)">{row.count ?? row.duties ?? 0}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        isOpen={Boolean(swapFor)}
        onClose={() => setSwapFor(null)}
        header="Request a swap"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSwapFor(null)} isDisabled={busy === "swap"}>Cancel</Button>
            <Button isLoading={busy === "swap"} isDisabled={busy === "swap"} onClick={requestSwap}>Send request</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-(--tm)">
            Duty: <span className="font-semibold text-(--ts)">{dutyAreaLabel(swapFor)}</span>
            {swapFor?.localDate ? ` · ${formatDay(swapFor.localDate)}` : ""}
            {swapFor?.estCostPoisha ? ` · ~${formatPoisha(swapFor.estCostPoisha)}` : ""}
          </p>
          <Select
            size="lg"
            label="Swap with"
            options={[{ value: "", label: "Open offer (anyone can take it)" }, ...memberships.map((m) => ({ value: m._id, label: memberLabel(m) }))]}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Input size="lg" label="Reason (optional)" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
