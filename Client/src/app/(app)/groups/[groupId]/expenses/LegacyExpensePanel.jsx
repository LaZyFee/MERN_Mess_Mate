"use client";

/**
 * Legacy simple CRUD kept behind an "Advanced / Legacy" collapse so old data can
 * still be corrected. New spending goes through the workflow draft builder.
 */
import { useState } from "react";
import { LuChevronDown, LuChevronUp, LuPlus, LuTrash2 } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { expensesApi } from "@/lib/api/expenses";
import { formatPoisha, parseTaka, dhakaToday } from "@/lib/utils/format";
import { activeCategories } from "./expenseHelpers";

export default function LegacyExpensePanel({ groupId, categories, onChanged }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dhakaToday());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState("");

  const categoryOptions = activeCategories(categories).map((category) => ({
    value: category._id,
    label: category.name,
  }));

  const create = async () => {
    const poisha = parseTaka(amount);
    if (!categoryId || poisha <= 0) {
      showToast({ status: "warning", title: "Category and a positive amount are required" });
      return;
    }
    setSaving(true);
    try {
      await expensesApi.legacyCreate(groupId, {
        date: `${date}T00:00:00.000Z`,
        amount: poisha,
        description: description.trim() || undefined,
        categoryId,
      });
      showToast({ status: "success", title: "Legacy entry saved" });
      setAmount("");
      setDescription("");
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not save", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entryId.trim()) return;
    setSaving(true);
    try {
      await expensesApi.legacyDelete(entryId.trim());
      showToast({ status: "success", title: "Legacy entry deleted" });
      setEntryId("");
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not delete", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 rounded-lg border border-(--bd) bg-(--bgm)">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
      >
        <span className="text-xs font-bold uppercase tracking-wide text-(--tm)">Advanced · legacy entries</span>
        {open ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-(--bd) p-3">
          <p className="text-[11px] text-(--tm)">
            Legacy entries post directly without approval. Use only to fix pre-ledger data.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input size="lg" type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input
              size="lg"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              label="Amount (৳)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Select
              size="lg"
              label="Category"
              placeholder="Choose"
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
            <Input
              size="lg"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button size="md" isFullWidth leftIcon={<LuPlus size={15} />} isLoading={saving} isDisabled={saving} onClick={create}>
            {amount ? `Add ${formatPoisha(parseTaka(amount))}` : "Add legacy entry"}
          </Button>

          <div className="grid grid-cols-1 gap-2 border-t border-(--bd) pt-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              size="lg"
              label="Delete entry by ID"
              placeholder="MongoDB entry id"
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
            />
            <Button
              variant="danger"
              size="lg"
              leftIcon={<LuTrash2 size={15} />}
              isLoading={saving}
              isDisabled={saving || !entryId.trim()}
              onClick={remove}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
