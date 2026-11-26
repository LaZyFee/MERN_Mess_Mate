"use client";

/**
 * T14.10 — Bazar forecast card (`GET /meals/:groupId/bazar-forecast?days=7`).
 * Expected spend = portions × trailing-30-day median price per category, with a
 * quartile band. Renders "not enough history" instead of guessing when the group
 * has no approved food expenses yet.
 */
import { useCallback, useEffect, useState } from "react";
import { LuChartBar, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatPoisha } from "@/lib/utils/format";

const HORIZONS = [
  { value: "7", label: "Next 7 days" },
  { value: "14", label: "Next 14 days" },
  { value: "30", label: "Next 30 days" },
];

const CONFIDENCE_LABEL = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  none: "No history yet",
};

export default function BazarForecastCard({ groupId, initialForecast = null }) {
  const { showToast } = useToast();
  const [days, setDays] = useState("7");
  const [forecast, setForecast] = useState(initialForecast);
  const [loading, setLoading] = useState(!initialForecast);

  const load = useCallback(async (horizon = days) => {
    setLoading(true);
    try {
      setForecast(await routinesApi.bazarForecast(groupId, horizon));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load the forecast", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, days, showToast]);

  useEffect(() => {
    if (!initialForecast) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeDays = (value) => {
    setDays(value);
    load(value);
  };

  const topCategories = (forecast?.categories || []).slice(0, 4);

  return (
    <Card
      padding="md"
      header={
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-(--tp)">
            <LuChartBar size={15} /> Bazar forecast
          </span>
          <Button size="sm" variant="ghost" isRound ariaLabel="Refresh forecast" isLoading={loading} onClick={() => load()}>
            <LuRefreshCw size={14} />
          </Button>
        </div>
      }
    >
      <Select size="sm" options={HORIZONS} value={days} onChange={(e) => changeDays(e.target.value)} />

      {loading && !forecast ? (
        <Skeleton variant="rect" height={80} className="mt-3" />
      ) : forecast?.insufficientData ? (
        <p className="mt-3 rounded-lg border border-(--bd) bg-(--bgm) p-3 text-xs text-(--tm)">
          Not enough approved food expenses yet. The forecast appears once the group has a few weeks of bazar history.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">Expected spend · {forecast?.days} days</p>
            <p className="text-2xl font-extrabold tabular-nums text-(--tp)">{formatPoisha(forecast?.expectedPoisha || 0)}</p>
            <p className="text-[11px] text-(--tm)">
              Likely {formatPoisha(forecast?.band?.lowPoisha || 0)} – {formatPoisha(forecast?.band?.highPoisha || 0)}
              {" · "}
              {CONFIDENCE_LABEL[forecast?.confidence] || forecast?.confidence}
            </p>
          </div>

          {topCategories.length > 0 && (
            <ul className="space-y-1">
              {topCategories.map((cat) => (
                <li key={cat.categoryId || cat.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-(--ts)">{cat.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-(--tp)">{formatPoisha(cat.expectedPoisha)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
