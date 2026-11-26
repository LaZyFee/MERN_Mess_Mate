"use client";

/**
 * Admin overview: headline counters + 30-day signup/audit traffic chart.
 * Chart.js is code-split with ssr:false (canvas only, colors from CSS vars).
 */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LuUsers, LuBoxes, LuUserCheck, LuFileText, LuActivity, LuShieldCheck } from "react-icons/lu";
import Card from "@/components/shared/Card";
import Skeleton from "@/components/shared/Skeleton";
import AdminHealthPanel from "./AdminHealthPanel";

const ChartCanvas = dynamic(() => import("@/components/charts/ChartCanvas"), {
  ssr: false,
  loading: () => <Skeleton variant="rect" height={220} />,
});

function readVar(name, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const TONE_ICON = {
  info: "bg-(--info-bg) text-(--info)",
  success: "bg-(--success-bg) text-(--success)",
  warning: "bg-(--warning-bg) text-(--warning)",
  danger: "bg-(--danger-bg) text-(--danger)",
};

function StatCard({ icon: Icon, label, value, tone = "info", hint }) {
  return (
    <Card variant="outlined" padding="md" className="min-w-0">
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${TONE_ICON[tone] || TONE_ICON.info}`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
          <p className="text-xl font-extrabold tabular-nums text-(--tp)">{value}</p>
          {hint && <p className="mt-0.5 truncate text-[10px] text-(--tl)">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

function mergeBuckets(signups = [], actions = []) {
  const map = new Map();
  (signups || []).forEach((row) => map.set(row._id, { signups: row.count, actions: 0 }));
  (actions || []).forEach((row) => {
    const entry = map.get(row._id) || { signups: 0, actions: 0 };
    entry.actions = row.count;
    map.set(row._id, entry);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

export default function AdminOverviewClient({ initialOverview, initialTraffic }) {
  const totals = initialOverview?.totals || {};
  const traffic = initialOverview?.traffic || {};
  const [palette, setPalette] = useState([]);

  useEffect(() => {
    setPalette([
      readVar("--tm"),
      readVar("--chart-1"),
      readVar("--chart-2"),
      readVar("--chart-3"),
      readVar("--chart-4"),
      readVar("--chart-5"),
    ]);
  }, []);

  const buckets = useMemo(() => mergeBuckets(initialTraffic?.signups, initialTraffic?.auditActions), [initialTraffic]);

  const labels = buckets.map(([day]) => day.slice(5));
  const datasets = [
    { label: "Signups", data: buckets.map(([, v]) => v.signups), colorIndex: 1 },
    { label: "Audit events", data: buckets.map(([, v]) => v.actions), colorIndex: 3 },
  ];

  return (
    <div className="flex flex-col gap-(--space-4)">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={LuUsers} label="Users" value={totals.users ?? 0} tone="info" hint={`${traffic.verifiedUsers ?? 0} verified`} />
        <StatCard icon={LuBoxes} label="Groups" value={totals.groups ?? 0} tone="success" hint={`${totals.membershipsActive ?? 0} active memberships`} />
        <StatCard icon={LuUserCheck} label="Signups 7d" value={traffic.newUsers7d ?? 0} tone="warning" hint={`${traffic.newUsers24h ?? 0} in 24h`} />
        <StatCard icon={LuFileText} label="Statements" value={totals.statements ?? 0} tone="danger" hint="finalized versions" />
      </div>

      <Card variant="outlined" padding="md" className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-(--tp)">
            <LuActivity size={15} /> Last 30 days
          </h2>
          <p className="flex items-center gap-1 text-[10px] text-(--tm)">
            <LuShieldCheck size={12} /> {traffic.auditEvents24h ?? 0} audit events in 24h
          </p>
        </div>
        {buckets.length === 0 ? (
          <p className="py-10 text-center text-xs text-(--tm)">No traffic recorded yet.</p>
        ) : (
          <ChartCanvas type="line" labels={labels} datasets={datasets} palette={palette} />
        )}
      </Card>

      <AdminHealthPanel />
    </div>
  );
}
