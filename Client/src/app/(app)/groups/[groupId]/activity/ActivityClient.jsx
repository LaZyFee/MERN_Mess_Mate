"use client";

/**
 * T14.9 — Group activity feed from `GET /messgroups/audit-log/:groupId`.
 * Filter by action family; cursor load-more; owner/manager/treasurer/auditor only.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuHistory, LuRefreshCw, LuShieldAlert } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { auditApi } from "@/lib/api/groups";
import { useGroup } from "../GroupShell";

const ACTION_FAMILIES = [
  { value: "", label: "All activity" },
  { value: "expense", label: "Expenses" },
  { value: "statement", label: "Statements" },
  { value: "money", label: "Money" },
  { value: "reconciliation", label: "Reconciliation" },
  { value: "membership", label: "Memberships" },
  { value: "budget", label: "Budgets" },
  { value: "group", label: "Group settings" },
];

const VIEWER_ROLES = ["owner", "manager", "treasurer", "auditor"];

const TONE = {
  danger: "border-(--danger) bg-(--danger-bg)",
  success: "border-(--success) bg-(--success-bg)",
  warning: "border-(--warning) bg-(--warning-bg)",
};

function actionTone(action = "") {
  if (/(reject|reverse|delete|remove|suspend|archive|reversed)/.test(action)) return "danger";
  if (/(approve|finalize|confirm|resolve|created|upserted)/.test(action)) return "success";
  if (/(reminder|submitted|correct)/.test(action)) return "warning";
  return "";
}

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityClient({ initialEvents = [], initialAction = "" }) {
  const { groupId, myRole } = useGroup();
  const { showToast } = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [action, setAction] = useState(initialAction);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const canView = VIEWER_ROLES.includes(myRole);

  const load = useCallback(async (nextAction = action) => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await auditApi.groupLog(groupId, { action: nextAction });
      setEvents(data?.events || []);
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load activity", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, action, canView, showToast]);

  useEffect(() => {
    if (canView && !initialEvents.length) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await auditApi.groupLog(groupId, { action, cursor: moreCursor });
      const next = data?.events || [];
      setEvents((current) => {
        const seen = new Set(current.map((e) => e._id));
        return [...current, ...next.filter((e) => !seen.has(e._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load more activity", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const changeFilter = (value) => {
    setAction(value);
    load(value);
  };

  const grouped = useMemo(() => events, [events]);

  if (!canView) {
    return (
      <Card variant="outlined" padding="md">
        <p className="flex items-center gap-2 text-sm text-(--tm)">
          <LuShieldAlert size={15} /> Activity history is visible to the owner, manager, treasurer and auditor.
        </p>
      </Card>
    );
  }

  return (
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-(--tp)">
            <LuHistory size={15} /> Group activity
          </span>
          <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={() => load()}>
            <LuRefreshCw size={14} />
          </Button>
        </div>
      }
    >
      <Select size="md" options={ACTION_FAMILIES} value={action} onChange={(e) => changeFilter(e.target.value)} />

      <div className="mt-3 space-y-2">
        {loading && grouped.length === 0 ? (
          <Skeleton variant="rect" height={64} />
        ) : grouped.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">No activity recorded yet.</p>
        ) : (
          grouped.map((event) => (
            <div
              key={event._id}
              className={`rounded-lg border-l-4 border-y border-r border-(--bd) bg-(--bgs) px-3 py-2 ${TONE[actionTone(event.action)] || ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-bold text-(--ts)">{event.action}</span>
                <span className="text-[10px] text-(--tl)">{relativeTime(event.createdAt)}</span>
              </div>
              {event.targetType && (
                <p className="text-[11px] text-(--tm)">
                  {event.targetType}
                  {event.reason ? ` · ${event.reason}` : ""}
                </p>
              )}
            </div>
          ))
        )}
        {moreCursor && (
          <Button variant="outline" size="md" isFullWidth isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
            Load more activity
          </Button>
        )}
      </div>
    </Card>
  );
}
