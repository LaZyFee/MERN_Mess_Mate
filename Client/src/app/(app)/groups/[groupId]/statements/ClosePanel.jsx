"use client";

import { useCallback, useState } from "react";
import {
  LuCheck,
  LuCircleAlert,
  LuEye,
  LuLock,
  LuRotateCcw,
  LuTriangleAlert,
} from "react-icons/lu";
import Alert from "@/components/shared/Alert";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Textarea from "@/components/shared/Textarea";
import Modal from "@/components/modals/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { periodsApi, statementsApi } from "@/lib/api/statements";
import { formatMonth, toMonthString, addMonths } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const CHECK_KEYS = {
  journals_balanced: "stmt.check.journalsBalanced",
  period_editable: "stmt.check.periodEditable",
};

function FinalizeModal({ month, period, isOpen, saving, onClose, onConfirm, unresolved, t, lang, n }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      header={t("stmt.finalizeTitle", { month: formatMonth(month, lang) })}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} isDisabled={saving}>
            {t("shell.cancel")}
          </Button>
          <Button isLoading={saving} isDisabled={saving} onClick={() => onConfirm(reason.trim(), period?.revision)}>
            {t("stmt.close.finalize")}
          </Button>
        </div>
      }
    >
      {unresolved?.length > 0 && (
        <Alert status="error" title={t("stmt.unresolvedTitle")} className="mb-3">
          <div className="mt-1 flex flex-wrap gap-1">
            {unresolved.map((row, index) => (
              <span
                key={`${row.userId}-${row.date}-${row.slot}-${index}`}
                className="rounded-full bg-(--danger-bg) px-2 py-0.5 text-[11px] font-semibold text-(--danger)"
              >
                {row.date} · {t(`meals.slot.${row.slot}`)}
              </span>
            ))}
          </div>
        </Alert>
      )}
      <p className="text-sm text-(--tm)">
        {t("stmt.finalizeBody", { month: formatMonth(month, lang), revision: n(period?.revision ?? 0) })}
      </p>
      <div className="mt-3">
        <Textarea
          label={t("exp.reasonOptional")}
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("stmt.reasonPlaceholder")}
        />
      </div>
    </Modal>
  );
}

export default function ClosePanel({ groupId, initialPeriod, initialChecklist, initialMonth, onFinalized }) {
  const { showToast } = useToast();
  const t = useT();
  const { fmt, lang, n } = useMoney();
  const [month, setMonth] = useState(initialMonth || toMonthString(new Date()));
  const [period, setPeriod] = useState(initialPeriod);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [preview, setPreview] = useState(null);
  const [unresolved, setUnresolved] = useState([]);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const loadMonth = useCallback(
    async (nextMonth) => {
      setBusy("load");
      try {
        const [periodRes, checklistRes] = await Promise.all([
          periodsApi.get(groupId, nextMonth).catch(() => null),
          periodsApi.checklist(groupId, nextMonth).catch(() => null),
        ]);
        setPeriod(periodRes?.period || null);
        setChecklist(checklistRes);
        setPreview(null);
        setUnresolved([]);
      } catch (ex) {
        showToast({ status: "error", title: t("stmt.couldNotLoadPeriod"), description: ex?.message });
      } finally {
        setBusy(null);
      }
    },
    [groupId, showToast, t],
  );

  const changeMonth = (value) => {
    setMonth(value);
    loadMonth(value);
  };

  const runPreview = async () => {
    setBusy("preview");
    try {
      const data = await periodsApi.preview(groupId, month);
      setPreview(data);
    } catch (ex) {
      showToast({ status: "error", title: t("stmt.previewFailed"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const move = async (kind) => {
    setBusy(kind);
    try {
      const res =
        kind === "review"
          ? await periodsApi.beginReview(groupId, month)
          : await periodsApi.returnToOpen(groupId, month, "Returned to open for corrections");
      showToast({ status: "success", title: res?.msg || t("stmt.periodUpdated") });
      await loadMonth(month);
    } catch (ex) {
      showToast({ status: "error", title: t("stmt.stateChangeFailed"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const finalize = async (reason, expectedRevision) => {
    setBusy("finalize");
    try {
      const res = await statementsApi.finalize(groupId, month, {
        reason: reason || undefined,
        expectedRevision,
      });
      showToast({ status: "success", title: res?.msg || t("stmt.finalizedToast") });
      setFinalizeOpen(false);
      setPreview(null);
      await loadMonth(month);
      onFinalized?.(month);
    } catch (ex) {
      if (ex?.status === 409) {
        showToast({
          status: "warning",
          title: t("stmt.dataChanged"),
          description: t("stmt.close.retry"),
        });
        await loadMonth(month);
      } else if (ex?.status === 422) {
        const list = ex?.data?.unresolved || [];
        setUnresolved(Array.isArray(list) ? list : []);
        setFinalizeOpen(true);
        showToast({ status: "error", title: t("stmt.unresolvedTitle") });
      } else {
        showToast({ status: "error", title: t("stmt.finalizeFailed"), description: ex?.data?.msg || ex?.message });
      }
    } finally {
      setBusy(null);
    }
  };

  const state = period?.state || "open";
  const checks = checklist?.checks || [];

  return (
    <Card padding="md" className="min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            size="lg"
            type="month"
            label={t("stmt.month")}
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" onClick={() => changeMonth(addMonths(month, -1))}>
            {t("stmt.prev")}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => changeMonth(addMonths(month, 1))}>
            {t("stmt.next")}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge type="period" status={state} />
        <span className="text-xs text-(--tm)">{t("overview.revision", { n: n(period?.revision ?? 0) })}</span>
        {period?.finalizedAt && <span className="text-xs text-(--tm)">{t("stmt.isFinalized")}</span>}
      </div>

      {checks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {checks.map((check) => (
            <li key={check.name} className="flex items-center gap-2 text-xs">
              {check.ok ? (
                <LuCheck size={14} className="text-(--success)" />
              ) : (
                <LuCircleAlert size={14} className="text-(--danger)" />
              )}
              <span className="text-(--ts)">{CHECK_KEYS[check.name] ? t(CHECK_KEYS[check.name]) : check.name}</span>
              {check.state && <span className="text-(--tl)">({check.state})</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          leftIcon={<LuEye size={14} />}
          isLoading={busy === "preview"}
          isDisabled={Boolean(busy)}
          onClick={runPreview}
        >
          {t("stmt.close.preview")}
        </Button>
        {state === "open" && (
          <Button
            variant="outline"
            size="md"
            isLoading={busy === "review"}
            isDisabled={Boolean(busy)}
            onClick={() => move("review")}
          >
            {t("stmt.close.beginReview")}
          </Button>
        )}
        {state === "review" && (
          <Button
            variant="outline"
            size="md"
            leftIcon={<LuRotateCcw size={14} />}
            isLoading={busy === "open"}
            isDisabled={Boolean(busy)}
            onClick={() => move("open")}
          >
            {t("stmt.close.returnOpen")}
          </Button>
        )}
        {state !== "finalized" && (
          <Button
            size="md"
            leftIcon={<LuLock size={14} />}
            isDisabled={Boolean(busy)}
            onClick={() => {
              setUnresolved([]);
              setFinalizeOpen(true);
            }}
          >
            {t("stmt.close.finalize")}
          </Button>
        )}
        {state === "finalized" && (
          <Alert status="info" className="w-full">
            {t("stmt.close.correctionNote")}
          </Alert>
        )}
      </div>

      {preview && (
        <div className="mt-3 rounded-lg border border-(--bd) bg-(--bgm) p-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-(--ts)">
            <LuTriangleAlert size={13} /> {t("stmt.draftPreview")}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-(--tm)">{t("stmt.colMeals")}</p>
              <p className="font-bold tabular-nums text-(--tp)">{n(preview.totalMeals ?? 0)}</p>
            </div>
            <div>
              <p className="text-(--tm)">{t("exp.total")}</p>
              <p className="font-bold tabular-nums text-(--tp)">{fmt(preview.totalExpenses || 0)}</p>
            </div>
            <div>
              <p className="text-(--tm)">{t("members.title")}</p>
              <p className="font-bold tabular-nums text-(--tp)">{n(preview.items?.length ?? 0)}</p>
            </div>
            <div>
              <p className="text-(--tm)">{t("stmt.mealRate")}</p>
              <p className="font-bold tabular-nums text-(--tp)">
                {preview.mealRate != null ? fmt(preview.mealRate) : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <FinalizeModal
        month={month}
        period={period}
        isOpen={finalizeOpen}
        saving={busy === "finalize"}
        unresolved={unresolved}
        onClose={() => setFinalizeOpen(false)}
        onConfirm={finalize}
        t={t}
        lang={lang}
        n={n}
      />
    </Card>
  );
}
