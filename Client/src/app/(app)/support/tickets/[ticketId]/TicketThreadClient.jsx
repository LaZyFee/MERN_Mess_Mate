"use client";

/**
 * P10.2 — Ticket thread. The composer is driven only by
 * `permissions.canComment`; the server stays authoritative.
 */
import { useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuCheck, LuLock, LuMessageSquare, LuSend, LuStar } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import Skeleton from "@/components/shared/Skeleton";
import Textarea from "@/components/shared/Textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { supportApi } from "@/lib/api/platform";

const REASON_TEXT = {
  TICKET_AWAITING_ADMIN: "Waiting for the admin team to reply.",
  TICKET_CLOSED: "This ticket is closed. Reopen it to continue the conversation.",
  TICKET_RESOLVED: "This ticket is resolved. Reopen it to continue the conversation.",
};

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TicketThreadClient({ ticketId, initialTicket, initialMessages, initialPermissions, initialSlaStage }) {
  const { showToast } = useToast();
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialMessages || []);
  const [permissions, setPermissions] = useState(initialPermissions || { canComment: false });
  const [slaStage, setSlaStage] = useState(initialSlaStage);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'resolve' | 'close' | 'reopen'
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");

  const reload = async () => {
    setBusy("reload");
    try {
      const data = await supportApi.ticket(ticketId);
      setTicket(data?.ticket || ticket);
      setMessages(data?.messages || []);
      setPermissions(data?.permissions || permissions);
      setSlaStage(data?.slaStage || slaStage);
    } catch (ex) {
      showToast({ status: "error", title: "Could not refresh ticket", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    if (!body.trim()) return;
    setBusy("send");
    try {
      await supportApi.addMessage(ticketId, { body: body.trim() });
      setBody("");
      showToast({ status: "success", title: "Message sent" });
      await reload();
    } catch (ex) {
      showToast({ status: "error", title: "Could not send message", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const transition = async () => {
    const action = confirm;
    setBusy(action);
    try {
      await supportApi[action](ticketId, action === "resolve" ? { note: "" } : {});
      showToast({ status: "success", title: `Ticket ${action}d` });
      setConfirm(null);
      await reload();
    } catch (ex) {
      showToast({ status: "error", title: "Action failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const rate = async () => {
    if (!score) return;
    setBusy("rate");
    try {
      await supportApi.rate(ticketId, { score, comment: comment.trim() || undefined });
      showToast({ status: "success", title: "Thanks for the rating" });
      await reload();
    } catch (ex) {
      showToast({ status: "error", title: "Could not submit rating", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  if (!ticket) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Card variant="outlined" padding="lg">Ticket not found.</Card>
      </div>
    );
  }

  const reasonText = permissions?.reason || REASON_TEXT[permissions?.code] || null;
  const isClosed = ticket.status === "closed";
  const canRate = ticket.status === "resolved" && !ticket.rating?.score;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <Link href="/support" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-(--p) no-underline">
        <LuArrowLeft size={14} /> All tickets
      </Link>

      <Card padding="md" className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-(--tp)">{ticket.subject}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-(--tm)">
              <span className="font-mono">{ticket.ticketNo}</span>
              <span>· {ticket.category}</span>
              <span>· opened {formatWhen(ticket.createdAt)}</span>
              {slaStage && <span className="rounded-full bg-(--bgm) px-2 py-0.5">{slaStage}</span>}
            </p>
          </div>
          <StatusBadge type="ticket" status={ticket.status} />
        </div>
      </Card>

      <ol className="list-none space-y-2">
        {messages.length === 0 ? (
          <Skeleton variant="rect" height={80} />
        ) : (
          messages.map((message) => {
            const mine = message.authorType === "user";
            return (
              <li key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl border px-3 py-2 ${mine ? "border-(--p)/30 bg-(--pale)" : "border-(--bd) bg-(--bgs)"
                    }`}
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-(--tm)">
                    {mine ? "You" : message.authorType === "admin" ? "Support" : "System"}
                  </p>
                  <p className="whitespace-pre-line text-sm text-(--ts)">{message.body}</p>
                  <p className="mt-1 text-[10px] text-(--tl)">{formatWhen(message.createdAt)}</p>
                </div>
              </li>
            );
          })
        )}
      </ol>

      <Card padding="md" className="sticky bottom-[calc(8px+env(safe-area-inset-bottom))] md:static">
        {permissions?.canComment ? (
          <div className="space-y-2">
            <Textarea
              label="Your reply"
              rows={3}
              value={body}
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add more detail for the support team"
            />
            <Button isFullWidth leftIcon={<LuSend size={14} />} isLoading={busy === "send"} isDisabled={Boolean(busy) || !body.trim()} onClick={send}>
              Send
            </Button>
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-(--bgm) px-3 py-2 text-xs text-(--tm)">
            <LuLock size={14} className="mt-0.5 shrink-0" />
            {reasonText || "You cannot reply to this ticket right now."}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {permissions?.canResolve && (
            <Button size="sm" variant="outline" leftIcon={<LuCheck size={13} />} onClick={() => setConfirm("resolve")}>
              Mark resolved
            </Button>
          )}
          {permissions?.canReopen && (
            <Button size="sm" variant="outline" leftIcon={<LuMessageSquare size={13} />} onClick={() => setConfirm("reopen")}>
              Reopen
            </Button>
          )}
          {permissions?.canClose && !isClosed && (
            <Button size="sm" variant="ghost" onClick={() => setConfirm("close")}>Close ticket</Button>
          )}
        </div>

        {canRate && (
          <div className="mt-3 border-t border-(--bd) pt-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">Rate this resolution</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Rate ${value}`}
                  onClick={() => setScore(value)}
                  className={`grid size-11 place-items-center rounded-full transition-[var(--transition)] ${value <= score ? "text-(--gold)" : "text-(--tl)"
                    }`}
                >
                  <LuStar size={18} fill={value <= score ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <Input size="lg" label="Comment (optional)" value={comment} maxLength={300} onChange={(e) => setComment(e.target.value)} />
            <Button size="sm" className="mt-2" isLoading={busy === "rate"} isDisabled={!score || Boolean(busy)} onClick={rate}>
              Submit rating
            </Button>
          </div>
        )}
      </Card>

      <ConfirmationModal
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={transition}
        title={confirm === "reopen" ? "Reopen this ticket?" : confirm === "close" ? "Close this ticket?" : "Mark as resolved?"}
        message={
          confirm === "reopen"
            ? "The ticket returns to awaiting_admin and the support team is notified."
            : confirm === "close"
              ? "You will not be able to reply until you reopen it."
              : "Let the support team know the issue is fixed."
        }
        status={confirm === "close" ? "warning" : "success"}
        confirmText={confirm === "resolve" ? "Resolve" : confirm === "reopen" ? "Reopen" : "Close"}
        isSubmitting={Boolean(busy)}
      />
    </div>
  );
}
