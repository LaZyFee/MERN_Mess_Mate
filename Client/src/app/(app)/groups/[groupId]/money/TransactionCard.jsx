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
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

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
  confirm: { titleKey: "money.confirmTitle", verbKey: "money.confirmVerb", reason: false, danger: false },
  reject: { titleKey: "money.rejectTitle", verbKey: "money.rejectVerb", reason: true, danger: true },
  reverse: { titleKey: "money.reverseTitle", verbKey: "money.reverseVerb", reason: true, danger: true },
};

function memberLabel(member, fallback) {
  if (!member) return null;
  return member.displayName || member.username || fallback;
}

function ReasonModal({ action, saving, onClose, onConfirm }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const rule = RULES[action];
  if (!rule) return null;
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      header={t(rule.titleKey)}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} isDisabled={saving}>
            {t("shell.cancel")}
          </Button>
          <Button
            variant={rule.danger ? "danger" : "primary"}
            isLoading={saving}
            isDisabled={saving || (rule.reason && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {t(rule.verbKey)}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-(--tm)">
        {action === "confirm" ? t("money.confirmBody") : t("money.dangerBody")}
      </p>
      <div className="mt-4">
        <Textarea
          label={rule.reason ? t("exp.reasonRequired") : t("exp.reasonOptional")}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export default function TransactionCard({ groupId, tx, canTreasurer, onChanged }) {
  const t = useT();
  const { fmt, lang } = useMoney();
  const { showToast } = useToast();
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const Icon = KIND_ICONS[tx.kind] || LuArrowLeftRight;
  const MethodIcon = methodIcon(tx.method);
  const from = memberLabel(tx.fromMember, t("money.member"));
  const to = memberLabel(tx.toMember, t("money.member"));

  const run = async (fn) => {
    setBusy(true);
    try {
      const res = await fn();
      showToast({ status: "success", title: res?.msg || t("money.done") });
      setAction(null);
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("money.actionFailed"), description: ex?.data?.msg || ex?.message });
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
            <span className="text-xs font-semibold text-(--ts)">{t(`money.kind.${tx.kind}`)}</span>
          </div>
          <p className="mt-1 truncate text-xs text-(--tm)">
            {from ? `${from} → ` : ""}
            {to || tx.supplierName || ""}
            {tx.paidAt ? ` · ${formatDay(String(tx.paidAt).slice(0, 10), lang)}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-(--tl)">
            <span className="inline-flex items-center gap-1 rounded-full bg-(--bgm) px-2 py-0.5 font-semibold">
              <MethodIcon size={11} /> {t(`money.method.${tx.method}`)}
            </span>
            {tx.reference && <span className="truncate">{t("money.trxId", { ref: tx.reference })}</span>}
            {tx.evidenceUrl && (
              <a
                href={tx.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-(--p) underline"
              >
                {t("money.evidence")}
              </a>
            )}
          </div>
        </div>
        <p className="shrink-0 text-right text-base font-bold tabular-nums text-(--tp)">{fmt(tx.amount)}</p>
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
                {t("money.confirmVerb")}
              </Button>
              <Button size="sm" variant="danger" leftIcon={<LuX size={13} />} isDisabled={busy} onClick={() => setAction("reject")}>
                {t("money.rejectVerb")}
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
              {t("money.reverseVerb")}
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
