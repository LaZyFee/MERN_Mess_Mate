"use client";

/**
 * Split-line editor for one expense draft.
 * Mobile-first: category + amount sit side by side, the rest stacks; member
 * pickers become a 2-up tappable grid.
 */
import { useMemo } from "react";
import { LuPlus, LuTrash2, LuSplit, LuLayers } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { activeCategories, EMPTY_LINE, memberKey, memberName } from "./expenseHelpers";

function MemberPicker({ memberships, selected, onToggle, label }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {memberships.map((membership) => {
          const key = memberKey(membership);
          const active = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={active}
              className={`min-h-10 truncate rounded-xl border px-2.5 text-left text-[12.5px] font-semibold transition-colors ${active
                  ? "border-(--p) bg-(--pale) text-(--p)"
                  : "border-(--bd) bg-(--bgs) text-(--ts) hover:border-(--bd2)"
                }`}
            >
              {memberName(membership)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PerMemberAmounts({ memberships, value, onAmountChange, title, integer }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {memberships.map((membership) => {
          const key = memberKey(membership);
          return (
            <Input
              key={key}
              size="sm"
              type="number"
              inputMode="decimal"
              min="0"
              step={integer ? "1" : "0.25"}
              label={memberName(membership)}
              value={value?.[key] ?? ""}
              onChange={(event) => onAmountChange(key, event.target.value)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function ExpenseLineEditor({ lines, memberships, categories, onChange }) {
  const t = useT();
  const { fmt, toPoisha } = useMoney();
  const categoryOptions = useMemo(
    () =>
      activeCategories(categories).map((category) => ({
        value: category._id,
        label: `${category.icon ? `${category.icon} ` : ""}${category.name}`,
      })),
    [categories],
  );
  const splitOptions = useMemo(
    () => [
      { value: "", label: t("exp.useDefaultSplit") },
      ...["meal_units", "equal_all", "equal_selected", "member_days", "fixed_amounts", "weighted", "usage", "personal"].map(
        (value) => ({ value, label: t(`split.${value}`) }),
      ),
    ],
    [t],
  );

  const patch = (index, updates) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...updates } : line)));
  };

  const toggleBeneficiary = (index, key) => {
    const line = lines[index];
    const next = line.beneficiaries.includes(key)
      ? line.beneficiaries.filter((id) => id !== key)
      : [...line.beneficiaries, key];
    patch(index, { beneficiaries: next });
  };

  const setMap = (index, field, key, value) => {
    const line = lines[index];
    patch(index, { [field]: { ...(line[field] || {}), [key]: value } });
  };

  const lineTotal = lines.reduce((sum, line) => sum + toPoisha(line.amount), 0);

  return (
    <div className="min-w-0 space-y-3">
      {lines.map((line, index) => {
        const mode = line.splitMode;
        const showFixed = mode === "fixed_amounts";
        const showWeights = mode === "weighted" || mode === "usage";
        const showMembers = ["equal_selected", "personal", "fixed_amounts", "weighted", "usage"].includes(mode);

        return (
          <div key={index} className="min-w-0 rounded-2xl border border-(--bd) bg-(--bgs) p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
                <LuLayers size={12} /> {t("exp.line")} {index + 1}
              </p>
              {lines.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  isRound
                  ariaLabel={`${t("exp.line")} ${index + 1}`}
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                >
                  <LuTrash2 size={15} />
                </Button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Select
                label={t("exp.category")}
                isRequired
                size="md"
                options={categoryOptions}
                placeholder={t("exp.chooseCategory")}
                value={line.categoryId}
                onChange={(event) => patch(index, { categoryId: event.target.value })}
              />
              <Input
                label={t("exp.lineAmount")}
                isRequired
                size="md"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={line.amount}
                onChange={(event) => patch(index, { amount: event.target.value })}
              />
              <Input
                label={t("exp.description")}
                size="md"
                placeholder={t("exp.descriptionPlaceholder")}
                value={line.description}
                onChange={(event) => patch(index, { description: event.target.value })}
              />
              <Select
                label={t("exp.splitMode")}
                size="md"
                options={splitOptions}
                value={line.splitMode}
                onChange={(event) => patch(index, { splitMode: event.target.value })}
              />
            </div>

            {showMembers && (
              <div className="mt-3 space-y-3 border-t border-(--bd) pt-3">
                <MemberPicker
                  memberships={memberships}
                  selected={line.beneficiaries}
                  onToggle={(key) => toggleBeneficiary(index, key)}
                  label={mode === "personal" ? t("exp.chargedTo") : t("exp.beneficiary")}
                />
                {showFixed && (
                  <PerMemberAmounts
                    memberships={memberships.filter((m) => line.beneficiaries.includes(memberKey(m)))}
                    value={line.fixedAmounts}
                    title={t("exp.fixedPerMember")}
                    onAmountChange={(key, value) => setMap(index, "fixedAmounts", key, value)}
                  />
                )}
                {showWeights && (
                  <PerMemberAmounts
                    memberships={memberships.filter((m) => line.beneficiaries.includes(memberKey(m)))}
                    value={mode === "weighted" ? line.weights : line.usageQuantities}
                    title={mode === "weighted" ? t("exp.weightPerMember") : t("exp.usagePerMember")}
                    integer={mode === "weighted"}
                    onAmountChange={(key, value) =>
                      setMap(index, mode === "weighted" ? "weights" : "usageQuantities", key, value)
                    }
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="dashed"
          size="md"
          className="rounded-xl"
          leftIcon={<LuPlus size={15} />}
          onClick={() => onChange([...lines, { ...EMPTY_LINE }])}
          isFullWidth
        >
          {t("exp.addLine")}
        </Button>
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-(--pale) px-3 py-2 text-sm font-bold tabular-nums text-(--p) sm:justify-start">
          <LuSplit size={13} /> {t("exp.total")}: {fmt(lineTotal)}
        </p>
      </div>
    </div>
  );
}
