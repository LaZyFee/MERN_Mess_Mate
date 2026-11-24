"use client";

import { useMemo, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import Alert from "@/components/shared/Alert";
import Button from "@/components/shared/Button";
import Checkbox from "@/components/shared/Checkbox";
import Input from "@/components/shared/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { parseTaka, dhakaToday, toMonthString } from "@/lib/utils/format";
import { expensesApi } from "@/lib/api/expenses";
import ExpenseLineEditor from "./ExpenseLineEditor";
import { EMPTY_LINE, memberKey, memberName } from "./expenseHelpers";

function emptyDraft() {
  const today = dhakaToday();
  return {
    supplierName: "",
    description: "",
    date: today,
    costPeriod: toMonthString(new Date(`${today}T00:00:00Z`)),
    isPayable: false,
    receiptReference: "",
    lines: [{ ...EMPTY_LINE, fixedAmounts: {}, weights: {}, usageQuantities: {} }],
    payerId: "",
  };
}

function serializeLine(line) {
  const amount = parseTaka(line.amount);
  const out = { categoryId: line.categoryId, amount };
  if (line.description?.trim()) out.description = line.description.trim();
  if (line.splitMode) out.splitMode = line.splitMode;
  const beneficiaries = line.beneficiaries.filter(Boolean);
  if (beneficiaries.length) out.beneficiaries = beneficiaries;
  if (line.splitMode === "fixed_amounts") {
    out.fixedAmounts = beneficiaries
      .filter((id) => parseTaka(line.fixedAmounts?.[id]) > 0)
      .map((id) => ({ membershipId: id, amount: parseTaka(line.fixedAmounts[id]) }));
  }
  if (line.splitMode === "weighted") {
    out.weights = beneficiaries
      .filter((id) => Number(line.weights?.[id]) > 0)
      .map((id) => ({ membershipId: id, weight: Math.round(Number(line.weights[id])) }));
  }
  if (line.splitMode === "usage") {
    out.usageQuantities = beneficiaries
      .filter((id) => Number(line.usageQuantities?.[id]) > 0)
      .map((id) => ({ membershipId: id, quantity: Number(line.usageQuantities[id]) }));
  }
  return out;
}

function validate(draft) {
  if (!draft.date) return "Pick the expense date.";
  const lines = draft.lines.map(serializeLine);
  if (lines.some((line) => !line.categoryId)) return "Every line needs a category.";
  if (lines.some((line) => line.amount <= 0)) return "Every line needs a positive ৳ amount.";
  if (lines.some((line) => line.splitMode === "fixed_amounts" && !line.fixedAmounts.length)) {
    return "Fixed-amount lines need at least one member amount.";
  }
  return null;
}

export default function ExpenseDraftForm({ groupId, categories, memberships, onCreated }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const { showToast } = useToast();

  const payerOptions = useMemo(() => memberships.map((m) => ({ value: memberKey(m), label: memberName(m) })), [memberships]);

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const togglePayer = (key) => update({ payerId: draft.payerId === key ? "" : key });

  const submit = async () => {
    const error = validate(draft);
    if (error) {
      showToast({ status: "warning", title: "Check the form", description: error });
      return;
    }
    const lines = draft.lines.map(serializeLine);
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const payload = {
      date: `${draft.date}T00:00:00.000Z`,
      supplierName: draft.supplierName.trim() || undefined,
      description: draft.description.trim() || undefined,
      costPeriod: draft.costPeriod || undefined,
      isPayable: draft.isPayable,
      receiptReference: draft.receiptReference.trim() || undefined,
      lines,
    };
    if (draft.payerId) {
      payload.payers = [{ memberId: draft.payerId, amount: total, fundAccountId: null }];
    }

    setSaving(true);
    setWarnings([]);
    try {
      const res = await expensesApi.createDraft(groupId, payload);
      showToast({ status: "success", title: res?.msg || "Expense draft created" });
      setWarnings(res?.duplicateWarnings || []);
      setDraft(emptyDraft());
      onCreated?.(res?.expense);
    } catch (ex) {
      const fieldErrors = ex?.data?.errors;
      const description = Array.isArray(fieldErrors) && fieldErrors.length
        ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" · ")
        : ex?.data?.msg || ex?.message;
      showToast({ status: "error", title: "Could not create draft", description });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {warnings.length > 0 && (
        <Alert
          status="warning"
          title="Possible duplicate — draft still created"
          isDismissible
          onDismiss={() => setWarnings([])}
        >
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {warnings.map((warning, index) => (
              <li key={index}>
                {typeof warning === "string"
                  ? warning
                  : `${warning.message || warning.reason || "Similar expense"}${warning.expenseId ? ` (${warning.expenseId})` : ""}`}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Date"
          isRequired
          size="lg"
          type="date"
          value={draft.date}
          onChange={(event) => update({ date: event.target.value })}
        />
        <Input
          label="Cost period"
          size="lg"
          type="month"
          value={draft.costPeriod}
          onChange={(event) => update({ costPeriod: event.target.value })}
        />
        <Input
          label="Supplier"
          size="lg"
          placeholder="Bazar, LPG supplier…"
          value={draft.supplierName}
          onChange={(event) => update({ supplierName: event.target.value })}
        />
        <Input
          label="Receipt / TrxID"
          size="lg"
          placeholder="Invoice or reference"
          value={draft.receiptReference}
          onChange={(event) => update({ receiptReference: event.target.value })}
        />
      </div>
      <Input
        label="Note"
        size="lg"
        placeholder="What is this expense for?"
        value={draft.description}
        onChange={(event) => update({ description: event.target.value })}
      />

      <div className="rounded-lg border border-(--bd) bg-(--bgm) p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          <LuTriangleAlert size={13} /> Paid by
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {payerOptions.map((option) => (
            <Checkbox
              key={option.value}
              size="sm"
              label={option.label}
              isChecked={draft.payerId === option.value}
              onChange={() => togglePayer(option.value)}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-(--tm)">
          Leave empty to record the payer on approval (treasurer selects the personal pocket).
        </p>
      </div>

      <Checkbox
        label="Payable to supplier (not yet paid)"
        isChecked={draft.isPayable}
        onChange={() => update({ isPayable: !draft.isPayable })}
      />

      <ExpenseLineEditor
        lines={draft.lines}
        memberships={memberships}
        categories={categories}
        onChange={(lines) => update({ lines })}
      />

      <div className="sticky bottom-0 -mx-4 border-t border-(--bd) bg-(--bgs)/95 px-4 py-3 backdrop-blur-sm md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <Button size="lg" isFullWidth isLoading={saving} isDisabled={saving} onClick={submit}>
          Save draft
        </Button>
      </div>
    </div>
  );
}
