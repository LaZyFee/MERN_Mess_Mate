"use client";

import { useState } from "react";
import { LuChevronDown, LuChevronUp, LuReceipt } from "react-icons/lu";
import { StatusBadge as SB } from "@/components/shared/StatusBadge";
import { formatPoisha, formatMonth, formatDay } from "@/lib/utils/format";
import ExpenseActions from "./ExpenseActions";
import ReceiptsPanel from "./ReceiptsPanel";

function shortId(value) {
  const text = String(value || "");
  return text.length > 8 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
}

export default function ExpenseCard({ groupId, expense, canTreasurer, onChanged }) {
  const [open, setOpen] = useState(false);
  const lines = Array.isArray(expense.lines) ? expense.lines : [];
  const dateLabel = expense.date ? formatDay(String(expense.date).slice(0, 10)) : "";

  return (
    <div className="min-w-0 rounded-lg border border-(--bd) bg-(--bgs) p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SB type="expense" status={expense.status} />
            {expense.isPayable && (
              <span className="rounded-full bg-(--warning-bg) px-2 py-0.5 text-[10px] font-bold text-(--warning)">
                Payable
              </span>
            )}
            {lines.length > 1 && (
              <span className="rounded-full bg-(--bgm) px-2 py-0.5 text-[10px] font-bold text-(--tm)">
                {lines.length} lines
              </span>
            )}
          </div>
          <h2 className="mt-2 truncate font-bold text-(--tp)">
            {expense.description || expense.supplierName || lines[0]?.description || "Expense"}
          </h2>
          <p className="mt-0.5 truncate text-xs text-(--tm)">
            {dateLabel}
            {expense.costPeriod ? ` · ${formatMonth(expense.costPeriod)}` : ""}
            {expense.receiptReference ? ` · ${expense.receiptReference}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-(--tp)">{formatPoisha(expense.amount)}</p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-(--p) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
          >
            {open ? "Hide" : "Details"}
            {open ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-(--bd) pt-3">
          {expense.rejectionReason && (
            <p className="rounded-md bg-(--danger-bg) px-2 py-1 text-xs text-(--danger)">
              Rejected: {expense.rejectionReason}
            </p>
          )}
          <ul className="space-y-1">
            {lines.map((line, index) => (
              <li key={line._id || index} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-(--ts)">
                  <LuReceipt size={13} className="mr-1 inline text-(--tm)" />
                  {line.description || line.categoryName || line.category || "Line"}
                  {line.splitMode ? <span className="ml-1 text-[10px] text-(--tl)">· {line.splitMode}</span> : ""}
                </span>
                <span className="shrink-0 tabular-nums text-(--tp)">{formatPoisha(line.amount)}</span>
              </li>
            ))}
          </ul>
          {Array.isArray(expense.payers) && expense.payers.length > 0 && (
            <p className="text-xs text-(--tm)">
              Payers: {expense.payers.map((payer) => `${shortId(payer.memberId)} — ${formatPoisha(payer.amount)}`).join(", ")}
            </p>
          )}
          <ReceiptsPanel groupId={groupId} expense={expense} onUploaded={() => onChanged?.()} />
          <ExpenseActions groupId={groupId} expense={expense} canTreasurer={canTreasurer} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}
