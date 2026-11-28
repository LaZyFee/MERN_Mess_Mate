"use client";

/**
 * One finalized statement: headline numbers, version chips, member rows.
 * Mobile: summary tiles 2-up + collapsible member cards; desktop: full table.
 */
import { useState } from "react";
import { LuChevronDown, LuReceiptText, LuUsers, LuCalendarDays, LuPercent, LuWallet } from "react-icons/lu";
import Button from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState } from "../GroupUI";
import ExplainBillDrawer from "./ExplainBillDrawer";

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

function SummaryTile({ icon: Icon, label, value, accent = false }) {
  return (
    <div
      className={`min-w-0 rounded-2xl p-2.5 ${accent ? "bg-(--pale) ring-1 ring-(--p)/25" : "bg-(--bgm)"
        }`}
    >
      <p className={`flex items-center gap-1 truncate text-[10px] font-bold uppercase tracking-wide ${accent ? "text-(--p)" : "text-(--tm)"}`}>
        <Icon size={11} /> {label}
      </p>
      <p className={`mt-1 truncate text-[15px] font-extrabold tabular-nums ${accent ? "text-(--p)" : "text-(--tp)"}`}>
        {value}
      </p>
    </div>
  );
}

export default function StatementDetail({ statement, versions = [], activeVersionId, onSelectVersion, groupId }) {
  const t = useT();
  const { lang, fmt, n } = useMoney();
  const [explain, setExplain] = useState(null);

  if (!statement) {
    return (
      <div className="rounded-2xl border border-(--bd) bg-(--bgs)">
        <EmptyState icon={LuReceiptText} title={t("stmt.selectMonth")} body={t("stmt.noStatementsHint")} />
      </div>
    );
  }

  const items = Array.isArray(statement.items) ? statement.items : [];
  const currentVersionId = activeVersionId || statement._id;

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryTile icon={LuUsers} label={t("stmt.totalMeals")} value={n(Number(statement.totalMeals || 0))} />
        <SummaryTile icon={LuReceiptText} label={t("stmt.mealExpenses")} value={fmt(statement.mealExpenses)} />
        <SummaryTile icon={LuWallet} label={t("stmt.otherExpenses")} value={fmt(statement.otherExpenses)} />
        <SummaryTile
          icon={LuPercent}
          label={t("stmt.mealRate")}
          value={statement.mealRate != null ? fmt(statement.mealRate) : "—"}
          accent
        />
      </div>

      {versions.length > 1 && (
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("stmt.versions")}</p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {versions.map((version) => {
              const active = String(version._id) === String(currentVersionId);
              return (
                <button
                  key={version._id}
                  type="button"
                  onClick={() => onSelectVersion?.(version)}
                  aria-pressed={active}
                  className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-left transition-colors ${active ? "border-(--p) bg-(--p) text-(--bgs)" : "border-(--bd) bg-(--bgs) text-(--ts)"
                    }`}
                >
                  <span className="text-xs font-bold">v{n(version.version)}</span>
                  <span className={`text-[10px] ${active ? "opacity-80" : "text-(--tm)"}`}>
                    {version.state === "superseded" ? t("stmt.superseded") : t("stmt.current")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile member cards ─────────────────────────────── */}
      <div className="space-y-2 md:hidden">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-(--bgm) px-3 py-3 text-xs text-(--tm)">{t("overview.noCharges")}</p>
        ) : (
          items.map((item) => (
            <details key={item.membershipId} className="overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs)">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 px-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-(--tp)">{item.displayName}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-(--tm)">
                    {t("stmt.colMeals")}: {cellValue(item, COLUMNS[0], fmt, n)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className={`text-sm font-extrabold tabular-nums ${closingTone(item)}`}>
                    {fmt(item.closingCredit)}
                  </span>
                  <LuChevronDown size={14} className="text-(--tm)" />
                </span>
              </summary>
              <div className="space-y-1 border-t border-(--bd) px-3 py-2.5">
                {COLUMNS.map((column) => (
                  <div key={column.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-(--tm)">{t(column.labelKey)}</span>
                    <span className="font-semibold tabular-nums text-(--ts)">
                      {cellValue(item, column, fmt, n)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-(--tm)">{t("stmt.status")}</span>
                  <StatusBadge type="statement_item" status={item.status} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 rounded-xl"
                  isFullWidth
                  leftIcon={<LuReceiptText size={13} />}
                  onClick={() => setExplain(item)}
                >
                  {t("stmt.explainMyBill")}
                </Button>
              </div>
            </details>
          ))
        )}
      </div>

      {/* ── Desktop table ───────────────────────────────────── */}
      <div className="hidden overflow-x-auto rounded-2xl border border-(--bd) bg-(--bgs) md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-(--bd) bg-(--bgm) text-left text-[10.5px] uppercase tracking-wide text-(--tm)">
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

      {statement.policySnapshot && (
        <details className="rounded-2xl border border-(--bd) bg-(--bgm) p-3">
          <summary className="flex cursor-pointer items-center gap-1 text-xs font-bold text-(--tm)">
            {t("stmt.policySnapshot")} <LuChevronDown size={13} />
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto text-[11px] text-(--ts)">
            {JSON.stringify(statement.policySnapshot, null, 2)}
          </pre>
        </details>
      )}

      <p className="flex items-center gap-1 text-[11px] text-(--tm)">
        <LuCalendarDays size={11} />
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
