"use client";

import { useState } from "react";
import { LuChevronDown, LuReceiptText } from "react-icons/lu";
import Button from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import ExplainBillDrawer from "./ExplainBillDrawer";

// `money: true` columns are integer poisha; `plain: true` columns are counts.
const COLUMNS = [
  { key: "mealUnits", labelKey: "stmt.colMeals", numeric: true },
  { key: "mealCost", labelKey: "stmt.colMealCost", money: true },
  { key: "otherCost", labelKey: "stmt.colOther", money: true },
  { key: "totalCharge", labelKey: "stmt.colTotal", money: true },
  { key: "contributions", labelKey: "stmt.colPaid", money: true },
  { key: "closingCredit", labelKey: "stmt.colClosing", money: true },
];

function cellValue(item, column, fmt, n) {
  const value = item[column.key];
  if (column.key === "mealUnits") return n(Number(value || 0));
  if (column.money) return fmt(value);
  return value ?? "—";
}

function closingTone(item) {
  if (item.status === "settled") return "text-(--success)";
  if (item.status === "owes") return "text-(--danger)";
  return "text-(--p)";
}

export default function StatementDetail({ statement, versions = [], activeVersionId, onSelectVersion, groupId }) {
  const t = useT();
  const { lang, fmt, n } = useMoney();
  const [explain, setExplain] = useState(null); // { membershipId, displayName }
  if (!statement) {
    return (
      <p className="rounded-lg border border-(--bd) bg-(--bgs) p-4 text-sm text-(--tm)">
        {t("stmt.selectMonth")}
      </p>
    );
  }
  const items = Array.isArray(statement.items) ? statement.items : [];
  const currentVersionId = activeVersionId || statement._id;

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("stmt.totalMeals")}</p>
          <p className="text-lg font-extrabold tabular-nums text-(--tp)">{n(Number(statement.totalMeals || 0))}</p>
        </div>
        <div className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("stmt.mealExpenses")}</p>
          <p className="text-lg font-extrabold tabular-nums text-(--tp)">{fmt(statement.mealExpenses)}</p>
        </div>
        <div className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("stmt.otherExpenses")}</p>
          <p className="text-lg font-extrabold tabular-nums text-(--tp)">{fmt(statement.otherExpenses)}</p>
        </div>
        <div className="rounded-lg border border-(--p) bg-(--pale) p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-(--p)">{t("stmt.mealRate")}</p>
          <p className="text-lg font-extrabold tabular-nums text-(--p)">
            {statement.mealRate != null ? fmt(statement.mealRate) : "—"}
          </p>
        </div>
      </div>

      {versions.length > 1 && (
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("stmt.versions")}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {versions.map((version) => {
              const active = String(version._id) === String(currentVersionId);
              return (
                <button
                  key={version._id}
                  type="button"
                  onClick={() => onSelectVersion?.(version)}
                  className={`flex min-h-11 shrink-0 flex-col items-start rounded-lg border px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p) ${active ? "border-(--p) bg-(--pale)" : "border-(--bd) bg-(--bgs)"}`}
                >
                  <span className="text-xs font-bold text-(--tp)">v{n(version.version)}</span>
                  <span className="text-[10px] text-(--tm)">
                    {version.state === "superseded" ? t("stmt.superseded") : t("stmt.current")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-(--bd) bg-(--bgs) md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-(--bd) bg-(--bgm) text-left text-[11px] uppercase tracking-wide text-(--tm)">
              <th className="sticky left-0 z-10 bg-(--bgm) px-3 py-2">{t("stmt.member")}</th>
              {COLUMNS.map((column) => (
                <th key={column.key} className="px-3 py-2 text-right">
                  {t(column.labelKey)}
                </th>
              ))}
              <th className="px-3 py-2 text-right">{t("stmt.status")}</th>
              <th className="px-3 py-2 text-right">{t("stmt.bill")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.membershipId} className="border-b border-(--bd) last:border-0">
                <td className="sticky left-0 z-10 truncate bg-(--bgs) px-3 py-2 font-semibold text-(--tp)">
                  {item.displayName}
                </td>
                {COLUMNS.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-2 text-right tabular-nums ${column.key === "closingCredit" ? closingTone(item) : "text-(--ts)"
                      }`}
                  >
                    {cellValue(item, column, fmt, n)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <StatusBadge type="statement_item" status={item.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" leftIcon={<LuReceiptText size={12} />} onClick={() => setExplain(item)}>
                    {t("stmt.explain")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-2 md:hidden">
        {items.map((item) => (
          <details key={item.membershipId} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-(--tp)">{item.displayName}</span>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${closingTone(item)}`}>
                {fmt(item.closingCredit)}
              </span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1 border-t border-(--bd) pt-2 text-xs">
              {COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center justify-between gap-2">
                  <span className="text-(--tm)">{t(column.labelKey)}</span>
                  <span className="tabular-nums text-(--ts)">{cellValue(item, column, fmt, n)}</span>
                </div>
              ))}
              <div className="col-span-2 mt-1 flex items-center justify-between">
                <span className="text-(--tm)">{t("stmt.status")}</span>
                <StatusBadge type="statement_item" status={item.status} />
              </div>
              <button
                type="button"
                onClick={() => setExplain(item)}
                className="col-span-2 mt-1 flex min-h-11 items-center justify-center gap-1 rounded-md border border-(--bd) text-xs font-semibold text-(--p)"
              >
                <LuReceiptText size={13} /> {t("stmt.explainMyBill")}
              </button>
            </div>
          </details>
        ))}
      </div>

      {statement.policySnapshot && (
        <details className="rounded-lg border border-(--bd) bg-(--bgm) p-3">
          <summary className="flex cursor-pointer items-center gap-1 text-xs font-bold text-(--tm)">
            {t("stmt.policySnapshot")} <LuChevronDown size={13} />
          </summary>
          <pre className="mt-2 overflow-x-auto text-[11px] text-(--ts)">
            {JSON.stringify(statement.policySnapshot, null, 2)}
          </pre>
        </details>
      )}

      <p className="text-[11px] text-(--tm)">
        {t("stmt.finalizedOn", {
          date: statement.finalizedAt ? formatDay(String(statement.finalizedAt).slice(0, 10), lang) : "—",
          v: n(statement.version),
        })}
      </p>

      {explain && (
        <ExplainBillDrawer
          groupId={groupId}
          month={statement.month}
          membershipId={explain.membershipId}
          displayName={explain.displayName}
          onClose={() => setExplain(null)}
        />
      )}
    </div>
  );
}
