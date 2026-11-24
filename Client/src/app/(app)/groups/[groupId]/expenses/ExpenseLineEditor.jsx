"use client";

import { useMemo } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Checkbox from "@/components/shared/Checkbox";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { SPLIT_MODES } from "@/lib/utils/money";
import { parseTaka, formatPoisha } from "@/lib/utils/format";
import { activeCategories, EMPTY_LINE, memberKey, memberName } from "./expenseHelpers";

const SPLIT_OPTIONS = [{ value: "", label: "Use category default" }, ...SPLIT_MODES];

function MemberPicker({ memberships, selected, onToggle, label }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {memberships.map((membership) => {
          const key = memberKey(membership);
          return (
            <Checkbox
              key={key}
              size="sm"
              label={memberName(membership)}
              isChecked={selected.includes(key)}
              onChange={() => onToggle(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PerMemberAmounts({ memberships, value, onAmountChange, title, poisha }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {memberships.map((membership) => {
          const key = memberKey(membership);
          return (
            <Input
              key={key}
              size="sm"
              type="number"
              inputMode="decimal"
              min="0"
              step={poisha ? "1" : "0.25"}
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
  const categoryOptions = useMemo(
    () =>
      activeCategories(categories).map((category) => ({
        value: category._id,
        label: `${category.icon ? `${category.icon} ` : ""}${category.name}`,
      })),
    [categories],
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

  const lineTotal = lines.reduce((sum, line) => sum + parseTaka(line.amount), 0);

  return (
    <div className="min-w-0 space-y-4">
      {lines.map((line, index) => {
        const mode = line.splitMode;
        const showFixed = mode === "fixed_amounts";
        const showWeights = mode === "weighted" || mode === "usage";
        const showMembers = ["equal_selected", "personal", "fixed_amounts", "weighted", "usage"].includes(mode);

        return (
          <div key={index} className="min-w-0 rounded-lg border border-(--bd) bg-(--bgs) p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-(--tm)">Line {index + 1}</p>
              {lines.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  ariaLabel={`Remove line ${index + 1}`}
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                >
                  <LuTrash2 size={16} />
                </Button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Category"
                isRequired
                size="lg"
                options={categoryOptions}
                placeholder="Choose category"
                value={line.categoryId}
                onChange={(event) => patch(index, { categoryId: event.target.value })}
              />
              <Input
                label="Amount (৳)"
                isRequired
                size="lg"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={line.amount}
                onChange={(event) => patch(index, { amount: event.target.value })}
              />
              <Input
                label="Description"
                size="lg"
                placeholder="Rice, vegetables…"
                value={line.description}
                onChange={(event) => patch(index, { description: event.target.value })}
              />
              <Select
                label="Split mode"
                size="lg"
                options={SPLIT_OPTIONS}
                value={line.splitMode}
                onChange={(event) => patch(index, { splitMode: event.target.value })}
              />
            </div>

            {showMembers && (
              <div className="mt-3 space-y-3">
                <MemberPicker
                  memberships={memberships}
                  selected={line.beneficiaries}
                  onToggle={(key) => toggleBeneficiary(index, key)}
                  label={mode === "personal" ? "Charged to (one member)" : "Beneficiaries"}
                />
                {showFixed && (
                  <PerMemberAmounts
                    memberships={memberships.filter((m) => line.beneficiaries.includes(memberKey(m)))}
                    value={line.fixedAmounts}
                    title="Fixed amount per member (৳)"
                    onAmountChange={(key, value) => setMap(index, "fixedAmounts", key, value)}
                  />
                )}
                {showWeights && (
                  <PerMemberAmounts
                    memberships={memberships.filter((m) => line.beneficiaries.includes(memberKey(m)))}
                    value={mode === "weighted" ? line.weights : line.usageQuantities}
                    title={mode === "weighted" ? "Weight per member" : "Usage quantity per member"}
                    poisha={mode === "weighted"}
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
          size="lg"
          leftIcon={<LuPlus size={16} />}
          onClick={() => onChange([...lines, { ...EMPTY_LINE }])}
          isFullWidth
        >
          Add line
        </Button>
        <p className="text-sm font-bold tabular-nums text-(--tp)">
          Total: {formatPoisha(lineTotal)}
        </p>
      </div>
    </div>
  );
}
