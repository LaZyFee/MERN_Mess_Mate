"use client";

/**
 * New expense draft builder.
 * Mobile-first: stacked fields, a payer "card list" instead of a dropdown, then
 * the line editor; the save button sticks to the bottom of the viewport.
 */
import { useMemo, useState } from "react";
import { LuUserRound, LuPlus, LuSparkles } from "react-icons/lu";
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
    payerId: myMembershipId,
  };
}

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

export default function ExpenseDraftForm({
  groupId,
  categories,
  memberships,
  myMembershipId = "",
  onCreated,
}) {
  const t = useT();
  const { fmt, toPoisha, parse, errorText } = useMoney();
  const [draft, setDraft] = useState(() => emptyDraft(myMembershipId));
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const payerOptions = useMemo(
    () => memberships.map((m) => ({ value: memberKey(m), label: memberName(m) })),
    [memberships],
  );

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const total = useMemo(
    () => draft.lines.reduce((sum, line) => sum + toPoisha(line.amount), 0),
    [draft.lines, toPoisha],
  );

  const submit = async () => {
    const error = validate(draft, toPoisha, parse, t, errorText);
    if (error) {
      showToast({ status: "warning", title: t("exp.checkForm"), description: error });
      return;
    }
    const lines = draft.lines.map((line) => serializeLine(line, toPoisha));
    const sum = lines.reduce((acc, line) => acc + line.amount, 0);
    const payload = {
      date: `${draft.date}T00:00:00.000Z`,
      supplierName: draft.supplierName.trim() || undefined,
      description: draft.description.trim() || undefined,
      costPeriod: draft.costPeriod || undefined,
      isPayable: draft.isPayable,
      receiptReference: draft.receiptReference.trim() || undefined,
      lines,
      payers: [{ memberId: draft.payerId, amount: sum, fundAccountId: null }],
    };

    setSaving(true);
    try {
      const res = await expensesApi.createDraft(groupId, payload);
      showToast({ status: "success", title: res?.msg || t("exp.draftCreated") });
      if (res?.duplicateWarnings?.length) {
        showToast({
          status: "warning",
          title: t("exp.duplicateTitle"),
          description: res.duplicateWarnings
            .map((w) =>
              typeof w === "string"
                ? w
                : `${w.message || w.reason || t("exp.similarExpense")}${w.expenseId ? ` (${w.expenseId})` : ""}`,
            )
            .join(" · "),
          duration: 8000,
        });
      }
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
      {/* ── Who paid ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-(--bd) bg-(--bgm) p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          <LuUserRound size={13} /> {t("exp.paidBy")} <span className="text-(--danger)">*</span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {payerOptions.map((option) => {
            const active = draft.payerId === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ payerId: option.value })}
                aria-pressed={active}
                className={`min-h-11 truncate rounded-xl border px-2.5 text-left text-[12.5px] font-semibold transition-colors ${active
                    ? "border-(--p) bg-(--pale) text-(--p)"
                    : "border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--bd2)"
                  }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-(--tm)">{t("exp.payerHelp")}</p>
      </div>

      {/* ── Header fields ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          label={t("exp.date")}
          isRequired
          size="md"
          type="date"
          value={draft.date}
          onChange={(event) => update({ date: event.target.value })}
        />
        <Input
          label={t("exp.costPeriod")}
          size="md"
          type="month"
          value={draft.costPeriod}
          onChange={(event) => update({ costPeriod: event.target.value })}
        />
        <Input
          label={t("exp.supplier")}
          size="md"
          placeholder={t("exp.supplierPlaceholder")}
          value={draft.supplierName}
          onChange={(event) => update({ supplierName: event.target.value })}
        />
        <Input
          label={t("exp.receiptReference")}
          size="md"
          placeholder={t("exp.receiptReferencePlaceholder")}
          value={draft.receiptReference}
          onChange={(event) => update({ receiptReference: event.target.value })}
        />
      </div>
      <Input
        label={t("exp.note")}
        size="md"
        placeholder={t("exp.notePlaceholder")}
        value={draft.description}
        onChange={(event) => update({ description: event.target.value })}
      />

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

      <div className="sticky bottom-2 z-20 rounded-2xl border border-(--bd) bg-(--glb) p-2 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 px-1 sm:hidden">
            <p className="text-[10px] font-bold uppercase tracking-wide text-(--tm)">{t("exp.total")}</p>
            <p className="truncate text-sm font-extrabold tabular-nums text-(--tp)">{fmt(total)}</p>
          </div>
          <Button
            size="lg"
            className="rounded-xl"
            isFullWidth
            isLoading={saving}
            isDisabled={saving || !draft.payerId}
            leftIcon={<LuSparkles size={15} />}
            onClick={submit}
          >
            {t("exp.saveDraft")}
          </Button>
        </div>
      </div>
    </div>
  );
}
