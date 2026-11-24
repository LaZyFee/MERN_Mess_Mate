"use client";

import { useMemo } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

function withAlpha(color) {
  // color-mix keeps us inside CSS-variable land (no raw color function literals).
  return (alpha) => (color ? `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)` : "transparent");
}

/**
 * Canvas-only chart wrapper. Colors are read from CSS variables at runtime and
 * passed in via `palette` so both themes stay in sync without literals.
 */
export default function ChartCanvas({ type, labels, datasets, palette = [], tooltipPrefix = "" }) {
  const textColor = palette[0] || undefined;

  const data = useMemo(
    () => ({
      labels,
      datasets: (datasets || []).map((dataset) => {
        const base = palette[dataset.colorIndex % (palette.length || 1)] || textColor;
        const alpha = withAlpha(base);
        const colors = dataset.multiColor
          ? labels.map((_, index) => palette[index % (palette.length || 1)] || base)
          : base;

        if (type === "doughnut") {
          return {
            label: dataset.label,
            data: dataset.data,
            backgroundColor: colors,
            borderWidth: 0,
          };
        }
        if (type === "line") {
          return {
            label: dataset.label,
            data: dataset.data,
            borderColor: base,
            backgroundColor: dataset.fill ? alpha(0.18) : "transparent",
            pointBackgroundColor: base,
            pointRadius: 3,
            borderWidth: 2,
            tension: 0.35,
            fill: Boolean(dataset.fill),
          };
        }
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: alpha(0.85),
          borderRadius: 6,
          borderWidth: 0,
        };
      }),
    }),
    [datasets, labels, palette, textColor, type],
  );

  const options = useMemo(() => {
    const isDoughnut = type === "doughnut";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: isDoughnut,
          position: "bottom",
          labels: { color: textColor, boxWidth: 10, boxHeight: 10, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const raw = type === "doughnut" ? context.parsed : context.parsed.y;
              const numeric = typeof raw === "number" ? raw : 0;
              const text = tooltipPrefix === "৳" ? (numeric / 100).toFixed(2) : String(Math.round(numeric));
              return `${context.dataset.label || context.label}: ${tooltipPrefix}${text}`;
            },
          },
        },
      },
      scales: isDoughnut
        ? {}
        : {
          x: {
            ticks: { color: textColor, maxRotation: 0, autoSkip: true },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor },
            grid: { color: withAlpha(textColor)(0.12) },
          },
        },
    };
  }, [textColor, tooltipPrefix, type]);

  const Chart = type === "doughnut" ? Doughnut : type === "line" ? Line : Bar;

  return (
    <div className="h-[220px] w-full sm:h-[260px]">
      <Chart data={data} options={options} />
    </div>
  );
}
