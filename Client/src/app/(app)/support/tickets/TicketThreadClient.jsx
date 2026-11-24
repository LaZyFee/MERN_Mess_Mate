"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import Textarea from "@/components/shared/Textarea";
import Modal from "@/components/shared/Modal";
import { LuSend, LuStar } from "react-icons/lu";

const ACTIONS = {
  resolve: { title: "Resolve ticket", label: "Resolve" },
  close: { title: "Close ticket", label: "Close" },
  reopen: { title: "Reopen ticket", label: "Reopen" },
};

export default function TicketDetailClient({
  ticket,
  permissions,
  canComment,
}) {
  const closed = ticket?.status === "closed" || ticket?.status === "resolved";

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [rated, setRated] = useState(Boolean(ticket?.rating));
  const [pendingAction, setPendingAction] = useState(null);
  const [reason, setReason] = useState("");
  const [actionBusy, setActionBusy] = useState(null);

  const openAction = (a) => {
    setPendingAction(a);
    setReason("");
  };
  const closeAction = () => {
    setPendingAction(null);
    setReason("");
  };
  const runAction = async () => {
    if (!pendingAction || !reason.trim()) return;
    setActionBusy(pendingAction);
    try {
      // TODO: call your ticket API
      // await ticketsApi.transition(ticket.id, pendingAction, { reason });
      closeAction();
    } finally {
      setActionBusy(null);
    }
  };

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      // TODO: await ticketsApi.reply(ticket.id, { body });
      setBody("");
    } finally {
      setSending(false);
    }
  };

  const rate = async (star) => {
    // TODO: await ticketsApi.rate(ticket.id, star);
    setRated(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md">
        <h2 className="mb-3 text-sm font-bold text-(--tp)">Reply</h2>
        {canComment ? (
          <>
            <Textarea
              size="lg"
              label="Your reply"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <Button
              size="lg"
              isFullWidth
              leftIcon={<LuSend size={15} />}
              isLoading={sending}
              isDisabled={sending || !body.trim()}
              onClick={send}
            >
              Send reply
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
            <p className="mb-1 text-xs font-semibold text-(--tp)">
              Replies are closed
            </p>
            <p className="text-xs text-(--tm)">
              {permissions?.reason ||
                "This ticket is not accepting replies at the moment."}
            </p>
          </div>
        )}
      </Card>

      {ticket?.status === "resolved" && !rated && (
        <Card padding="md">
          <h2 className="mb-2 text-sm font-bold text-(--tp)">
            Rate this resolution
          </h2>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                key={star}
                size="sm"
                isRound
                variant={star <= (rated ? 5 : ticket?.rating || 0) ? "primary" : "ghost"}
                aria-label={`Rate ${star} stars`}
                onClick={() => rate(star)}
              >
                <LuStar size={14} />
              </Button>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {permissions?.canResolve && !closed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAction("resolve")}
            disabled={actionBusy === "resolve"}
          >
            Resolve
          </Button>
        )}
        {permissions?.canClose && !closed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAction("close")}
            disabled={actionBusy === "close"}
          >
            Close
          </Button>
        )}
        {Boolean(permissions?.canReopen || closed) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAction("reopen")}
            disabled={actionBusy === "reopen"}
          >
            Reopen
          </Button>
        )}
        <Link
          href="/support"
          className="inline-flex min-h-11 items-center text-xs text-(--p) no-underline hover:text-(--p2)"
        >
          Back to tickets
        </Link>
      </div>

      {pendingAction && (
        <Modal
          isOpen={Boolean(pendingAction)}
          onClose={closeAction}
          header={ACTIONS[pendingAction].title}
        >
          <div className="space-y-3">
            <p className="text-xs text-(--tm)">
              A reason helps the support team understand the transition.
            </p>
            <Textarea
              size="lg"
              label="Reason"
              isRequired
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={closeAction}
              isDisabled={actionBusy === pendingAction}
            >
              Cancel
            </Button>
            <Button
              isLoading={actionBusy === pendingAction}
              isDisabled={actionBusy === pendingAction || !reason.trim()}
              onClick={runAction}
            >
              {ACTIONS[pendingAction].label}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}