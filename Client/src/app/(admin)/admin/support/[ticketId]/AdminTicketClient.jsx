"use client";

/**
 * T10.6 — Admin ticket view. Reply, internal note (visually distinct),
 * canned replies, assign, priority patch and resolve/close/reopen (reason
 * required for reopening). User context panel never shows email/phone.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LuArrowLeft,
  LuSend,
  LuLock,
  LuSparkles,
  LuCheck,
  LuX,
  LuRotateCcw,
  LuUser,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Textarea from "@/components/shared/Textarea";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { adminSupportApi } from "@/lib/api/admin";
import TicketContextPanel from "./TicketContextPanel";

const TRANSITIONS = {
  resolve: { title: "Resolve this ticket?", message: "The user is notified and can rate the resolution.", confirmText: "Resolve", needsReason: false, status: "success" },
  close: { title: "Close this ticket?", message: "Closing ends the conversation until the user reopens it.", confirmText: "Close", needsReason: false, status: "warning" },
  reopen: { title: "Reopen this ticket?", message: "A reason is appended to the audit log and the user is notified.", confirmText: "Reopen", needsReason: true, status: "success" },
};

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }) {
  const internal = message.isInternal;
  const role = message.authorType;
  const alignEnd = role === "admin" && !internal;
  return (
    <li className={`flex ${alignEnd ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-xl border px-3 py-2 ${internal
          ? "border-(--warning)/40 bg-(--warning-bg)"
          : alignEnd
            ? "border-(--p)/30 bg-(--pale)"
            : "border-(--bd) bg-(--bgs)"
          }`}
      >
        <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-(--tm)">
          {internal && <LuLock size={10} />}
          {internal ? "Internal note" : role === "admin" ? "Support" : role === "system" ? "System" : "User"}
        </p>
        <p className="whitespace-pre-line text-sm text-(--ts)">{message.body}</p>
        <p className="mt-1 text-[10px] text-(--tl)">{formatWhen(message.createdAt)}</p>
      </div>
    </li>
  );
}

export default function AdminTicketClient({ ticketId, initialThread, initialCannedReplies = [] }) {
  const { showToast } = useToast();
  const [ticket, setTicket] = useState(initialThread.ticket);
  const [messages, setMessages] = useState(initialThread.messages || []);
  const [owner, setOwner] = useState(initialThread.owner || null);
  const [memberships, setMemberships] = useState(initialThread.memberships || []);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [reason, setReason] = useState("");

  const reload = async () => {
    try {
      const data = await adminSupportApi.ticket(ticketId);
      setTicket(data?.ticket || ticket);
      setMessages(data?.messages || []);
      setOwner(data?.owner || owner);
      setMemberships(data?.memberships || memberships);
    } catch (ex) {
      showToast({ status: "error", title: "Could not refresh ticket", description: ex?.data?.msg || ex?.message });
    }
  };

  const send = async () => {
    if (!body.trim()) return;
    const isNote = internal;
    setBusy(isNote ? "note" : "reply");
    try {
      if (isNote) await adminSupportApi.internalNote(ticketId, { body: body.trim() });
      else await adminSupportApi.reply(ticketId, { body: body.trim() });
      setBody("");
      showToast({ status: "success", title: isNote ? "Internal note added" : "Reply sent" });
      await reload();
    } catch (ex) {
      showToast({ status: "error", title: "Could not save", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const changePriority = async (priority) => {
    setBusy("patch");
    try {
      const res = await adminSupportApi.patch(ticketId, { priority });
      setTicket(res?.ticket || { ...ticket, priority });
      showToast({ status: "success", title: `Priority set to ${priority}` });
    } catch (ex) {
      showToast({ status: "error", title: "Priority update failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const assignToMe = async () => {
    setBusy("assign");
    try {
      await adminSupportApi.assign(ticketId, { assignedAdminId: null });
      showToast({ status: "success", title: "Assignment cleared" });
      await reload();
    } catch (ex) {
      showToast({ status: "error", title: "Assign failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const runTransition = async () => {
    const action = confirm;
    setBusy(action);
    try {
      await adminSupportApi.action(ticketId, action, reason.trim() ? { reason: reason.trim() } : {});
      showToast({ status: "success", title: `Ticket ${action}d` });
      setConfirm(null);
      setReason("");
      await reload();
    } catch (ex) {
      showToast({ status: "error", title: "Action failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const cannedByCategory = useMemo(
    () => initialCannedReplies.filter((reply) => !reply.category || reply.category === ticket.category),
    [initialCannedReplies, ticket.category],
  );

  const closed = ["resolved", "closed"].includes(ticket.status);

  return (
    <div className="flex flex-col gap-(--space-4)">
      <Link href="/admin/support" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-(--p) no-underline">
        <LuArrowLeft size={14} /> Support queue
      </Link>

      <div className="grid grid-cols-1 gap-(--space-4) lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-(--space-3)">
          <Card padding="md" className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-base font-bold text-(--tp)">{ticket.subject}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-(--tm)">
                  <span className="font-mono">{ticket.ticketNo}</span>
                  <span>· {ticket.category}</span>
                  <span>· opened {formatWhen(ticket.createdAt)}</span>
                  {ticket.reopenCount ? <span>· reopened {ticket.reopenCount}×</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge
                  type="driver"
                  status={ticket.priority || "normal"}
                  config={{
                    low: { variant: "secondary", label: "Low" },
                    normal: { variant: "info", label: "Normal" },
                    high: { variant: "warning", label: "High" },
                    urgent: { variant: "danger", label: "Urgent" },
                  }}
                />
                <StatusBadge type="ticket" status={ticket.status} />
              </div>
            </div>
          </Card>

          <ol className="list-none space-y-2">
            {messages.map((message) => (
              <MessageBubble key={message._id} message={message} />
            ))}
          </ol>

          <Card padding="md" className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">
                {internal ? "Internal note (not visible to the user)" : "Public reply"}
              </p>
              <Button
                size="xs"
                variant={internal ? "primary" : "outline"}
                leftIcon={internal ? <LuLock size={12} /> : <LuUser size={12} />}
                onClick={() => setInternal((prev) => !prev)}
              >
                {internal ? "Internal" : "Public"}
              </Button>
            </div>
            <Textarea
              label={internal ? "Internal note" : "Reply to user"}
              rows={3}
              value={body}
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder={internal ? "Context for other admins only" : "Write your reply"}
            />
            {cannedByCategory.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cannedByCategory.slice(0, 6).map((reply) => (
                  <button
                    key={reply._id}
                    type="button"
                    onClick={() => setBody(reply.body)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-(--bd) bg-(--bgm) px-2.5 text-[10px] font-semibold text-(--ts) transition-[var(--transition)] hover:bg-(--pale)"
                  >
                    <LuSparkles size={10} /> {reply.title}
                  </button>
                ))}
              </div>
            )}
            <Button
              className="mt-2"
              isFullWidth
              variant={internal ? "outline" : "primary"}
              leftIcon={<LuSend size={14} />}
              isLoading={busy === "reply" || busy === "note"}
              isDisabled={Boolean(busy) || !body.trim()}
              onClick={send}
            >
              {internal ? "Save internal note" : "Send reply"}
            </Button>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-(--bd) pt-3">
              {!closed && (
                <Button size="sm" variant="outline" leftIcon={<LuCheck size={13} />} onClick={() => setConfirm("resolve")}>
                  Resolve
                </Button>
              )}
              {ticket.status !== "closed" && (
                <Button size="sm" variant="outline" leftIcon={<LuX size={13} />} onClick={() => setConfirm("close")}>
                  Close
                </Button>
              )}
              {closed && (
                <Button size="sm" variant="outline" leftIcon={<LuRotateCcw size={13} />} onClick={() => setConfirm("reopen")}>
                  Reopen
                </Button>
              )}
            </div>
          </Card>
        </div>

        <TicketContextPanel
          owner={owner}
          memberships={memberships}
          ticket={ticket}
          busy={busy}
          onPriority={changePriority}
          onClearAssignee={assignToMe}
        />
      </div>

      <ConfirmationModal
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runTransition}
        title={TRANSITIONS[confirm]?.title || "Confirm"}
        message={TRANSITIONS[confirm]?.message || ""}
        status={TRANSITIONS[confirm]?.status || "warning"}
        confirmText={TRANSITIONS[confirm]?.confirmText || "Confirm"}
        isSubmitting={Boolean(busy)}
        details={
          TRANSITIONS[confirm]?.needsReason ? (
            <Input
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Why is this ticket being reopened?"
              helperText="At least 3 characters."
            />
          ) : null
        }
      />
    </div>
  );
}
