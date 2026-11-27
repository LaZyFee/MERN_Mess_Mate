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
import { dhakaToday } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { activeCategories } from "./expenseHelpers";

function AddLabel({ amount, fmt, parse, template, empty }) {
  const parsed = parse(amount);
  return parsed.ok ? template({ amount: fmt(parsed.poisha) }) : empty;
}

export default function LegacyExpensePanel({ groupId, categories, onChanged }) {
  const t = useT();
  const { fmt, parse, errorText } = useMoney();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dhakaToday());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState("");
  const [retired, setRetired] = useState(false);

  // D4 sunset: once the backend answers 410 the legacy path is gone for good.
  const handleRetired = (ex) => {
    if (ex?.status === 410) {
      setRetired(true);
      showToast({
        status: "warning",
        title: t("exp.legacyRetiredToast"),
        description: t("exp.legacyRetiredBody"),
      });
      return true;
    }
    return false;
  };

  const categoryOptions = activeCategories(categories).map((category) => ({
    value: category._id,
    label: category.name,
  }));

  const create = async () => {
    const parsed = parse(amount);
    if (!categoryId || !parsed.ok) {
      showToast({ status: "warning", title: t("exp.legacyRequired"), description: parsed.ok ? undefined : errorText(parsed.reason) });
      return;
    }
    setSaving(true);
    try {
      await expensesApi.legacyCreate(groupId, {
        date: `${date}T00:00:00.000Z`,
        amount: parsed.poisha,
        description: description.trim() || undefined,
        categoryId,
      });
      showToast({ status: "success", title: t("exp.legacySaved") });
      setAmount("");
      setDescription("");
      onChanged?.();
    } catch (ex) {
      if (!handleRetired(ex)) showToast({ status: "error", title: t("exp.couldNotSave"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entryId.trim()) return;
    setSaving(true);
    try {
      await expensesApi.legacyDelete(entryId.trim());
      showToast({ status: "success", title: t("exp.legacyDeleted") });
      setEntryId("");
      onChanged?.();
    } catch (ex) {
      if (!handleRetired(ex)) showToast({ status: "error", title: t("exp.couldNotDelete"), description: ex?.data?.msg || ex?.message });
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
        <span className="text-xs font-bold uppercase tracking-wide text-(--tm)">{t("exp.legacyTitle")}</span>
        {open ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-(--bd) p-3">
          {retired ? (
            <p className="rounded-lg border border-(--warning) bg-(--warning-bg) p-3 text-xs text-(--ts)">
              {t("exp.legacyRetired")}
            </p>
          ) : (
          <>
          <p className="text-[11px] text-(--tm)">
            {t("exp.legacyHint")}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input size="lg" type="date" label={t("exp.date")} value={date} onChange={(e) => setDate(e.target.value)} />
            <Input
              size="lg"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              label={t("exp.amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Select
              size="lg"
              label={t("exp.category")}
              placeholder={t("exp.chooseCategory")}
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
            <Input
              size="lg"
              label={t("exp.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button size="md" isFullWidth leftIcon={<LuPlus size={15} />} isLoading={saving} isDisabled={saving} onClick={create}>
            <AddLabel amount={amount} fmt={fmt} parse={parse} template={(vars) => t("exp.legacyAddAmount", vars)} empty={t("exp.legacyAdd")} />
          </Button>

          <div className="grid grid-cols-1 gap-2 border-t border-(--bd) pt-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              size="lg"
              label={t("exp.deleteEntryById")}
              placeholder={t("exp.entryIdPlaceholder")}
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
              {t("shell.delete")}
            </Button>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}
