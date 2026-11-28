"use client";

/**
 * Charts tab — meals / expenses / category breakdown, month or year range.
 * Mobile-first: filters in a collapsible bar (range + year always visible), then
 * one chart per card with a compact legend list underneath.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuChartBar, LuChartLine, LuFileChartPie, LuRefreshCw, LuCalendarRange } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { statsApi } from "@/lib/api/stats";
import { formatMonth, toMonthString } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { MiniStat, SectionCard } from "../GroupUI";

const ChartShell = dynamic(() => import("@/components/charts/ChartCanvas"), {
  ssr: false,
  loading: () => <Skeleton variant="rect" height={220} className="rounded-2xl" />,
});

const GRANULARITY_VALUES = ["month", "year"];
const CHART_VARS = ["--p", "--p2", "--p3", "--gold", "--warning", "--danger", "--info", "--success"];

function readVar(name) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function ChartsClient({ groupId, initialStats, initialMonth }) {
  const t = useT();
  const { fmt, n, lang } = useMoney();
  const { showToast } = useToast();
  const [granularity, setGranularity] = useState("month");
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [month, setMonth] = useState(() => initialMonth || toMonthString(new Date()));
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [palette, setPalette] = useState([]);

  useEffect(() => {
    setPalette(CHART_VARS.map(readVar).filter(Boolean));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsApi.get(groupId, {
        granularity: "month",
        year,
        month: granularity === "month" ? month : undefined,
      });
      setStats(data);
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [granularity, groupId, month, showToast, year, t]);

  const years = useMemo(() => {
    const base = new Date().getFullYear();
    return [0, 1, 2, 3].map((offset) => ({ value: String(base - offset), label: String(base - offset) }));
  }, []);

  const mealSeries = stats?.mealsSeries || [];
  const expenseSeries = stats?.expenseSeries || [];
  const categories = stats?.categoryBreakdown || [];

  const labelOf = (row) =>
    granularity === "month" && typeof row.bucket === "number" ? String(row.bucket) : String(row.bucket ?? "");

  const categoryTotal = categories.reduce(
    (sum, category) => sum + Number(category.totalPoisha ?? category.total ?? 0),
    0,
  );

  return (
    <div className="min-w-0 space-y-3">
      <SectionCard
        icon={LuCalendarRange}
        title={t("charts.rangeLabel")}
        subtitle={granularity === "month" ? formatMonth(month, lang) : year}
        actions={
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Select
            size="md"
            label={t("charts.rangeLabel")}
            options={GRANULARITY_VALUES.map((value) => ({ value, label: t(`charts.granularity.${value}`) }))}
            value={granularity}
            onChange={(event) => setGranularity(event.target.value)}
          />
          <Select size="md" label={t("charts.year")} options={years} value={year} onChange={(event) => setYear(event.target.value)} />
          {granularity === "month" && (
            <div className="col-span-2">
              <Input
                size="md"
                type="month"
                label={t("charts.month")}
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
          )}
        </div>
        <Button
          className="mt-2 rounded-xl"
          size="md"
          variant="secondary"
          isFullWidth
          leftIcon={<LuRefreshCw size={14} />}
          isLoading={loading}
          onClick={load}
        >
          {t("exp.applyFilters")}
        </Button>
      </SectionCard>

      {stats?.totals && (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label={t("meals.monthlyMeals")} value={n(stats.totals.totalMeals || 0)} />
          <MiniStat
            label={t("exp.total")}
            value={fmt(stats.totals.totalExpensesPoisha ?? Math.round(Number(stats.totals.totalExpenses || 0) * 100))}
          />
          <MiniStat
            label={t("overview.mealRate")}
            value={fmt(stats.totals.mealRatePoisha ?? Math.round(Number(stats.totals.mealRate || 0) * 100))}
            tone="success"
          />
        </div>
      )}

      <SectionCard icon={LuChartBar} title={t("charts.mealsOverTime")}>
        {mealSeries.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">{t("charts.noMealData")}</p>
        ) : (
          <ChartShell
            type="bar"
            labels={mealSeries.map(labelOf)}
            datasets={[{ label: t("shell.meals"), data: mealSeries.map((row) => Number(row.meals || 0)), colorIndex: 0 }]}
            palette={palette}
          />
        )}
      </SectionCard>

      <SectionCard icon={LuChartLine} title={t("charts.expensesOverTime")}>
        {expenseSeries.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">{t("charts.noExpenseData")}</p>
        ) : (
          <ChartShell
            type="line"
            labels={expenseSeries.map(labelOf)}
            datasets={[
              {
                label: `${t("shell.expenses")} (৳)`,
                data: expenseSeries.map((row) => Number(row.amountPoisha ?? row.amount ?? 0)),
                colorIndex: 1,
                fill: true,
              },
            ]}
            palette={palette}
            tooltipPrefix="৳"
          />
        )}
      </SectionCard>

      <SectionCard icon={LuFileChartPie} title={t("charts.byCategory")} subtitle={fmt(categoryTotal)}>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">{t("charts.noCategoryData")}</p>
        ) : (
          <>
            <ChartShell
              type="doughnut"
              labels={categories.map((category) => category.name)}
              datasets={[
                {
                  data: categories.map((category) => Number(category.totalPoisha ?? category.total ?? 0)),
                  multiColor: true,
                  colorIndex: 0,
                },
              ]}
              palette={palette}
              tooltipPrefix="৳"
            />
            <ul className="mt-3 space-y-1">
              {categories.map((category) => {
                const value = Number(category.totalPoisha ?? Math.round(Number(category.total || 0) * 100));
                const pct = categoryTotal > 0 ? Math.round((value / categoryTotal) * 100) : 0;
                return (
                  <li key={String(category.categoryId)} className="rounded-lg bg-(--bgm) px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-(--ts)">
                        {category.icon ? `${category.icon} ` : ""}
                        {category.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-(--tp)">{fmt(value)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-(--bd)">
                        <div className="h-full rounded-full bg-(--p)" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                      <span className="text-[10px] tabular-nums text-(--tm)">{n(pct)}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="mt-2 text-[11px] text-(--tm)">
          {t("charts.rangeNote")}
          {granularity === "year" ? ` ${t("charts.range", { from: formatMonth(`${year}-01`, lang), to: formatMonth(`${year}-12`, lang) })}` : ""}
        </p>
      </SectionCard>
    </div>
  );
}
