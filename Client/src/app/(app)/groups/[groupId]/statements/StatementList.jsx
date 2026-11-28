"use client";

/**
 * Month picker for statements.
 * On mobile this is a horizontal month rail (one tap per month) instead of a
 * vertical list, so it never pushes the statement detail off-screen.
 */
import { LuFileText, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMonth } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState, SectionCard } from "../GroupUI";

export default function StatementList({ statements, activeMonth, onSelect, loading, onRefresh }) {
  const t = useT();
  const { lang, fmt, n } = useMoney();

  return (
    <SectionCard
      icon={LuFileText}
      title={t("stmt.tabStatements")}
      actions={
        onRefresh && (
          <Button variant="ghost" size="sm" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={onRefresh}>
            <LuRefreshCw size={15} />
          </Button>
        )
      }
      bodyClassName="px-0 py-2 sm:px-0"
    >
      {statements.length === 0 ? (
        <EmptyState icon={LuFileText} title={t("stmt.noStatements")} body={t("stmt.noStatementsHint")} />
      ) : (
        <>
          {/* Mobile: horizontal rail */}
          <div className="flex snap-x gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
            {statements.map((statement) => {
              const active = activeMonth === statement.month;
              return (
                <button
                  key={statement._id || statement.month}
                  type="button"
                  onClick={() => onSelect(statement.month)}
                  aria-pressed={active}
                  className={`flex min-h-[64px] min-w-[136px] shrink-0 snap-start flex-col justify-center rounded-2xl border px-3 text-left transition-colors ${active
                      ? "border-(--p) bg-(--pale) text-(--p)"
                      : "border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--bd2)"
                    }`}
                >
                  <span className="truncate text-[13px] font-bold">{formatMonth(statement.month, lang)}</span>
                  <span className="mt-0.5 truncate text-[10.5px] tabular-nums opacity-80">
                    v{n(statement.version)} · {fmt(statement.totalExpenses)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical list */}
          <ul className="hidden space-y-1.5 px-3.5 lg:block">
            {statements.map((statement) => {
              const active = activeMonth === statement.month;
              return (
                <li key={statement._id || statement.month}>
                  <button
                    type="button"
                    onClick={() => onSelect(statement.month)}
                    aria-pressed={active}
                    className={`flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/40 ${active
                        ? "border-(--p) bg-(--pale)"
                        : "border-(--bd) bg-(--bgs) hover:bg-(--bgm)"
                      }`}
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
                    <StatusBadge type="period" status="finalized" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
