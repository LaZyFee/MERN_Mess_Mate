"use client";

/**
 * One ledger transaction.
 * Mobile-first: icon + title + amount on the first line, meta chips below,
 * treasury actions as thumb-sized buttons.
 */
import { useState } from "react";
import {
  LuArrowDownLeft,
  LuArrowLeftRight,
  LuArrowUpRight,
  LuBanknote,
  LuHandCoins,
  LuPercent,
  LuRotateCcw,
  LuStore,
  LuCheck,
  LuX,
  LuExternalLink,
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

const KIND_ICONS = {
  contribution: LuArrowDownLeft,
  payout: LuArrowUpRight,
  supplier_payment: LuStore,
  member_settlement: LuHandCoins,
  transfer: LuArrowLeftRight,
  fee: LuPercent,
};

const INFLOW = new Set(["contribution"]);

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
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={onClose} isDisabled={saving}>
            {t("shell.cancel")}
          </Button>
          <Button
            variant={rule.danger ? "danger" : "primary"}
            isFullWidth
            className="sm:!w-fit"
            isLoading={saving}
            isDisabled={saving || (rule.reason && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {t(rule.verbKey)}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-(--tm)">
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
  const from = memberLabel(tx.fromMember, t("money.member"));
  const to = memberLabel(tx.toMember, t("money.member"));
  const inflow = INFLOW.has(tx.kind);

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
    <article className="min-w-0 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs) p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${inflow ? "bg-(--success-bg) text-(--success)" : "bg-(--pale) text-(--p)"
            }`}
        >
          <Icon size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge type="money" status={tx.status} />
            <span className="truncate text-[11.5px] font-semibold text-(--ts)">{t(`money.kind.${tx.kind}`)}</span>
          </div>
          <p className="mt-1 truncate text-[12.5px] text-(--tm)">
            {from ? `${from} → ` : ""}
            {to || tx.supplierName || ""}
            {tx.paidAt ? ` · ${formatDay(String(tx.paidAt).slice(0, 10), lang)}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-(--tm)">
            <span className="inline-flex items-center gap-1 rounded-full bg-(--bgm) px-2 py-0.5 font-semibold">
              <LuBanknote size={10} /> {t(`money.method.${tx.method}`)}
            </span>
            {tx.reference && <span className="max-w-[46%] truncate">#{tx.reference}</span>}
            {tx.evidenceUrl && (
              <a
                href={tx.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-(--p) no-underline"
              >
                {t("money.evidence")} <LuExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        <p
          className={`shrink-0 text-right text-[15px] font-extrabold tabular-nums ${inflow ? "text-(--success)" : "text-(--tp)"
            }`}
        >
          {inflow ? "+" : ""}
          {fmt(tx.amount)}
        </p>
      </div>

      {canTreasurer && ["submitted", "confirmed"].includes(tx.status) && (
        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-(--bd) pt-2.5">
          {tx.status === "submitted" && (
            <>
              <Button
                size="sm"
                className="rounded-lg"
                leftIcon={<LuCheck size={13} />}
                isDisabled={busy}
                onClick={() => setAction("confirm")}
              >
                {t("money.confirmVerb")}
              </Button>
              <Button
                size="sm"
                className="rounded-lg"
                variant="danger"
                leftIcon={<LuX size={13} />}
                isDisabled={busy}
                onClick={() => setAction("reject")}
              >
                {t("money.rejectVerb")}
              </Button>
            </>
          )}
          {tx.status === "confirmed" && (
            <Button
              size="sm"
              className="col-span-2 rounded-lg"
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
        <ReasonModal action={action} saving={busy} onClose={() => setAction(null)} onConfirm={confirmAction} />
      )}
    </article>
  );
}
