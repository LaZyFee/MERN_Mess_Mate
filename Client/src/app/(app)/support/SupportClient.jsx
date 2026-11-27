"use client";

/**
 * P10.1 — My support tickets: filterable cursor list + new-ticket form.
 */
import { useState } from "react";
import Link from "next/link";
import { LuLifeBuoy, LuPlus, LuRefreshCw, LuTicket } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Textarea from "@/components/shared/Textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import TurnstileWidget, { hasTurnstile } from "@/components/shared/TurnstileWidget";
import { useToast } from "@/components/shared/ToastProvider";
import { supportApi } from "@/lib/api/platform";
import { formatDay } from "@/lib/utils/format";

export const TICKET_CATEGORIES = [
  { value: "account", label: "Account" },
  { value: "bug", label: "Bug" },
  { value: "billing_dispute", label: "Billing / dispute" },
  { value: "feature", label: "Feature request" },
  { value: "group_access", label: "Group access" },
  { value: "appeal", label: "Appeal" },
  { value: "other", label: "Other" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "awaiting_admin", label: "Awaiting admin" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function NewTicketModal({ isOpen, onClose, groups, onCreated }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ category: "other", subject: "", body: "", groupId: "", attachContext: false });
  const [captchaToken, setCaptchaToken] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (form.subject.trim().length < 3 || form.body.trim().length < 10) {
      showToast({ status: "warning", title: "Add a subject (3+) and a message (10+ chars)" });
      return;
    }
    setSaving(true);
    try {
      const res = await supportApi.createTicket({
        category: form.category,
        subject: form.subject.trim(),
        body: form.body.trim(),
        groupId: form.groupId || undefined,
        attachContext: form.attachContext && Boolean(form.groupId),
        captchaToken: captchaToken || undefined,
      });
      showToast({ status: "success", title: `Ticket ${res?.ticket?.ticketNo || ""} created` });
      setForm({ category: "other", subject: "", body: "", groupId: "", attachContext: false });
      setCaptchaToken("");
      onCreated?.();
      onClose();
    } catch (ex) {
      showToast({ status: "error", title: "Could not create ticket", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header="New support ticket"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} isDisabled={saving}>Cancel</Button>
          <Button onClick={submit} isLoading={saving} isDisabled={saving || (hasTurnstile() && !captchaToken)}>Create ticket</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Select size="lg" label="Category" options={TICKET_CATEGORIES} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        <Input size="lg" label="Subject" isRequired value={form.subject} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        <Textarea label="What happened?" rows={5} value={form.body} maxLength={2000} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        <TurnstileWidget onToken={setCaptchaToken} isRequired={hasTurnstile()} />
        {groups.length > 0 && (
          <>
            <Select
              size="lg"
              label="Related group (optional)"
              options={[{ value: "", label: "None" }, ...groups.map((g) => ({ value: g._id, label: g.name }))]}
              value={form.groupId}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
            />
            <label className="flex min-h-11 items-center gap-2 text-xs text-(--ts)">
              <input
                type="checkbox"
                className="size-5 accent-(--p)"
                checked={form.attachContext}
                onChange={(e) => setForm((f) => ({ ...f, attachContext: e.target.checked }))}
              />
              Attach my role &amp; membership dates for that group
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function SupportClient({ initialTickets = [], initialHasMore = false, initialCursor = null, groups = [] }) {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState(initialTickets || []);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async (nextStatus = status, nextCursor = null) => {
    setLoading(true);
    try {
      const data = await supportApi.listTickets({ status: nextStatus, cursor: nextCursor });
      const rows = data?.tickets || [];
      setTickets((prev) => (nextCursor ? [...prev, ...rows] : rows));
      setCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load tickets", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 sm:py-9">
      <div className="rounded-3xl bg-(--brand-bg) p-5 text-(--brand-fg) sm:p-7">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-(--brand-on)">
            <LuLifeBuoy size={17} /> MealMate support
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Support
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-(--brand-mute)">Track tickets and replies from the MealMate team.</p>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={() => load()}>
            <LuRefreshCw size={15} />
          </Button>
          <Button variant="primary" size="sm" leftIcon={<LuPlus size={14} />} onClick={() => setCreating(true)}>New ticket</Button>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STATUS_FILTERS.map((option) => (
          <Button
            variant={status === option.value ? "primary" : "outline"}
            size="md"
            type="button"
            key={option.value || "all"}
            onClick={() => {
              setStatus(option.value);
              load(option.value);
            }}
            aria-pressed={status === option.value}
            className="!h-11 shrink-0 !rounded-xl !px-4"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {loading && tickets.length === 0 ? (
        <div className="space-y-2">
          <Skeleton variant="rect" height={84} />
          <Skeleton variant="rect" height={84} />
        </div>
      ) : tickets.length === 0 ? (
        <Card padding="lg" variant="outlined" className="text-center">
          <LuTicket size={26} className="mx-auto mb-2 text-(--tl)" />
          <p className="text-sm font-semibold text-(--tp)">No tickets yet</p>
          <p className="mt-1 text-xs text-(--tm)">Open a ticket if something looks wrong with your meals, money or account.</p>
          <Button className="mt-3" size="sm" onClick={() => setCreating(true)} leftIcon={<LuPlus size={14} />}>New ticket</Button>
        </Card>
      ) : (
        <ul className="list-none space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket._id}>
              <Link
                href={`/support/tickets/${ticket._id}`}
                className="flex min-h-11 flex-col gap-1 rounded-lg border border-(--bd) bg-(--bgs) p-3 no-underline transition-[var(--transition)] hover:border-(--p)"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-(--tp)">{ticket.subject}</span>
                  <StatusBadge type="ticket" status={ticket.status} />
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[11px] text-(--tm)">
                  <span className="font-mono">{ticket.ticketNo}</span>
                  <span>· {ticket.category}</span>
                  <span>· {formatDay(String(ticket.createdAt).slice(0, 10))}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button variant="outline" isFullWidth isLoading={loading} onClick={() => load(status, cursor)}>Load more</Button>
      )}

      <NewTicketModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        groups={groups}
        onCreated={() => load()}
      />
    </div>
  );
}
