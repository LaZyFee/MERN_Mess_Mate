"use client";

/**
 * T10.5 + T10.7 — Admin support work queue and headline stats.
 * SLA countdown chips, overdue toggle, priority/status filters, ticketNo search
 * and an unread dot. Every ticket links to the hidden ticket view.
 */
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  LuAlarmClock,
  LuChevronRight,
  LuLifeBuoy,
  LuSearch,
  LuRefreshCw,
  LuInbox,
  LuStar,
  LuTrendingUp,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { adminSupportApi } from "@/lib/api/admin";

export const PRIORITY_OPTIONS = [
  { value: "", label: "Any priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "awaiting_admin", label: "Awaiting admin" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_TONE = {
  urgent: "bg-(--danger-bg) text-(--danger)",
  high: "bg-(--warning-bg) text-(--warning)",
  normal: "bg-(--info-bg) text-(--info)",
  low: "bg-(--bgm) text-(--tm)",
};

/** Hours left until the first-response SLA; negative = overdue. */
function slaHours(dueAt) {
  if (!dueAt) return null;
  return (new Date(dueAt).getTime() - Date.now()) / 3600000;
}

function SlaChip({ dueAt, answered }) {
  if (answered) return <span className="text-[10px] text-(--success)">Answered</span>;
  const hours = slaHours(dueAt);
  if (hours === null) return null;
  const overdue = hours < 0;
  const soon = !overdue && hours < 6;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${overdue
        ? "bg-(--danger-bg) text-(--danger)"
        : soon
          ? "bg-(--warning-bg) text-(--warning)"
          : "bg-(--bgm) text-(--tm)"
        }`}
    >
      <LuAlarmClock size={10} />
      {overdue ? `${Math.abs(Math.round(hours))}h over` : `${Math.max(1, Math.round(hours))}h left`}
    </span>
  );
}

function StatTile({ icon: Icon, label, value, hint, tone }) {
  const tones = {
    info: "bg-(--info-bg) text-(--info)",
    warning: "bg-(--warning-bg) text-(--warning)",
    danger: "bg-(--danger-bg) text-(--danger)",
    success: "bg-(--success-bg) text-(--success)",
  };
  return (
    <Card variant="outlined" padding="sm" className="min-w-0">
      <span className={`mb-1.5 grid size-7 place-items-center rounded-md ${tones[tone] || tones.info}`}>
        <Icon size={13} />
      </span>
      <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
      <p className="text-lg font-extrabold tabular-nums text-(--tp)">{value}</p>
      {hint && <p className="truncate text-[10px] text-(--tl)">{hint}</p>}
    </Card>
  );
}

export default function AdminSupportClient({ initialTickets = [], initialCursor = null, initialHasMore = false, initialStats = null, initialFilters = {} }) {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState(initialTickets);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [filters, setFilters] = useState({
    status: initialFilters.status || "",
    priority: initialFilters.priority || "",
    overdue: initialFilters.overdue || "",
    q: initialFilters.q || "",
  });
  const [loading, setLoading] = useState(false);

  const stats = initialStats || { byStatus: {}, overdue: 0, medianFirstResponseMinutes: null, averageRating: null, ratingCount: 0 };

  const load = useCallback(async (nextFilters, nextCursor = "", append = false) => {
    setLoading(true);
    try {
      const data = await adminSupportApi.tickets({ ...nextFilters, cursor: nextCursor || undefined });
      const items = data?.tickets || [];
      setTickets((prev) => (append ? [...prev, ...items] : items));
      setCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load queue", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const apply = (patch) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    load(next);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    load(filters);
  };

  const median = stats.medianFirstResponseMinutes;
  const medianLabel = median == null ? "—" : median < 60 ? `${median}m` : `${(median / 60).toFixed(1)}h`;

  const counts = useMemo(() => stats.byStatus || {}, [stats.byStatus]);

  return (
    <div className="flex flex-col gap-(--space-4)">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={LuInbox} label="Open" value={counts.open ?? 0} tone="info" />
        <StatTile icon={LuLifeBuoy} label="Awaiting admin" value={counts.awaiting_admin ?? 0} tone="warning" />
        <StatTile icon={LuAlarmClock} label="Overdue" value={stats.overdue ?? 0} tone="danger" hint="first response SLA" />
        <StatTile icon={LuTrendingUp} label="Median reply" value={medianLabel} tone="success" hint="last 30 days" />
        <StatTile
          icon={LuStar}
          label="CSAT"
          value={stats.averageRating == null ? "—" : `${Number(stats.averageRating).toFixed(1)}/5`}
          tone="info"
          hint={`${stats.ratingCount ?? 0} ratings`}
        />
      </div>

      <Card variant="outlined" padding="md" className="min-w-0">
        <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
            <Select
              label="Status"
              size="sm"
              value={filters.status}
              onChange={(event) => apply({ status: event.target.value })}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Priority"
              size="sm"
              value={filters.priority}
              onChange={(event) => apply({ priority: event.target.value })}
              options={PRIORITY_OPTIONS}
            />
            <Input
              size="sm"
              label="Search"
              value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              placeholder="ticket no or subject"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={filters.overdue === "1" ? "primary" : "outline"}
              leftIcon={<LuAlarmClock size={13} />}
              onClick={() => apply({ overdue: filters.overdue === "1" ? "" : "1" })}
            >
              Overdue
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading} leftIcon={<LuSearch size={13} />} ariaLabel="Search queue">
              Go
            </Button>
            <Button type="button" size="sm" variant="ghost" isRound ariaLabel="Reload queue" onClick={() => load(filters)}>
              <LuRefreshCw size={13} />
            </Button>
          </div>
        </form>
      </Card>

      {loading && tickets.length === 0 ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rect" height={68} />)}
        </div>
      ) : tickets.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center text-(--tm)">
            <LuInbox size={28} />
            <p className="text-sm">Queue is clear.</p>
          </div>
        </Card>
      ) : (
        <ul className="flex list-none flex-col gap-2">
          {tickets.map((ticket) => {
            const unread = ticket.lastUserMessageAt && (!ticket.lastAdminMessageAt || new Date(ticket.lastUserMessageAt) > new Date(ticket.lastAdminMessageAt));
            return (
              <li key={ticket._id}>
                <Link
                  href={`/admin/support/${ticket._id}`}
                  className="flex items-start gap-3 rounded-lg border border-(--bd) bg-(--bgs) p-3 no-underline transition-[var(--transition)] hover:bg-(--bgm)"
                >
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${unread ? "bg-(--p)" : "bg-transparent"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-(--tp)">{ticket.subject}</span>
                      {unread && <span className="text-[10px] font-bold uppercase text-(--p)">new</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-(--tm)">
                      <span className="font-mono">{ticket.ticketNo}</span>
                      <span>· {ticket.category}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${PRIORITY_TONE[ticket.priority] || PRIORITY_TONE.normal}`}>
                        {ticket.priority || "normal"}
                      </span>
                      <SlaChip dueAt={ticket.firstResponseDueAt} answered={Boolean(ticket.firstAdminReplyAt)} />
                      {ticket.assignedAdminId ? <span>· assigned</span> : <span>· unassigned</span>}
                    </p>
                  </div>
                  <StatusBadge type="ticket" status={ticket.status} size="xs" />
                  <LuChevronRight size={14} className="mt-1 shrink-0 text-(--tl)" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <Button variant="outline" isFullWidth isLoading={loading} onClick={() => load(filters, cursor, true)}>
          Load more
        </Button>
      )}
    </div>
  );
}
