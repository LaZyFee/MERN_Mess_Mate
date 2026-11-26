"use client";

/**
 * T14.8 — Operations health card for the admin overview (`GET /admin/health`).
 * Shows stuck work only: stale jobs, outbox depth, open reconciliation variance,
 * receipt scans and expired job locks. Nothing here contains user data.
 */
import { useCallback, useEffect, useState } from "react";
import { LuRefreshCw, LuHeartPulse, LuTriangleAlert } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { adminApi } from "@/lib/api/admin";

const Row = ({ label, value, warn = false }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg border border-(--bd) bg-(--bgs) px-3 py-2">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-(--tm)">{label}</span>
    <span className={`text-sm font-bold tabular-nums ${warn ? "text-(--danger)" : "text-(--tp)"}`}>{value}</span>
  </div>
);

export default function AdminHealthPanel({ initialHealth = null }) {
  const { showToast } = useToast();
  const [health, setHealth] = useState(initialHealth);
  const [loading, setLoading] = useState(!initialHealth);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await adminApi.health());
    } catch (ex) {
      showToast({ status: "error", title: "Could not load health", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!initialHealth) load();
  }, [initialHealth, load]);

  const jobs = health?.jobs || {};
  const outbox = health?.outbox || {};
  const reconciliation = health?.reconciliation || {};
  const scans = health?.scans || {};
  const scheduler = health?.scheduler || {};
  const heldLocks = (health?.locks || []).filter((l) => l.held);

  return (
    <Card
      variant="outlined"
      padding="md"
      header={
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-(--tp)">
            <LuHeartPulse size={15} /> Operations health
          </span>
          <Button size="sm" variant="ghost" isRound ariaLabel="Refresh health" isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        </div>
      }
    >
      {loading && !health ? (
        <Skeleton variant="rect" height={160} />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Scheduler" value={scheduler.running ? `running · ${scheduler.staleMinutes ?? 0}m` : "stopped"} warn={!scheduler.running} />
          <Row label="Stale jobs (>36h)" value={jobs.stale?.length ?? 0} warn={(jobs.stale?.length ?? 0) > 0} />
          <Row label="Recent failures" value={jobs.recentFailures?.length ?? 0} warn={(jobs.recentFailures?.length ?? 0) > 0} />
          <Row label="Outbox pending" value={outbox.pending ?? 0} warn={(outbox.pending ?? 0) > 50} />
          <Row label="Oldest pending" value={outbox.oldestPendingAgeMinutes != null ? `${outbox.oldestPendingAgeMinutes} min` : "—"} />
          <Row label="Outbox stuck" value={outbox.stuckProcessing ?? 0} warn={(outbox.stuckProcessing ?? 0) > 0} />
          <Row label="Open variances" value={reconciliation.open ?? 0} />
          <Row label="Variance total" value={reconciliation.varianceTotal ?? 0} warn={(reconciliation.varianceTotal ?? 0) !== 0} />
          <Row label="Scans pending" value={scans.pending ?? 0} warn={(scans.pending ?? 0) > 0} />
          <Row label="Held locks" value={heldLocks.length} />
        </div>
      )}

      {jobs.recentFailures?.length > 0 && (
        <div className="mt-3 rounded-lg border border-(--danger) bg-(--danger-bg) p-3 text-xs text-(--ts)">
          <p className="mb-1 flex items-center gap-1 font-bold">
            <LuTriangleAlert size={13} /> Failed jobs
          </p>
          <ul className="space-y-0.5">
            {jobs.recentFailures.slice(0, 5).map((job) => (
              <li key={job.name}>
                {job.name}: {job.error || "unknown error"} ({job.ageMinutes ?? 0}m ago)
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
