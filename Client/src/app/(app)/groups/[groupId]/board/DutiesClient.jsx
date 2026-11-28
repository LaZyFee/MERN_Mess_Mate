"use client";

/**
 * Duties calendar — agenda grouped by day, mark-done and swap requests.
 * Mobile-first: single column agenda; desktop keeps two columns. Every action
 * is a thumb-sized control on the row itself.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuCalendarCheck,
  LuCheckCheck,
  LuChevronLeft,
  LuChevronRight,
  LuRefreshCw,
  LuRepeat,
  LuScale,
  LuShuffle,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Progress from "@/components/shared/Progress";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatDay, toMonthString, addMonths, monthRange } from "@/lib/utils/format";
import { useMoney } from "@/lib/hooks/useMoney";
import { useT } from "@/lib/i18n/LangProvider";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { EmptyState, SectionCard } from "../GroupUI";
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

export default function DutiesClient({ groupId, memberships = [] }) {
  const t = useT();
  const { fmt, lang } = useMoney();
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
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

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
      showToast({ status: "success", title: t("board.markDone") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "success", title: target ? t("board.swap") : t("board.swap") });
      setSwapFor(null);
      setTarget("");
      setReason("");
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const respond = async (swap, accept) => {
    setBusy(swap._id);
    try {
      await routinesApi.respondSwap(groupId, swap._id, accept);
      setSwaps((prev) => prev.filter((row) => row._id !== swap._id));
      showToast({ status: accept ? "success" : "info", title: t("board.swap") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const { byDay, days } = useMemo(() => {
    const { days: count } = monthRange(month);
    const grouped = {};
    duties.forEach((duty) => {
      const day = duty.localDate;
      if (!day || !day.startsWith(month)) return;
      grouped[day] = grouped[day] || [];
      grouped[day].push(duty);
    });
    return { byDay: grouped, days: count };
  }, [duties, month]);

  const dayKeys = Object.keys(byDay).sort();
  const pendingForMe = swaps.filter((swap) => swap.status === "pending");
  const totalDone = duties.filter((duty) => duty.status === "done").length;
  const pct = duties.length ? Math.round((totalDone / duties.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <SectionCard
        icon={LuCalendarCheck}
        title={t("board.duties")}
        subtitle={`${totalDone}/${duties.length} · ${days}`}
        actions={
          <>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("stmt.prev")} onClick={() => setMonth(addMonths(month, -1))}>
              <LuChevronLeft size={16} />
            </Button>
            <span className="min-w-[86px] text-center text-[11.5px] font-bold text-(--ts)">
              {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </span>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("stmt.next")} onClick={() => setMonth(addMonths(month, 1))}>
              <LuChevronRight size={16} />
            </Button>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
          </>
        }
      >
        {loading ? (
          <div className="space-y-2">
            <Skeleton variant="rect" height={64} className="rounded-xl" />
            <Skeleton variant="rect" height={64} className="rounded-xl" />
          </div>
        ) : dayKeys.length === 0 ? (
          <EmptyState icon={LuCheckCheck} title={t("board.noDuties")} body={t("board.rosters")} />
        ) : (
          <>
            <div className="mb-2.5 flex items-center gap-2">
              <Progress value={pct} colorScheme="primary" size="sm" />
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-(--tm)">{pct}%</span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {dayKeys.map((day) => (
                <div key={day} className="min-w-0 rounded-2xl border border-(--bd) p-2">
                  <p className="mb-1 px-0.5 text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                    {formatDay(day, lang)}
                  </p>
                  <ul className="list-none space-y-1">
                    {byDay[day].map((duty) => {
                      const done = duty.status === "done";
                      return (
                        <li
                          key={duty._id}
                          className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-(--bgm) px-2 py-1"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-(--tp)">{dutyAreaLabel(duty)}</span>
                            <span className="block truncate text-[11px] text-(--tm)">{memberLabel(duty)}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-0.5">
                            <StatusBadge config={DUTY_CONFIG} status={duty.status || "scheduled"} size="sm" />
                            {!done && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  isRound
                                  ariaLabel={t("board.markDone")}
                                  isLoading={busy === duty._id}
                                  onClick={() => markDone(duty)}
                                >
                                  <LuCheckCheck size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  isRound
                                  ariaLabel={t("board.swap")}
                                  onClick={() => setSwapFor(duty)}
                                >
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
      </SectionCard>

      <SectionCard icon={LuShuffle} title={t("board.swap")} subtitle={`${pendingForMe.length}`}>
        {pendingForMe.length === 0 ? (
          <p className="rounded-xl bg-(--bgm) px-3 py-2.5 text-xs text-(--tm)">{t("board.swap")} — {t("board.noDuties")}</p>
        ) : (
          <ul className="list-none space-y-2">
            {pendingForMe.map((swap) => (
              <li key={swap._id} className="rounded-xl border border-(--bd) p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-(--tp)">
                    {swap.assignmentId?.area || swap.assignmentId?.taskKey || t("board.duties")} ·{" "}
                    {formatDay(swap.assignmentId?.localDate || "", lang)}
                  </p>
                  <p className="truncate text-[11px] text-(--tm)">{swap.reason || "—"}</p>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <StatusBadge
                    status="pending"
                    config={{ pending: { variant: "warning", label: swapState(swap.status) } }}
                  />
                  <Button size="sm" className="rounded-lg" isLoading={busy === swap._id} onClick={() => respond(swap, true)}>
                    {t("shell.confirm")}
                  </Button>
                  <Button size="sm" className="rounded-lg" variant="outline" isDisabled={busy === swap._id} onClick={() => respond(swap, false)}>
                    {t("shell.cancel")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {fairness && (
        <SectionCard icon={LuScale} title={t("board.fairness")}>
          {fairness.fairness && (
            <p className="mb-2 text-[11px] text-(--tm)">
              {String(fairness.fairness.level || "balanced").replace(/_/g, " ")}
              {" · Gini "}
              <span className="tabular-nums">{Number(fairness.fairness.gini ?? 0).toFixed(2)}</span>
              {" · "}
              {fairness.totalUnits ?? 0}
            </p>
          )}
          <ul className="list-none grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(fairness.board || fairness.members || fairness.rows || []).map((row, index) => (
              <li key={row.membershipId || index} className="rounded-xl bg-(--bgm) px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-(--ts)">{memberLabel(row)}</span>
                  <span className="shrink-0 font-bold tabular-nums text-(--tp)">
                    {row.weightedUnits != null ? `${row.weightedUnits} u` : row.count ?? row.duties ?? 0}
                  </span>
                </div>
                {row.sharePct != null && (
                  <div className="mt-1">
                    <Progress value={Math.min(100, row.sharePct)} colorScheme={row.balance < 0 ? "warning" : "primary"} size="sm" />
                    <p className="mt-0.5 text-[10px] text-(--tm)">
                      {row.sharePct}% (fair {row.fairSharePct}%)
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Modal
        isOpen={Boolean(swapFor)}
        onClose={() => setSwapFor(null)}
        header={t("board.swap")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setSwapFor(null)} isDisabled={busy === "swap"}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" isLoading={busy === "swap"} isDisabled={busy === "swap"} onClick={requestSwap}>
              {t("shell.confirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="rounded-xl bg-(--bgm) px-3 py-2 text-xs leading-relaxed text-(--tm)">
            {dutyAreaLabel(swapFor)}
            {swapFor?.localDate ? ` · ${formatDay(swapFor.localDate, lang)}` : ""}
            {swapFor?.estCostPoisha ? ` · ~${fmt(swapFor.estCostPoisha)}` : ""}
          </p>
          <Select
            size="lg"
            label={t("money.toMember")}
            options={[
              { value: "", label: t("exp.everyone") },
              ...memberships.map((m) => ({ value: m._id, label: memberLabel(m) })),
            ]}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <Input
            size="lg"
            label={t("exp.reasonOptional")}
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
