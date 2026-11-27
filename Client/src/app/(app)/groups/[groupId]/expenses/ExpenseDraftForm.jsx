"use client";

import { useMemo, useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Checkbox from "@/components/shared/Checkbox";
import Input from "@/components/shared/Input";
import { useToast } from "@/components/shared/ToastProvider";
import { dhakaToday, toMonthString } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { expensesApi } from "@/lib/api/expenses";
import ExpenseLineEditor from "./ExpenseLineEditor";
import { EMPTY_LINE, memberKey, memberName } from "./expenseHelpers";

function emptyDraft(myMembershipId = "") {
  const today = dhakaToday();
  return {
    supplierName: "",
    description: "",
    date: today,
    costPeriod: toMonthString(new Date(`${today}T00:00:00Z`)),
    isPayable: false,
    receiptReference: "",
    lines: [{ ...EMPTY_LINE, fixedAmounts: {}, weights: {}, usageQuantities: {} }],
    payerId: myMembershipId, // payers[] is required — default to me
  };
}

/**
 * Serialize a UI line (Taka strings) into the API line shape (integer poisha).
 * `toPoisha` is the strict parser from `useMoney()` — it returns an integer.
 */
function serializeLine(line, toPoisha) {
  const amount = toPoisha(line.amount);
  const out = { categoryId: line.categoryId, amount };
  if (line.description?.trim()) out.description = line.description.trim();
  if (line.splitMode) out.splitMode = line.splitMode;
  const beneficiaries = line.beneficiaries.filter(Boolean);
  if (beneficiaries.length) out.beneficiaries = beneficiaries;
  if (line.splitMode === "fixed_amounts") {
    out.fixedAmounts = beneficiaries
      .filter((id) => toPoisha(line.fixedAmounts?.[id]) > 0)
      .map((id) => ({ membershipId: id, amount: toPoisha(line.fixedAmounts[id]) }));
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

function validate(draft, toPoisha, parse, t, errorText) {
  if (!draft.date) return t("exp.err.date");
  // Every line amount must parse as Taka (≤2 decimals) and be > 0.
  for (const line of draft.lines) {
    const result = parse(line.amount);
    if (!result.ok) return `${t("exp.line")} ${t("exp.amount")}: ${errorText(result.reason)}`;
  }
  const lines = draft.lines.map((line) => serializeLine(line, toPoisha));
  if (lines.some((line) => !line.categoryId)) return t("exp.err.category");
  if (lines.some((line) => line.amount <= 0)) return t("exp.err.amount");
  if (lines.some((line) => line.splitMode === "fixed_amounts" && !line.fixedAmounts.length)) {
    return t("exp.err.fixed");
  }
  if (!draft.payerId) return t("exp.err.payer");
  return null;
}

export default function ExpenseDraftForm({ groupId, categories, memberships, myMembershipId = "", onCreated }) {
  const t = useT();
  const { toPoisha, parse, errorText } = useMoney();
  const [draft, setDraft] = useState(() => emptyDraft(myMembershipId));
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const { showToast } = useToast();

  const payerOptions = useMemo(() => memberships.map((m) => ({ value: memberKey(m), label: memberName(m) })), [memberships]);

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const togglePayer = (key) => update({ payerId: key });

  const submit = async () => {
    const error = validate(draft, toPoisha, parse, t, errorText);
    if (error) {
      showToast({ status: "warning", title: t("exp.checkForm"), description: error });
      return;
    }
    const lines = draft.lines.map((line) => serializeLine(line, toPoisha));
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const payload = {
      date: `${draft.date}T00:00:00.000Z`,
      supplierName: draft.supplierName.trim() || undefined,
      description: draft.description.trim() || undefined,
      costPeriod: draft.costPeriod || undefined,
      isPayable: draft.isPayable,
      receiptReference: draft.receiptReference.trim() || undefined,
      lines,
      payers: [{ memberId: draft.payerId, amount: total, fundAccountId: null }],
    };

    setSaving(true);
    setWarnings([]);
    try {
      const res = await expensesApi.createDraft(groupId, payload);
      showToast({ status: "success", title: res?.msg || t("exp.draftCreated") });
      setWarnings(res?.duplicateWarnings || []);
      setDraft(emptyDraft(myMembershipId));
      onCreated?.(res?.expense);
    } catch (ex) {
      const fieldErrors = ex?.data?.errors;
      const description = Array.isArray(fieldErrors) && fieldErrors.length
        ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" · ")
        : ex?.data?.msg || ex?.message;
      showToast({ status: "error", title: t("exp.couldNotCreate"), description });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {warnings.length > 0 && (
        showToast({
          status: "warning",
          title: t("exp.duplicateTitle"),
          description: warnings
            .map((w) =>
              typeof w === "string"
                ? w
                : `${w.message || w.reason || t("exp.similarExpense")}${w.expenseId ? ` (${w.expenseId})` : ""}`
            )
            .join(" · "),
          duration: 8000,
        })
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t("exp.date")}
          isRequired
          size="lg"
          type="date"
          value={draft.date}
          onChange={(event) => update({ date: event.target.value })}
        />
        <Input
          label={t("exp.costPeriod")}
          size="lg"
          type="month"
          value={draft.costPeriod}
          onChange={(event) => update({ costPeriod: event.target.value })}
        />
        <Input
          label={t("exp.supplier")}
          size="lg"
          placeholder={t("exp.supplierPlaceholder")}
          value={draft.supplierName}
          onChange={(event) => update({ supplierName: event.target.value })}
        />
        <Input
          label={t("exp.receiptReference")}
          size="lg"
          placeholder={t("exp.receiptReferencePlaceholder")}
          value={draft.receiptReference}
          onChange={(event) => update({ receiptReference: event.target.value })}
        />
      </div>
      <Input
        label={t("exp.note")}
        size="lg"
        placeholder={t("exp.notePlaceholder")}
        value={draft.description}
        onChange={(event) => update({ description: event.target.value })}
      />

      <div className="rounded-lg border border-(--bd) bg-(--bgm) p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          <LuTriangleAlert size={13} /> {t("exp.paidBy")} <span className="text-(--danger)">*</span>
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
        <p className="mt-2 text-[11px] text-(--tm)">{t("exp.payerHelp")}</p>
      </div>

      <Checkbox
        label={t("exp.payableToggle")}
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
        <Button size="lg" isFullWidth isLoading={saving} isDisabled={saving || !draft.payerId} onClick={submit}>
          {t("exp.saveDraft")}
        </Button>
      </div>
    </div>
  );
}
