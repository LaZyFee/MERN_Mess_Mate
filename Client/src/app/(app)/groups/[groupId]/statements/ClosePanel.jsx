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

const CHECK_LABELS = {
  journals_balanced: "Journals balanced",
  period_editable: "Period is editable (open/review)",
};

function FinalizeModal({ month, period, isOpen, saving, onClose, onConfirm, unresolved }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      header={`Finalize ${formatMonth(month)}`}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button isLoading={saving} isDisabled={saving} onClick={() => onConfirm(reason.trim(), period?.revision)}>
            Finalize month
          </Button>
        </div>
      }
    >
      {unresolved?.length > 0 && (
        <Alert status="error" title="Unknown meal slots must be resolved first" className="mb-3">
          <div className="mt-1 flex flex-wrap gap-1">
            {unresolved.map((row, index) => (
              <span
                key={`${row.userId}-${row.date}-${row.slot}-${index}`}
                className="rounded-full bg-(--danger-bg) px-2 py-0.5 text-[11px] font-semibold text-(--danger)"
              >
                {row.date} · {row.slot}
              </span>
            ))}
          </div>
        </Alert>
      )}
      <p className="text-sm text-(--tm)">
        Finalizing locks {formatMonth(month)} and publishes a statement version. Data revision checked:{" "}
        <span className="font-bold text-(--tp)">rev {period?.revision ?? 0}</span>.
      </p>
      <div className="mt-3">
        <Textarea
          label="Reason (optional)"
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Any note kept with the finalized version"
        />
      </div>
    </Modal>
  );
}

export default function ClosePanel({ groupId, initialPeriod, initialChecklist, initialMonth, onFinalized }) {
  const { showToast } = useToast();
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
        showToast({ status: "error", title: "Could not load period", description: ex?.message });
      } finally {
        setBusy(null);
      }
    },
    [groupId, showToast],
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
      showToast({ status: "error", title: "Preview failed", description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "success", title: res?.msg || "Period updated" });
      await loadMonth(month);
    } catch (ex) {
      showToast({ status: "error", title: "State change failed", description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "success", title: res?.msg || "Statement finalized" });
      setFinalizeOpen(false);
      setPreview(null);
      await loadMonth(month);
      onFinalized?.(month);
    } catch (ex) {
      if (ex?.status === 409) {
        showToast({
          status: "warning",
          title: "Month data changed",
          description: "Refresh and retry — another entry landed after you loaded this page.",
        });
        await loadMonth(month);
      } else if (ex?.status === 422) {
        const list = ex?.data?.unresolved || [];
        setUnresolved(Array.isArray(list) ? list : []);
        setFinalizeOpen(true);
        showToast({ status: "error", title: "Unknown meal slots remain" });
      } else {
        showToast({ status: "error", title: "Finalize failed", description: ex?.data?.msg || ex?.message });
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
            label="Month"
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" onClick={() => changeMonth(addMonths(month, -1))}>
            Prev
          </Button>
          <Button variant="ghost" size="lg" onClick={() => changeMonth(addMonths(month, 1))}>
            Next
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge type="period" status={state} />
        <span className="text-xs text-(--tm)">revision {period?.revision ?? 0}</span>
        {period?.finalizedAt && <span className="text-xs text-(--tm)">finalized</span>}
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
              <span className="text-(--ts)">{CHECK_LABELS[check.name] || check.name}</span>
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
          Preview statement
        </Button>
        {state === "open" && (
          <Button
            variant="outline"
            size="md"
            isLoading={busy === "review"}
            isDisabled={Boolean(busy)}
            onClick={() => move("review")}
          >
            Begin review
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
            Return to open
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
            Finalize
          </Button>
        )}
        {state === "finalized" && (
          <Alert status="info" className="w-full">
            This month is finalized. Corrections create a new statement version.
          </Alert>
        )}
      </div>

      {preview && (
        <div className="mt-3 rounded-lg border border-(--bd) bg-(--bgm) p-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-(--ts)">
            <LuTriangleAlert size={13} /> Draft preview (not saved)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-(--tm)">Meals</p>
              <p className="font-bold tabular-nums text-(--tp)">{preview.totalMeals ?? 0}</p>
            </div>
            <div>
              <p className="text-(--tm)">Total</p>
              <p className="font-bold tabular-nums text-(--tp)">
                {((preview.totalExpenses || 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-(--tm)">Members</p>
              <p className="font-bold tabular-nums text-(--tp)">{preview.items?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-(--tm)">Rate</p>
              <p className="font-bold tabular-nums text-(--tp)">
                {preview.mealRate != null ? (preview.mealRate / 100).toFixed(2) : "—"}
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
      />
    </Card>
  );
}
