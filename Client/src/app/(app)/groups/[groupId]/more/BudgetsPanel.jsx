"use client";

/**
 * T14.11 — Monthly budgets per category with live variance (`/budgets/groups/:groupId`).
 * Everyone can read the plan; treasurer+ edits ceilings. Variance is computed by
 * the server from approved expenses, so it always matches the ledger.
 */
import { useCallback, useEffect, useState } from "react";
import { LuPiggyBank, LuRefreshCw, LuPlus, LuTrash2 } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Progress from "@/components/shared/Progress";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { budgetsApi } from "@/lib/api/groups";
import { formatPoisha, parseTaka, dhakaToday, toMonthString } from "@/lib/utils/format";

const STATUS_TONE = {
  on_track: "success",
  near: "warning",
  over: "danger",
};

const STATUS_LABEL = {
  on_track: "On track",
  near: "Near limit",
  over: "Over budget",
};

export default function BudgetsPanel({ groupId, categories = [], canEdit = false }) {
  const { showToast } = useToast();
  const [month, setMonth] = useState(() => toMonthString(new Date(`${dhakaToday()}T00:00:00Z`)));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { categoryId, amount }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (targetMonth = month) => {
    if (!groupId || !targetMonth) return;
    setLoading(true);
    try {
      setData(await budgetsApi.list(groupId, targetMonth));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load budgets", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, month, showToast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, month]);

  const openEdit = (line) => setEditing({ categoryId: line?.categoryId || "", amount: line ? String((line.amountPoisha || 0) / 100) : "" });

  const save = async () => {
    const poisha = parseTaka(editing?.amount || "0");
    if (poisha < 0) {
      showToast({ status: "warning", title: "Budget must be zero or more" });
      return;
    }
    setSaving(true);
    try {
      await budgetsApi.upsert(groupId, {
        month,
        categoryId: editing.categoryId || null,
        amountPoisha: poisha,
      });
      showToast({ status: "success", title: "Budget saved" });
      setEditing(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not save budget", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (line) => {
    if (!line?.budgetId && !line?._id) return;
    try {
      await budgetsApi.remove(groupId, line._id);
      showToast({ status: "success", title: "Budget removed" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not remove budget", description: ex?.data?.msg || ex?.message });
    }
  };

  const lines = data?.budgets || [];
  const categoryOptions = [
    { value: "", label: "Whole-group total" },
    ...categories.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-(--tp)">
            <LuPiggyBank size={15} /> Budgets
          </span>
          <div className="flex items-center gap-2">
            <Input size="sm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} ariaLabel="Budget month" />
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={() => load()}>
              <LuRefreshCw size={14} />
            </Button>
          </div>
        </div>
      }
    >
      {data && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-(--bgm) p-2">
            <p className="text-[10px] uppercase text-(--tm)">Planned</p>
            <p className="text-sm font-bold tabular-nums text-(--tp)">{formatPoisha(data.plannedTotalPoisha || 0)}</p>
          </div>
          <div className="rounded-lg bg-(--bgm) p-2">
            <p className="text-[10px] uppercase text-(--tm)">Spent</p>
            <p className="text-sm font-bold tabular-nums text-(--tp)">{formatPoisha(data.actualTotalPoisha || 0)}</p>
          </div>
          <div className="rounded-lg bg-(--bgm) p-2">
            <p className="text-[10px] uppercase text-(--tm)">Left</p>
            <p className={`text-sm font-bold tabular-nums ${(data.remainingTotalPoisha ?? 0) < 0 ? "text-(--danger)" : "text-(--tp)"}`}>
              {formatPoisha(data.remainingTotalPoisha || 0)}
            </p>
          </div>
        </div>
      )}

      {loading && !data ? (
        <Skeleton variant="rect" height={96} />
      ) : lines.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-(--tm)">No budgets for {month} yet.</p>
          {canEdit && (
            <Button size="sm" variant="outline" leftIcon={<LuPlus size={13} />} className="mt-2" onClick={() => openEdit(null)}>
              Set a budget
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line._id || line.categoryId || "total"} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-(--tp)">
                  {line.category?.name || "Whole-group total"}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${line.status === "over" ? "bg-(--danger-bg) text-(--danger)"
                    : line.status === "near" ? "bg-(--warning-bg) text-(--warning)"
                      : "bg-(--success-bg) text-(--success)"
                  }`}
                >
                  {STATUS_LABEL[line.status] || line.status}
                </span>
              </div>
              <div className="mt-1">
                <Progress value={Math.min(100, line.usedPct || 0)} colorScheme={STATUS_TONE[line.status] || "primary"} size="sm" />
              </div>
              <p className="mt-1 text-[11px] text-(--tm)">
                {formatPoisha(line.actualPoisha || 0)} of {formatPoisha(line.amountPoisha || 0)}
                {" · "}
                {line.remainingPoisha >= 0 ? `${formatPoisha(line.remainingPoisha)} left` : `${formatPoisha(-line.remainingPoisha)} over`}
              </p>
              {canEdit && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(line)}>Edit</Button>
                  {line._id && (
                    <Button size="sm" variant="ghost" leftIcon={<LuTrash2 size={12} />} onClick={() => remove(line)}>Remove</Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {canEdit && (
            <Button size="sm" variant="outline" leftIcon={<LuPlus size={13} />} isFullWidth onClick={() => openEdit(null)}>
              Add budget line
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        header="Budget for this month"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} isDisabled={saving}>Cancel</Button>
            <Button onClick={save} isLoading={saving} isDisabled={saving}>Save</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            size="lg"
            label="Category"
            options={categoryOptions}
            value={editing?.categoryId || ""}
            onChange={(e) => setEditing((current) => ({ ...current, categoryId: e.target.value, _id: undefined }))}
          />
          <Input
            size="lg"
            label="Monthly ceiling (৳)"
            isRequired
            inputMode="decimal"
            value={editing?.amount || ""}
            onChange={(e) => setEditing((current) => ({ ...current, amount: e.target.value }))}
          />
        </div>
      </Modal>
    </Card>
  );
}
