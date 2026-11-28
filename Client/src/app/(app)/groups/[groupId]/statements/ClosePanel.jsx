"use client";

/**
 * Month-end close: period state, checklist, draft preview, finalize.
 * Mobile-first: month stepper on one row, checklist as a compact list, actions
 * stacked full-width, finalize confirmation in a bottom sheet.
 */
import { useCallback, useState } from "react";
import {
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuEye,
  LuLock,
  LuRotateCcw,
  LuTriangleAlert,
  LuCalendarRange,
  LuListChecks,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Textarea from "@/components/shared/Textarea";
import Modal from "@/components/modals/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { periodsApi, statementsApi } from "@/lib/api/statements";
import { formatMonth, toMonthString, addMonths } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { MiniStat, SectionCard } from "../GroupUI";

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
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={onClose} isDisabled={saving}>
            {t("shell.cancel")}
          </Button>
          <Button
            isFullWidth
            className="sm:!w-fit"
            isLoading={saving}
            isDisabled={saving}
            leftIcon={<LuLock size={14} />}
            onClick={() => onConfirm(reason.trim(), period?.revision)}
          >
            {t("stmt.close.finalize")}
          </Button>
        </div>
      }
    >
      {unresolved?.length > 0 && (
        <div className="mb-3 rounded-xl border border-(--danger)/40 bg-(--danger-bg) p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-(--danger)">
            <LuTriangleAlert size={13} /> {t("stmt.unresolvedTitle")}
          </p>
          <div className="flex flex-wrap gap-1">
            {unresolved.map((row, index) => (
              <span
                key={`${row.userId}-${row.date}-${row.slot}-${index}`}
                className="rounded-full bg-(--bgs) px-2 py-0.5 text-[11px] font-semibold text-(--danger)"
              >
                {row.date} · {t(`meals.slot.${row.slot}`)}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="text-sm leading-relaxed text-(--tm)">
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
        showToast({ status: "warning", title: t("stmt.dataChanged"), description: t("stmt.close.retry") });
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
    <div className="space-y-3">
      <SectionCard icon={LuCalendarRange} title={t("stmt.close.title")} subtitle={formatMonth(month, lang)}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isRound
            ariaLabel={t("stmt.prev")}
            onClick={() => changeMonth(addMonths(month, -1))}
          >
            <LuChevronLeft size={17} />
          </Button>
          <div className="min-w-0 flex-1">
            <Input
              size="md"
              type="month"
              aria-label={t("stmt.month")}
              value={month}
              onChange={(event) => changeMonth(event.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            isRound
            ariaLabel={t("stmt.next")}
            onClick={() => changeMonth(addMonths(month, 1))}
          >
            <LuChevronRight size={17} />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge type="period" status={state} />
          <span className="text-xs text-(--tm)">{t("overview.revision", { n: n(period?.revision ?? 0) })}</span>
          {period?.finalizedAt && (
            <span className="rounded-full bg-(--success-bg) px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--success)">
              {t("stmt.isFinalized")}
            </span>
          )}
        </div>

        {state === "finalized" && (
          <p className="mt-2 rounded-xl bg-(--info-bg) px-3 py-2 text-[11px] leading-relaxed text-(--info)">
            {t("stmt.close.correctionNote")}
          </p>
        )}
      </SectionCard>

      {checks.length > 0 && (
        <SectionCard icon={LuListChecks} title={t("stmt.close.checklist")}>
          <ul className="space-y-1">
            {checks.map((check) => (
              <li key={check.name} className="flex min-h-9 items-center gap-2 rounded-lg bg-(--bgm) px-2.5 text-xs">
                {check.ok ? (
                  <LuCheck size={14} className="shrink-0 text-(--success)" />
                ) : (
                  <LuCircleAlert size={14} className="shrink-0 text-(--danger)" />
                )}
                <span className="min-w-0 flex-1 truncate text-(--ts)">
                  {CHECK_KEYS[check.name] ? t(CHECK_KEYS[check.name]) : check.name}
                </span>
                {check.state && <span className="shrink-0 text-(--tm)">({check.state})</span>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          variant="secondary"
          size="md"
          className="rounded-xl"
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
            className="rounded-xl"
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
            className="rounded-xl"
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
            className="rounded-xl"
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
      </div>

      {preview && (
        <SectionCard icon={LuTriangleAlert} tone="warning" title={t("stmt.draftPreview")}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MiniStat label={t("stmt.colMeals")} value={n(preview.totalMeals ?? 0)} />
            <MiniStat label={t("exp.total")} value={fmt(preview.totalExpenses || 0)} />
            <MiniStat label={t("members.title")} value={n(preview.items?.length ?? 0)} />
            <MiniStat
              label={t("stmt.mealRate")}
              value={preview.mealRate != null ? fmt(preview.mealRate) : "—"}
            />
          </div>
        </SectionCard>
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
    </div>
  );
}
