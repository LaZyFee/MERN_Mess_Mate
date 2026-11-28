"use client";

/**
 * Group activity feed — audit events with an action-family filter and cursor
 * load-more. Owner / manager / treasurer / auditor only.
 *
 * Mobile-first: a sticky filter row, then timeline entries grouped visually by
 * tone (danger / success / warning) using CSS variables.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuHistory, LuRefreshCw, LuShieldAlert, LuCircleDot } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { auditApi } from "@/lib/api/groups";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, SectionCard } from "../GroupUI";
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
  danger: { rail: "bg-(--danger)", chip: "bg-(--danger-bg) text-(--danger)" },
  success: { rail: "bg-(--success)", chip: "bg-(--success-bg) text-(--success)" },
  warning: { rail: "bg-(--warning)", chip: "bg-(--warning-bg) text-(--warning)" },
  default: { rail: "bg-(--bd3)", chip: "bg-(--bgm) text-(--ts)" },
};

function actionTone(action = "") {
  if (/(reject|reverse|delete|remove|suspend|archive|reversed)/.test(action)) return "danger";
  if (/(approve|finalize|confirm|resolve|created|upserted)/.test(action)) return "success";
  if (/(reminder|submitted|correct)/.test(action)) return "warning";
  return "default";
}

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ActivityClient({ initialEvents = [], initialAction = "" }) {
  const t = useT();
  const { groupId, myRole } = useGroup();
  const { showToast } = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [action, setAction] = useState(initialAction);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const canView = VIEWER_ROLES.includes(myRole);

  const load = useCallback(
    async (nextAction = action) => {
      if (!canView) return;
      setLoading(true);
      try {
        const data = await auditApi.groupLog(groupId, { action: nextAction });
        setEvents(data?.events || []);
        setMoreCursor(data?.nextCursor || null);
      } catch (ex) {
        showToast({ status: "error", title: t("members.couldNotLoad"), description: ex?.data?.msg || ex?.message });
      } finally {
        setLoading(false);
      }
    },
    [groupId, action, canView, showToast, t],
  );

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
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
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
      <SectionCard icon={LuShieldAlert} tone="warning" title={t("members.recentActivity")}>
        <p className="text-sm leading-relaxed text-(--tm)">{t("more.settingsRestricted")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={LuHistory}
      title={t("members.recentActivity")}
      subtitle={`${grouped.length}`}
      actions={
        <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={() => load()}>
          <LuRefreshCw size={14} />
        </Button>
      }
    >
      <Select size="md" options={ACTION_FAMILIES} value={action} onChange={(e) => changeFilter(e.target.value)} />

      <div className="mt-3 space-y-1.5">
        {loading && grouped.length === 0 ? (
          <Skeleton variant="rect" height={64} className="rounded-xl" />
        ) : grouped.length === 0 ? (
          <EmptyState icon={LuHistory} title={t("members.noActivity")} />
        ) : (
          grouped.map((event) => {
            const tone = TONE[actionTone(event.action)];
            return (
              <div key={event._id} className="relative overflow-hidden rounded-xl border border-(--bd) bg-(--bgs) py-2 pl-3.5 pr-2.5">
                <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold ${tone.chip}`}>
                    {event.action}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-(--tm)">
                    {relativeTime(event.createdAt)}
                  </span>
                </div>
                {event.targetType && (
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-(--tm)">
                    <LuCircleDot size={10} className="shrink-0" />
                    {event.targetType}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </p>
                )}
              </div>
            );
          })
        )}
        {moreCursor && (
          <Button
            variant="outline"
            size="md"
            isFullWidth
            className="rounded-xl"
            isLoading={loadingMore}
            isDisabled={loadingMore}
            onClick={loadMore}
          >
            {t("shell.loadMore")}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
