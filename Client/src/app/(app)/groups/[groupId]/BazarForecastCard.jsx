"use client";

/**
 * Bazar forecast card (`GET /meals/:groupId/bazar-forecast?days=7`).
 * Expected spend = portions × trailing-30-day median price per category, with a
 * quartile band. Renders "not enough history" instead of guessing when the group
 * has no approved food expenses yet.
 *
 * Mobile-first: the horizon is a 3-up pill switch (no dropdown), values stack.
 */
import { useCallback, useEffect, useState } from "react";
import { LuChartBar, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const HORIZON_VALUES = [7, 14, 30];

const CONFIDENCE_KEY = {
  high: "forecast.confidence.high",
  medium: "forecast.confidence.medium",
  low: "forecast.confidence.low",
  none: "forecast.confidence.none",
};

const CONFIDENCE_TONE = {
  high: "bg-(--success-bg) text-(--success)",
  medium: "bg-(--info-bg) text-(--info)",
  low: "bg-(--warning-bg) text-(--warning)",
  none: "bg-(--bgm) text-(--tm)",
};

export default function BazarForecastCard({ groupId, initialForecast = null }) {
  const t = useT();
  const { fmt, n } = useMoney();
  const { showToast } = useToast();
  const [days, setDays] = useState(7);
  const [forecast, setForecast] = useState(initialForecast);
  const [loading, setLoading] = useState(!initialForecast);

  const load = useCallback(async (horizon = days) => {
    setLoading(true);
    try {
      setForecast(await routinesApi.bazarForecast(groupId, String(horizon)));
    } catch (ex) {
      showToast({ status: "error", title: t("overview.couldNotLoadForecast"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t, days]);

  useEffect(() => {
    if (!initialForecast) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeDays = (value) => {
    setDays(value);
    load(value);
  };

  const topCategories = (forecast?.categories || []).slice(0, 4);
  const confidence = forecast?.confidence;

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-(--bd) bg-(--bgs)">
      <header className="flex items-center justify-between gap-2 border-b border-(--bd) px-3.5 py-2.5 sm:px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-(--tp)">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p)">
            <LuChartBar size={14} />
          </span>
          <span className="truncate">{t("forecast.title")}</span>
        </h2>
        <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={() => load()}>
          <LuRefreshCw size={14} />
        </Button>
      </header>

      <div className="space-y-3 px-3.5 py-3 sm:px-4">
        <div className="flex gap-1 rounded-full bg-(--bgm) p-1" role="group" aria-label={t("forecast.title")}>
          {HORIZON_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeDays(value)}
              aria-pressed={days === value}
              className={`min-h-9 flex-1 rounded-full text-[11.5px] font-semibold transition-colors ${days === value ? "bg-(--bgs) text-(--p) shadow-sm" : "text-(--tm) hover:text-(--ts)"
                }`}
            >
              {t("forecast.horizon", { days: n(value) })}
            </button>
          ))}
        </div>

        {loading && !forecast ? (
          <Skeleton variant="rect" height={96} className="rounded-xl" />
        ) : forecast?.insufficientData ? (
          <p className="rounded-xl bg-(--bgm) px-3 py-3 text-xs leading-relaxed text-(--tm)">
            {t("forecast.insufficient")}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">
                  {t("forecast.expectedSpend", { days: n(forecast?.days || 0) })}
                </p>
                <p className="truncate text-2xl font-extrabold tabular-nums text-(--tp)">
                  {fmt(forecast?.expectedPoisha || 0)}
                </p>
                <p className="mt-0.5 text-[11px] text-(--tm)">
                  {t("forecast.likely", {
                    low: fmt(forecast?.band?.lowPoisha || 0),
                    high: fmt(forecast?.band?.highPoisha || 0),
                  })}
                </p>
              </div>
              {confidence && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${CONFIDENCE_TONE[confidence] || CONFIDENCE_TONE.none
                    }`}
                >
                  {CONFIDENCE_KEY[confidence] ? t(CONFIDENCE_KEY[confidence]) : confidence}
                </span>
              )}
            </div>

            {topCategories.length > 0 && (
              <ul className="space-y-1">
                {topCategories.map((cat) => (
                  <li
                    key={cat.categoryId || cat.name}
                    className="flex min-h-8 items-center justify-between gap-2 rounded-lg bg-(--bgm) px-2.5 text-xs"
                  >
                    <span className="truncate text-(--ts)">{cat.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-(--tp)">{fmt(cat.expectedPoisha)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
