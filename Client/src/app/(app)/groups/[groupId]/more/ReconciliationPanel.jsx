"use client";

import { useCallback, useEffect, useState } from "react";
import { LuCheck, LuRefreshCw, LuScale } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { reconciliationApi } from "@/lib/api/notifications";
import { moneyApi } from "@/lib/api/money";
import { formatPoisha, parseTaka, formatDay } from "@/lib/utils/format";

const RESOLUTIONS = [
  { value: "adjusted", label: "Adjust ledger (missed entry)" },
  { value: "accepted_shortage", label: "Accept shortage" },
  { value: "found_cash", label: "Found cash (unrecorded)" },
];

function varianceTone(variance) {
  if (variance === 0) return "text-(--success)";
  return variance > 0 ? "text-(--warning)" : "text-(--danger)";
}

export default function ReconciliationPanel({ groupId }) {
  const { showToast } = useToast();
  const [funds, setFunds] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [equation, setEquation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [asOf, setAsOf] = useState("");
  const [counted, setCounted] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fundRes, recRes, eqRes] = await Promise.all([
        moneyApi.funds(groupId).catch(() => null),
        reconciliationApi.list(groupId).catch(() => null),
        reconciliationApi.equation(groupId).catch(() => null),
      ]);
      setFunds(fundRes?.funds || []);
      setReconciliations(recRes?.reconciliations || []);
      setEquation(eqRes || null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!accountId || !counted) {
      showToast({ status: "warning", title: "Pick a fund and enter the counted amount" });
      return;
    }
    setSaving(true);
    try {
      const res = await reconciliationApi.create(groupId, {
        accountId,
        actualBalance: parseTaka(counted),
        asOf: asOf ? `${asOf}T00:00:00.000Z` : undefined,
      });
      showToast({ status: "success", title: res?.msg || "Reconciliation saved" });
      setCounted("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not reconcile", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (recId) => {
    const choice = resolving[recId];
    if (!choice) return;
    setSaving(true);
    try {
      await reconciliationApi.resolve(groupId, recId, { resolution: choice });
      showToast({ status: "success", title: "Reconciliation resolved" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Resolve failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const fundOptions = funds.map((fund) => ({
    value: fund._id,
    label: `${fund.name} · ${formatPoisha(fund.balancePoisha)}`,
  }));

  if (loading) return <Skeleton variant="rect" height={180} />;

  return (
    <Card padding="md" className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
          <LuScale size={16} className="text-(--p)" /> Cash reconciliation
        </h2>
        <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" onClick={load}>
          <LuRefreshCw size={14} />
        </Button>
      </div>

      {equation && (
        <div className="mt-2 rounded-lg border border-(--bd) bg-(--bgm) p-2 text-xs">
          <p className="font-bold text-(--ts)">
            Accounting equation:{" "}
            <span className={equation.balanced ? "text-(--success)" : "text-(--danger)"}>
              {equation.balanced ? "balanced" : "not balanced"}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-(--tm)">
            Debits {formatPoisha(equation.totalDebits)} · Credits {formatPoisha(equation.totalCredits)}
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          size="lg"
          label="Fund"
          placeholder="Choose fund"
          options={fundOptions}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        />
        <Input size="lg" type="date" label="As of" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        <Input
          size="lg"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          label="Counted (৳)"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
        />
      </div>
      <Button
        className="mt-2"
        size="md"
        isFullWidth
        leftIcon={<LuCheck size={14} />}
        isLoading={saving}
        isDisabled={saving}
        onClick={create}
      >
        Record count
      </Button>

      <div className="mt-3 space-y-2">
        {reconciliations.length === 0 ? (
          <p className="py-3 text-center text-xs text-(--tm)">No reconciliations recorded.</p>
        ) : (
          reconciliations.map((rec) => (
            <div key={rec._id} className="rounded-lg border border-(--bd) bg-(--bgs) p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-(--tm)">
                  {rec.asOf ? formatDay(String(rec.asOf).slice(0, 10)) : "—"} · expected {formatPoisha(rec.expectedBalance)} · counted{" "}
                  {formatPoisha(rec.actualBalance)}
                </p>
                <p className={`text-sm font-bold tabular-nums ${varianceTone(Number(rec.variance))}`}>
                  {Number(rec.variance) >= 0 ? "+" : ""}
                  {formatPoisha(rec.variance)}
                </p>
              </div>
              {rec.resolvedAt ? (
                <p className="mt-1 text-[11px] text-(--success)">Resolved: {rec.resolution || "done"}</p>
              ) : Number(rec.variance) !== 0 ? (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Select
                    size="sm"
                    placeholder="Resolution"
                    options={RESOLUTIONS}
                    value={resolving[rec._id] || ""}
                    onChange={(event) =>
                      setResolving((current) => ({ ...current, [rec._id]: event.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    isLoading={saving}
                    isDisabled={saving || !resolving[rec._id]}
                    onClick={() => resolve(rec._id)}
                  >
                    Resolve
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-(--success)">Matched exactly</p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
