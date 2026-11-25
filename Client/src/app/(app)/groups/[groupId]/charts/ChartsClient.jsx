"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuChartBar, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { statsApi } from "@/lib/api/stats";
import { formatMonth, formatPoisha, toMonthString } from "@/lib/utils/format";

const ChartShell = dynamic(() => import("@/components/charts/ChartCanvas"), {
  ssr: false,
  loading: () => <Skeleton variant="rect" height={220} />,
});

const GRANULARITY = [
  { value: "month", label: "This month" },
  { value: "year", label: "Whole year" },
];

const CHART_VARS = ["--p", "--p2", "--p3", "--gold", "--warning", "--danger", "--info", "--success"];

function readVar(name) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function ChartsClient({ groupId, initialStats, initialMonth }) {
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
      showToast({ status: "error", title: "Could not load stats", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [granularity, groupId, month, showToast, year]);

  const years = useMemo(() => {
    const base = new Date().getFullYear();
    return [0, 1, 2, 3].map((offset) => ({ value: String(base - offset), label: String(base - offset) }));
  }, []);

  const mealSeries = stats?.mealsSeries || [];
  const expenseSeries = stats?.expenseSeries || [];
  const categories = stats?.categoryBreakdown || [];

  const labelOf = (row) =>
    granularity === "month" && typeof row.bucket === "number" ? String(row.bucket) : String(row.bucket ?? "");

  return (
    <div className="min-w-0 space-y-4">
      <Card padding="sm" variant="outlined">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            size="lg"
            label="Range"
            options={GRANULARITY}
            value={granularity}
            onChange={(event) => setGranularity(event.target.value)}
          />
          <Select size="lg" label="Year" options={years} value={year} onChange={(event) => setYear(event.target.value)} />
          {granularity === "month" && (
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--ts)">
              <span>Month</span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-12 w-full rounded-2xl border-[1.5px] border-(--bd2) bg-(--bgs) px-4 text-base text-(--tp) focus:border-(--p) focus:outline-none focus:ring-4 focus:ring-(--pale)"
              />
            </label>
          )}
        </div>
        <Button
          className="mt-2"
          size="md"
          variant="secondary"
          isFullWidth
          leftIcon={<LuRefreshCw size={14} />}
          isLoading={loading}
          onClick={load}
        >
          Apply
        </Button>
      </Card>

      {stats?.totals && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Card padding="sm" variant="outlined">
            <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">Meals</p>
            <p className="text-lg font-extrabold tabular-nums text-(--tp)">{Number(stats.totals.totalMeals || 0)}</p>
          </Card>
          <Card padding="sm" variant="outlined">
            <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">Expenses (legacy float)</p>
            <p className="text-lg font-extrabold tabular-nums text-(--tp)">
              {formatPoisha(Math.round(Number(stats.totals.totalExpenses || 0) * 100))}
            </p>
          </Card>
          <Card padding="sm" variant="outlined">
            <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">Meal rate</p>
            <p className="text-lg font-extrabold tabular-nums text-(--tp)">
              {formatPoisha(Math.round(Number(stats.totals.mealRate || 0) * 100))}
            </p>
          </Card>
        </div>
      )}

      <Card padding="md" className="min-w-0">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-(--tp)">
          <LuChartBar size={16} className="text-(--p)" /> Meals over time
        </h2>
        {mealSeries.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">No meal data for this range.</p>
        ) : (
          <ChartShell
            type="bar"
            labels={mealSeries.map(labelOf)}
            datasets={[
              {
                label: "Meals",
                data: mealSeries.map((row) => Number(row.meals || 0)),
                colorIndex: 0,
              },
            ]}
            palette={palette}
          />
        )}
      </Card>

      <Card padding="md" className="min-w-0">
        <h2 className="mb-2 text-sm font-bold text-(--tp)">Expenses over time</h2>
        {expenseSeries.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">No expense data for this range.</p>
        ) : (
          <ChartShell
            type="line"
            labels={expenseSeries.map(labelOf)}
            datasets={[
              {
                label: "Expenses (৳)",
                data: expenseSeries.map((row) => Number(row.amount || 0)),
                colorIndex: 1,
                fill: true,
              },
            ]}
            palette={palette}
            tooltipPrefix="৳"
          />
        )}
      </Card>

      <Card padding="md" className="min-w-0">
        <h2 className="mb-2 text-sm font-bold text-(--tp)">Spending by category</h2>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--tm)">No categories with spending yet.</p>
        ) : (
          <>
            <ChartShell
              type="doughnut"
              labels={categories.map((category) => category.name)}
              datasets={[
                {
                  data: categories.map((category) => Number(category.total || 0)),
                  multiColor: true,
                  colorIndex: 0,
                },
              ]}
              palette={palette}
              tooltipPrefix="৳"
            />
            <ul className="mt-3 space-y-1">
              {categories.map((category) => (
                <li key={String(category.categoryId)} className="flex items-center justify-between text-xs">
                  <span className="min-w-0 truncate text-(--ts)">
                    {category.icon ? `${category.icon} ` : ""}
                    {category.name}
                  </span>
                  <span className="tabular-nums text-(--tp)">
                    {formatPoisha(Math.round(Number(category.total || 0) * 100))}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-2 text-[11px] text-(--tm)">
          Legacy stats endpoint returns floats; amounts are converted with a single helper.
          {granularity === "year" ? ` Range: ${formatMonth(`${year}-01`)}–${formatMonth(`${year}-12`)}` : ""}
        </p>
      </Card>
    </div>
  );
}
