"use client";

import { LuFileText, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMonth } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

export default function StatementList({ statements, activeMonth, onSelect, loading, onRefresh }) {
  const t = useT();
  const { lang, fmt, n } = useMoney();
  return (
    <Card
      padding="md"
      header={
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-(--tp)">
            <LuFileText size={16} className="shrink-0 text-(--p)" />
            <span className="truncate">{t("stmt.tabStatements")}</span>
          </h2>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              isRound
              ariaLabel={t("shell.refresh")}
              isLoading={loading}
              onClick={onRefresh}
            >
              <LuRefreshCw size={15} />
            </Button>
          )}
        </div>
      }
    >
      {statements.length === 0 ? (
        <div className="py-6 text-center">
          <LuFileText size={26} className="mx-auto mb-2 text-(--tm)" />
          <p className="text-sm font-semibold text-(--tp)">{t("stmt.noStatements")}</p>
          <p className="mt-1 text-xs text-(--tm)">{t("stmt.noStatementsHint")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {statements.map((statement) => {
            const active = activeMonth === statement.month;
            return (
              <li key={statement._id || statement.month}>
                <button
                  type="button"
                  onClick={() => onSelect(statement.month)}
                  className={`flex min-h-14 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p) ${active ? "border-(--p) bg-(--pale)" : "border-(--bd) bg-(--bgs) hover:bg-(--bgm)"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-(--tp)">{formatMonth(statement.month, lang)}</p>
                    <p className="truncate text-[11px] text-(--tm)">
                      {t("stmt.versionChip", {
                        v: n(statement.version),
                        total: fmt(statement.totalExpenses),
                        rate: statement.mealRate != null ? fmt(statement.mealRate) : t("stmt.rateNa"),
                      })}
                    </p>
                  </div>
                  <StatusBadge type="period" status={statement.state === "superseded" ? "finalized" : "finalized"} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
