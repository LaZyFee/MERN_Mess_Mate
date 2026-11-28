"use client";

/**
 * One expense row — collapsed summary, expandable details.
 * Mobile-first: the whole header is a tap target; the detail panel is a
 * self-contained block with lines, receipts and role actions.
 */
import { useState } from "react";
import { LuChevronDown, LuChevronUp, LuReceipt, LuWallet, LuPaperclip } from "react-icons/lu";
import { StatusBadge as SB } from "@/components/shared/StatusBadge";
import { formatMonth, formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import ExpenseActions from "./ExpenseActions";
import ReceiptsPanel from "./ReceiptsPanel";

function shortId(value) {
  const text = String(value || "");
  return text.length > 8 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
}

export default function ExpenseCard({ groupId, expense, canTreasurer, onChanged }) {
  const t = useT();
  const { lang, fmt, n } = useMoney();
  const [open, setOpen] = useState(false);
  const lines = Array.isArray(expense.lines) ? expense.lines : [];
  const dateLabel = expense.date ? formatDay(String(expense.date).slice(0, 10), lang) : "";
  const receipts = (expense.attachments || expense.receipts || []).length;
  const title = expense.description || expense.supplierName || lines[0]?.description || t("exp.fallbackTitle");

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-2xl border bg-(--bgs) transition-colors ${
        open ? "border-(--p)/45" : "border-(--bd)"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/40 sm:px-4"
      >
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p)">
          <LuReceipt size={15} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <SB type="expense" status={expense.status} />
            {expense.isPayable && (
              <span className="rounded-full bg-(--warning-bg) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--warning)">
                {t("exp.payable")}
              </span>
            )}
            {lines.length > 1 && (
              <span className="rounded-full bg-(--bgm) px-2 py-0.5 text-[10px] font-bold text-(--tm)">
                {t("exp.lineCount", { count: n(lines.length) })}
              </span>
            )}
            {receipts > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-(--tm)">
                <LuPaperclip size={10} /> {n(receipts)}
              </span>
            )}
          </span>

          <span className="mt-1 block truncate text-[13.5px] font-bold text-(--tp)">{title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-(--tm)">
            {dateLabel}
            {expense.costPeriod ? ` · ${formatMonth(expense.costPeriod, lang)}` : ""}
            {expense.receiptReference ? ` · ${expense.receiptReference}` : ""}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-extrabold tabular-nums text-(--tp)">{fmt(expense.amount)}</span>
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-(--p)">
            {open ? t("exp.hide") : t("exp.details")}
            {open ? <LuChevronUp size={13} /> : <LuChevronDown size={13} />}
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-(--bd) px-3 py-3 sm:px-4">
          {expense.rejectionReason && (
            <p className="rounded-xl bg-(--danger-bg) px-2.5 py-2 text-xs text-(--danger)">
              {t("exp.rejectedReason", { reason: expense.rejectionReason })}
            </p>
          )}

          {lines.length > 0 && (
            <ul className="space-y-1">
              {lines.map((line, index) => (
                <li
                  key={line._id || index}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-(--bgm) px-2.5 py-1.5 text-[13px]"
                >
                  <span className="min-w-0 truncate text-(--ts)">
                    {line.description || line.categoryName || line.category || t("exp.lineFallback")}
                    {line.splitMode ? (
                      <span className="ml-1 text-[10px] text-(--tl)">· {t(`split.${line.splitMode}`)}</span>
                    ) : (
                      ""
                    )}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-(--tp)">{fmt(line.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          {Array.isArray(expense.payers) && expense.payers.length > 0 && (
            <div className="flex items-start gap-1.5 text-[11px] text-(--tm)">
              <LuWallet size={12} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                {t("exp.payers")}:{" "}
                {expense.payers.map((payer) => `${shortId(payer.memberId)} — ${fmt(payer.amount)}`).join(", ")}
              </span>
            </div>
          )}

          <ReceiptsPanel groupId={groupId} expense={expense} onUploaded={() => onChanged?.()} />
          <ExpenseActions groupId={groupId} expense={expense} canTreasurer={canTreasurer} onChanged={onChanged} />
        </div>
      )}
    </article>
  );
}
