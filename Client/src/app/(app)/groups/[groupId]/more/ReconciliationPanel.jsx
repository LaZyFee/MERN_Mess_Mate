"use client";

/**
 * Cash reconciliation: accounting equation, suggested checks, count entry and
 * variance resolution. All amounts are integer poisha from the server.
 *
 * Mobile-first: the count form stacks; reconciliation rows show the variance as
 * a signed, colour-coded number with an inline resolve control.
 */
import { useCallback, useEffect, useState } from "react";
import { LuCheck, LuRefreshCw, LuScale, LuCircleCheck, LuCircleAlert, LuCoins } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { reconciliationApi } from "@/lib/api/notifications";
import { moneyApi } from "@/lib/api/money";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState, MiniStat, SectionCard } from "../GroupUI";

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
  const totalFunds = funds.reduce((sum, fund) => sum + Number(fund.balancePoisha || 0), 0);

  if (loading) {
    return (
      <SectionCard icon={LuScale} title={t("recon.title")}>
        <Skeleton variant="rect" height={180} className="rounded-xl" />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={LuScale}
      title={t("recon.title")}
      subtitle={fmt(totalFunds)}
      actions={
        <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} onClick={load}>
          <LuRefreshCw size={14} />
        </Button>
      }
    >
      {equation && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-2xl px-3 py-2 ${equation.balanced ? "bg-(--success-bg)" : "bg-(--danger-bg)"
            }`}
        >
          {equation.balanced ? (
            <LuCircleCheck size={15} className="mt-0.5 shrink-0 text-(--success)" />
          ) : (
            <LuCircleAlert size={15} className="mt-0.5 shrink-0 text-(--danger)" />
          )}
          <div className="min-w-0">
            <p className={`text-xs font-bold ${equation.balanced ? "text-(--success)" : "text-(--danger)"}`}>
              {t("recon.equation")}: {equation.balanced ? t("recon.balanced") : t("recon.notBalanced")}
            </p>
            <p className="mt-0.5 text-[11px] text-(--tm)">
              {t("recon.debitsCredits", { debits: fmt(equation.totalDebits), credits: fmt(equation.totalCredits) })}
            </p>
          </div>
        </div>
      )}

      {suggestions && (
        <div className="mb-3 rounded-2xl border border-(--bd) bg-(--bgm) p-2.5">
          <p className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-(--ts)">
            <span>{t("recon.suggestedChecks")}</span>
            {suggestions.summary && (
              <span className="shrink-0 text-[10px] font-semibold text-(--tm)">
                {t("recon.items", { count: suggestions.summary.total })}
              </span>
            )}
          </p>
          {suggestions.summary?.atRiskPoisha > 0 && (
            <p className="mb-1.5 rounded-lg bg-(--danger-bg) px-2 py-1 text-[10.5px] font-semibold text-(--danger)">
              {t("recon.atRisk", { amount: fmt(suggestions.summary.atRiskPoisha) })}
            </p>
          )}
          {(suggestions.suggestions || []).length === 0 ? (
            <p className="text-[11px] text-(--tm)">{t("recon.nothingOff")}</p>
          ) : (
            <ul className="space-y-1">
              {(suggestions.suggestions || []).slice(0, 10).map((item, index) => (
                <li
                  key={`${item.kind}-${item.expenseId || item.transactionId || index}`}
                  className="rounded-lg border-l-2 border-(--warning) bg-(--bgs) px-2 py-1"
                >
                  <p className="truncate text-[11px] font-semibold text-(--ts)">{item.title}</p>
                  <p className="truncate text-[10px] text-(--tm)">
                    {item.detail}
                    {item.amountPoisha ? ` · ${fmt(item.amountPoisha)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Select
          size="md"
          label={t("money.funds")}
          placeholder={t("recon.chooseFund")}
          options={fundOptions}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input size="md" type="date" label={t("recon.asOf")} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          <Input
            size="md"
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
          size="md"
          className="rounded-xl"
          isFullWidth
          variant="secondary"
          leftIcon={<LuCheck size={14} />}
          isLoading={saving}
          isDisabled={saving}
          onClick={create}
        >
          {t("recon.recordCount")}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {reconciliations.length === 0 ? (
          <EmptyState icon={LuCoins} title={t("recon.none")} />
        ) : (
          reconciliations.map((rec) => (
            <div key={rec._id} className="rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] text-(--tm)">
                  {rec.asOf ? formatDay(String(rec.asOf).slice(0, 10), lang) : "—"}
                </p>
                <p className={`shrink-0 text-sm font-extrabold tabular-nums ${varianceTone(Number(rec.variance))}`}>
                  {Number(rec.variance) >= 0 ? "+" : ""}
                  {fmt(rec.variance)}
                </p>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <MiniStat label={t("recon.expected", { amount: "" })} value={fmt(rec.expectedBalance)} />
                <MiniStat label={t("recon.countedLabel", { amount: "" })} value={fmt(rec.actualBalance)} />
              </div>
              {rec.resolvedAt ? (
                <p className="mt-1.5 text-[11px] text-(--success)">
                  {t("recon.resolvedLabel", {
                    resolution: rec.resolution ? t(`recon.resolution.${rec.resolution}`) : t("shell.confirm"),
                  })}
                </p>
              ) : Number(rec.variance) !== 0 ? (
                <div className="mt-2 space-y-1.5">
                  <Select
                    size="sm"
                    placeholder={t("recon.resolutionLabel")}
                    options={resolutionOptions}
                    value={resolving[rec._id] || ""}
                    onChange={(event) => setResolving((current) => ({ ...current, [rec._id]: event.target.value }))}
                  />
                  <Button
                    size="md"
                    className="rounded-xl"
                    isFullWidth
                    isLoading={saving}
                    isDisabled={saving || !resolving[rec._id]}
                    onClick={() => resolve(rec._id)}
                  >
                    {t("recon.resolve")}
                  </Button>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-(--success)">{t("recon.matched")}</p>
              )}
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
