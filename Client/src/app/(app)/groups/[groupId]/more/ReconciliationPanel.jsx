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
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const RESOLUTION_VALUES = ["adjusted", "accepted_shortage", "found_cash"];

function varianceTone(variance) {
  if (variance === 0) return "text-(--success)";
  return variance > 0 ? "text-(--warning)" : "text-(--danger)";
}

export default function ReconciliationPanel({ groupId }) {
  const t = useT();
  const { lang, fmt, parse, errorText } = useMoney();
  const { showToast } = useToast();
  const [funds, setFunds] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [equation, setEquation] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [asOf, setAsOf] = useState("");
  const [counted, setCounted] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fundRes, recRes, eqRes, sugRes] = await Promise.all([
        moneyApi.funds(groupId).catch(() => null),
        reconciliationApi.list(groupId).catch(() => null),
        reconciliationApi.equation(groupId).catch(() => null),
        reconciliationApi.suggestions(groupId).catch(() => null),
      ]);
      setFunds(fundRes?.funds || []);
      setReconciliations(recRes?.reconciliations || []);
      setEquation(eqRes || null);
      setSuggestions(sugRes || null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    const parsed = parse(counted, { allowZero: true });
    if (!accountId || !parsed.ok) {
      showToast({ status: "warning", title: t("recon.pickAndCount"), description: parsed.ok ? undefined : errorText(parsed.reason) });
      return;
    }
    setSaving(true);
    try {
      const res = await reconciliationApi.create(groupId, {
        accountId,
        actualBalance: parsed.poisha,
        asOf: asOf ? `${asOf}T00:00:00.000Z` : undefined,
      });
      showToast({ status: "success", title: res?.msg || t("recon.saved") });
      setCounted("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("recon.couldNotReconcile"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "success", title: t("recon.resolved") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("recon.resolveFailed"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const fundOptions = funds.map((fund) => ({
    value: fund._id,
    label: `${fund.name} · ${fmt(fund.balancePoisha)}`,
  }));
  const resolutionOptions = RESOLUTION_VALUES.map((value) => ({ value, label: t(`recon.resolution.${value}`) }));

  if (loading) return <Skeleton variant="rect" height={180} />;

  return (
    <Card padding="md" className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
          <LuScale size={16} className="text-(--p)" /> {t("recon.title")}
        </h2>
        <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} onClick={load}>
          <LuRefreshCw size={14} />
        </Button>
      </div>

      {equation && (
        <div className="mt-2 rounded-lg border border-(--bd) bg-(--bgm) p-2 text-xs">
          <p className="font-bold text-(--ts)">
            {t("recon.equation")}:{" "}
            <span className={equation.balanced ? "text-(--success)" : "text-(--danger)"}>
              {equation.balanced ? t("recon.balanced") : t("recon.notBalanced")}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-(--tm)">
            {t("recon.debitsCredits", { debits: fmt(equation.totalDebits), credits: fmt(equation.totalCredits) })}
          </p>
        </div>
      )}

      {suggestions && (
        <div className="mt-3 rounded-lg border border-(--bd) bg-(--bgs) p-3">
          <p className="mb-1 flex items-center justify-between gap-2 text-xs font-bold text-(--ts)">
            <span>{t("recon.suggestedChecks")}</span>
            {suggestions.summary && (
              <span className="text-[10px] font-semibold text-(--tm)">
                {t("recon.items", { count: suggestions.summary.total })}
                {suggestions.summary.atRiskPoisha > 0 ? ` · ${t("recon.atRisk", { amount: fmt(suggestions.summary.atRiskPoisha) })}` : ""}
              </span>
            )}
          </p>
          {(suggestions.suggestions || []).length === 0 ? (
            <p className="text-[11px] text-(--tm)">{t("recon.nothingOff")}</p>
          ) : (
            <ul className="space-y-1">
              {(suggestions.suggestions || []).slice(0, 10).map((item, index) => (
                <li
                  key={`${item.kind}-${item.expenseId || item.transactionId || index}`}
                  className="rounded-md border-l-2 border-(--bd) bg-(--bgm) px-2 py-1"
                >
                  <p className="text-[11px] font-semibold text-(--ts)">{item.title}</p>
                  <p className="text-[10px] text-(--tm)">
                    {item.detail}
                    {item.amountPoisha ? ` · ${fmt(item.amountPoisha)}` : ""}
                    {item.action ? ` · ${item.action}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select
          size="lg"
          label={t("money.funds")}
          placeholder={t("recon.chooseFund")}
          options={fundOptions}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        />
        <Input size="lg" type="date" label={t("recon.asOf")} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        <Input
          size="lg"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          label={t("recon.counted")}
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
        {t("recon.recordCount")}
      </Button>

      <div className="mt-3 space-y-2">
        {reconciliations.length === 0 ? (
          <p className="py-3 text-center text-xs text-(--tm)">{t("recon.none")}</p>
        ) : (
          reconciliations.map((rec) => (
            <div key={rec._id} className="rounded-lg border border-(--bd) bg-(--bgs) p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-(--tm)">
                  {rec.asOf ? formatDay(String(rec.asOf).slice(0, 10), lang) : "—"}
                  {" · "}{t("recon.expected", { amount: fmt(rec.expectedBalance) })}
                  {" · "}{t("recon.countedLabel", { amount: fmt(rec.actualBalance) })}
                </p>
                <p className={`text-sm font-bold tabular-nums ${varianceTone(Number(rec.variance))}`}>
                  {Number(rec.variance) >= 0 ? "+" : ""}
                  {fmt(rec.variance)}
                </p>
              </div>
              {rec.resolvedAt ? (
                <p className="mt-1 text-[11px] text-(--success)">
                  {t("recon.resolvedLabel", { resolution: rec.resolution ? t(`recon.resolution.${rec.resolution}`) : t("more.done") })}
                </p>
              ) : Number(rec.variance) !== 0 ? (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Select
                    size="sm"
                    placeholder={t("recon.resolutionLabel")}
                    options={resolutionOptions}
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
                    {t("recon.resolve")}
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-(--success)">{t("recon.matched")}</p>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
