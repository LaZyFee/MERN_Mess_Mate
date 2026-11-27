"use client";

/**
 * T8.8 — Audit feed. Read-only chronological list of audit events with an
 * action filter; snapshots are already redacted server-side.
 */
import { useCallback, useMemo, useState } from "react";
import { LuRefreshCw, LuScrollText, LuSearch } from "react-icons/lu";
import Card from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Skeleton from "@/components/shared/Skeleton";
import Badge from "@/components/shared/Badge";
import { useToast } from "@/components/shared/ToastProvider";
import { adminApi } from "@/lib/api/admin";

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditClient({ initialEvents = [] }) {
  const { showToast } = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextAction) => {
    setLoading(true);
    try {
      const data = await adminApi.audit({ limit: 100, action: nextAction || undefined });
      setEvents(data?.events || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load audit feed", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const submit = (event) => {
    event.preventDefault();
    load(action.trim());
  };

  const grouped = useMemo(() => events, [events]);

  return (
    <div className="flex flex-col gap-(--space-4)">
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Filter by action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. membership.departed"
            helperText="Exact action key; leave empty for the latest 100 events."
          />
        </div>
        <Button type="submit" variant="primary" isLoading={loading} leftIcon={<LuSearch size={14} />} ariaLabel="Filter audit feed">
          Filter
        </Button>
        <Button type="button" variant="ghost" isRound ariaLabel="Reload audit feed" onClick={() => load(action.trim())}>
          <LuRefreshCw size={14} />
        </Button>
      </form>

      {loading && grouped.length === 0 ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rect" height={48} />)}
        </div>
      ) : grouped.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center text-(--tm)">
            <LuScrollText size={28} />
            <p className="text-sm">No audit events{action ? ` for “${action}”` : ""} yet.</p>
          </div>
        </Card>
      ) : (
        <ul className="flex list-none flex-col gap-1.5">
          {grouped.map((event) => (
            <li key={event._id} className="flex flex-col gap-1 rounded-lg border border-(--bd) bg-(--bgs) p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] font-semibold text-(--tp)">{event.action}</p>
                <p className="truncate text-[10px] text-(--tm)">
                  {event.targetType || "—"}
                  {event.reason ? ` · ${event.reason}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge colorScheme="default" size="xs" isRounded>{event.actorId ? "actor" : "system"}</Badge>
                <span className="text-[10px] tabular-nums text-(--tl)">{formatWhen(event.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
