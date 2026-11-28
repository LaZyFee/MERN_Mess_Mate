"use client";

/**
 * Monthly budgets per category with live variance (`/budgets/groups/:groupId`).
 * Everyone can read the plan; treasurer+ edits ceilings. Variance is computed by
 * the server from approved expenses, so it always matches the ledger.
 */
import { useCallback, useEffect, useState } from "react";
import { LuPiggyBank, LuRefreshCw, LuPlus, LuTrash2, LuPencil } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Progress from "@/components/shared/Progress";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { budgetsApi } from "@/lib/api/groups";
import { dhakaToday, toMonthString, poishaToTaka, formatMonth } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState, MiniStat, SectionCard } from "../GroupUI";

const STATUS_TONE = { on_track: "success", near: "warning", over: "danger" };
const STATUS_KEY = { on_track: "more.onTrack", near: "more.nearLimit", over: "more.overBudget" };

export default function BudgetsPanel({ groupId, categories = [], canEdit = false }) {
  const t = useT();
  const { lang, fmt, parse, errorText } = useMoney();
  const { showToast } = useToast();
  const [month, setMonth] = useState(() => toMonthString(new Date(`${dhakaToday()}T00:00:00Z`)));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (targetMonth = month) => {
      if (!groupId || !targetMonth) return;
      setLoading(true);
      try {
        setData(await budgetsApi.list(groupId, targetMonth));
      } catch (ex) {
        showToast({ status: "error", title: t("more.couldNotLoadBudgets"), description: ex?.data?.msg || ex?.message });
      } finally {
        setLoading(false);
      }
    },
    [groupId, month, showToast, t],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, month]);

  const openEdit = (line) =>
    setEditing({
      categoryId: line?.categoryId || "",
      amount: line ? String(poishaToTaka(line.amountPoisha || 0)) : "",
      _id: line?._id,
    });

  const save = async () => {
    const parsed = parse(editing?.amount || "0", { allowZero: true });
    if (!parsed.ok) {
      showToast({ status: "warning", title: errorText(parsed.reason) });
      return;
    }
    setSaving(true);
    try {
      await budgetsApi.upsert(groupId, {
        month,
        categoryId: editing.categoryId || null,
        amountPoisha: parsed.poisha,
      });
      showToast({ status: "success", title: t("more.budgetSaved") });
      setEditing(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("more.couldNotSaveBudget"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (line) => {
    if (!line?.budgetId && !line?._id) return;
    try {
      await budgetsApi.remove(groupId, line._id);
      showToast({ status: "success", title: t("more.budgetRemoved") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("more.couldNotRemoveBudget"), description: ex?.data?.msg || ex?.message });
    }
  };

  const lines = data?.budgets || [];
  const categoryOptions = [
    { value: "", label: t("more.branchTotal") },
    ...categories.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <SectionCard
      icon={LuPiggyBank}
      title={t("more.budgets")}
      subtitle={formatMonth(month, lang)}
      actions={
        <>
          <Input size="sm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t("more.budgetMonth")} className="!w-[132px]" />
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={() => load()}>
            <LuRefreshCw size={14} />
          </Button>
        </>
      }
    >
      {data && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <MiniStat label={t("more.planned")} value={fmt(data.plannedTotalPoisha || 0)} />
          <MiniStat label={t("more.spent")} value={fmt(data.actualTotalPoisha || 0)} />
          <MiniStat
            label={t("more.left")}
            value={fmt(data.remainingTotalPoisha || 0)}
            tone={(data.remainingTotalPoisha ?? 0) < 0 ? "danger" : "success"}
          />
        </div>
      )}

      {loading && !data ? (
        <Skeleton variant="rect" height={96} className="rounded-xl" />
      ) : lines.length === 0 ? (
        <EmptyState
          icon={LuPiggyBank}
          title={t("more.noBudgets", { month: formatMonth(month, lang) })}
          action={
            canEdit ? (
              <Button size="md" variant="outline" className="rounded-xl" leftIcon={<LuPlus size={14} />} onClick={() => openEdit(null)}>
                {t("more.setBudget")}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line._id || line.categoryId || "total"} className="rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-(--tp)">
                  {line.category?.name || t("more.branchTotal")}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${line.status === "over"
                      ? "bg-(--danger-bg) text-(--danger)"
                      : line.status === "near"
                        ? "bg-(--warning-bg) text-(--warning)"
                        : "bg-(--success-bg) text-(--success)"
                    }`}
                >
                  {t(STATUS_KEY[line.status] || "more.onTrack")}
                </span>
              </div>
              <div className="mt-1.5">
                <Progress value={Math.min(100, line.usedPct || 0)} colorScheme={STATUS_TONE[line.status] || "primary"} size="sm" />
              </div>
              <p className="mt-1 text-[11px] text-(--tm)">
                {t("more.ofBudget", { spent: fmt(line.actualPoisha || 0), planned: fmt(line.amountPoisha || 0) })}
                {" · "}
                {line.remainingPoisha >= 0
                  ? t("more.leftAmount", { amount: fmt(line.remainingPoisha) })
                  : t("more.overAmount", { amount: fmt(-line.remainingPoisha) })}
              </p>
              {canEdit && (
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" className="rounded-lg" variant="outline" leftIcon={<LuPencil size={12} />} onClick={() => openEdit(line)}>
                    {t("shell.edit")}
                  </Button>
                  {line._id && (
                    <Button size="sm" className="rounded-lg" variant="ghost" leftIcon={<LuTrash2 size={12} />} onClick={() => remove(line)}>
                      {t("shell.delete")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {canEdit && (
            <Button
              size="md"
              className="rounded-xl"
              variant="outline"
              leftIcon={<LuPlus size={13} />}
              isFullWidth
              onClick={() => openEdit(null)}
            >
              {t("more.addBudgetLine")}
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        header={t("more.budgetForMonth")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setEditing(null)} isDisabled={saving}>
              {t("shell.cancel")}
            </Button>
            <Button variant="primary" isFullWidth className="sm:!w-fit" onClick={save} isLoading={saving} isDisabled={saving}>
              {t("shell.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            size="lg"
            label={t("exp.category")}
            options={categoryOptions}
            value={editing?.categoryId || ""}
            onChange={(e) => setEditing((current) => ({ ...current, categoryId: e.target.value, _id: undefined }))}
          />
          <Input
            size="lg"
            label={t("more.budgetCeiling")}
            isRequired
            inputMode="decimal"
            value={editing?.amount || ""}
            onChange={(e) => setEditing((current) => ({ ...current, amount: e.target.value }))}
          />
        </div>
      </Modal>
    </SectionCard>
  );
}
