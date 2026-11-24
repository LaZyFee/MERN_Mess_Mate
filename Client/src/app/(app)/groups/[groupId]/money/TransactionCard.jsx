"use client";

import { useState } from "react";
import {
  LuArrowDownLeft,
  LuArrowLeftRight,
  LuArrowUpRight,
  LuBadgeDollarSign,
  LuBanknote,
  LuHandCoins,
  LuLoader,
  LuPercent,
  LuRotateCcw,
  LuStore,
  LuCheck,
  LuX,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Modal from "@/components/modals/Modal";
import Textarea from "@/components/shared/Textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { moneyApi } from "@/lib/api/money";
import { formatPoisha, formatDay } from "@/lib/utils/format";
import { MONEY_KIND_LABELS, MONEY_METHOD_LABELS } from "@/lib/utils/money";

/** Transaction kind icons (restricted to group-finance kinds). */
const KIND_ICONS = {
  contribution: LuArrowDownLeft,
  payout: LuArrowUpRight,
  supplier_payment: LuStore,
  member_settlement: LuHandCoins,
  transfer: LuArrowLeftRight,
  fee: LuPercent,
};

/** method chip icon (methods share the same wallet glyph) */
function methodIcon() {
  return LuBanknote;
}

const RULES = {
  confirm: { title: "Confirm transaction", verb: "Confirm", reason: false, danger: false },
  reject: { title: "Reject transaction", verb: "Reject", reason: true, danger: true },
  reverse: { title: "Reverse transaction", verb: "Reverse", reason: true, danger: true },
};

function memberLabel(member) {
  if (!member) return null;
  return member.displayName || member.username || "Member";
}

function ReasonModal({ action, saving, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const rule = RULES[action];
  if (!rule) return null;
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      header={rule.title}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button
            variant={rule.danger ? "danger" : "primary"}
            isLoading={saving}
            isDisabled={saving || (rule.reason && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {rule.verb}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-(--tm)">
        {action === "confirm"
          ? "Confirming posts a balanced journal entry to the ledger."
          : "This action is recorded in the audit log with your reason."}
      </p>
      <div className="mt-4">
        <Textarea
          label={rule.reason ? "Reason (required)" : "Reason (optional)"}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function TransactionCard({ groupId, tx, canTreasurer, onChanged }) {
  const { showToast } = useToast();
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const Icon = KIND_ICONS[tx.kind] || LuArrowLeftRight;
  const MethodIcon = methodIcon(tx.method);
  const from = memberLabel(tx.fromMember);
  const to = memberLabel(tx.toMember);

  const run = async (fn) => {
    setBusy(true);
    try {
      const res = await fn();
      showToast({ status: "success", title: res?.msg || "Done" });
      setAction(null);
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Action failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = (reason) => {
    if (action === "confirm") return run(() => moneyApi.confirm(groupId, tx._id));
    if (action === "reject") return run(() => moneyApi.reject(groupId, tx._id, reason));
    return run(() => moneyApi.reverse(groupId, tx._id, reason));
  };

  return (
    <div className="min-w-0 rounded-lg border border-(--bd) bg-(--bgs) p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--pale) text-(--p)">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge type="money" status={tx.status} />
            <span className="text-xs font-semibold text-(--ts)">{MONEY_KIND_LABELS[tx.kind] || tx.kind}</span>
          </div>
          <p className="mt-1 truncate text-xs text-(--tm)">
            {from ? `${from} → ` : ""}
            {to || tx.supplierName || ""}
            {tx.paidAt ? ` · ${formatDay(String(tx.paidAt).slice(0, 10))}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-(--tl)">
            <span className="inline-flex items-center gap-1 rounded-full bg-(--bgm) px-2 py-0.5 font-semibold">
              <MethodIcon size={11} /> {MONEY_METHOD_LABELS[tx.method] || tx.method}
            </span>
            {tx.reference && <span className="truncate">TrxID {tx.reference}</span>}
            {tx.evidenceUrl && (
              <a
                href={tx.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-(--p) underline"
              >
                Evidence
              </a>
            )}
          </div>
        </div>
        <p className="shrink-0 text-right text-base font-bold tabular-nums text-(--tp)">{formatPoisha(tx.amount)}</p>
      </div>

      {canTreasurer && ["submitted", "confirmed"].includes(tx.status) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tx.status === "submitted" && (
            <>
              <Button
                size="sm"
                leftIcon={busy ? <LuLoader size={13} className="animate-spin" /> : <LuCheck size={13} />}
                isDisabled={busy}
                onClick={() => setAction("confirm")}
              >
                Confirm
              </Button>
              <Button size="sm" variant="danger" leftIcon={<LuX size={13} />} isDisabled={busy} onClick={() => setAction("reject")}>
                Reject
              </Button>
            </>
          )}
          {tx.status === "confirmed" && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LuRotateCcw size={13} />}
              isDisabled={busy}
              onClick={() => setAction("reverse")}
            >
              Reverse
            </Button>
          )}
        </div>
      )}

      {action && (
        <ReasonModal
          action={action}
          saving={busy}
          onClose={() => setAction(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}
