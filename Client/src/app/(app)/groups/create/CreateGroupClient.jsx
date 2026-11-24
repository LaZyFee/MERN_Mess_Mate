"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Checkbox from "@/components/shared/Checkbox";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";

const SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snacks", label: "Snacks" },
  { key: "dinner", label: "Dinner" },
];

const SUBUNIT_OPTIONS = [0, 250, 500, 750, 1000];

const DEFAULT_WEIGHTS = { breakfast: 1, lunch: 1, snacks: 0.5, dinner: 1 };

export default function CreateGroupPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [slots, setSlots] = useState({ breakfast: true, lunch: true, snacks: false, dinner: true });
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [defaultSubunits, setDefaultSubunits] = useState({ breakfast: 1000, lunch: 1000, snacks: 500, dinner: 1000 });
  const [defaultMealsEnabled, setDefaultMealsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleSlot = (k) => setSlots((s) => ({ ...s, [k]: !s[k] }));

  const selectedSlots = SLOTS.filter((s) => slots[s.key]).map((s) => s.key);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setNameErr("Group name is required"); return; }
    setNameErr("");
    setLoading(true);
    try {
      const mealSlots = selectedSlots.length ? selectedSlots : undefined;
      const mealWeights = selectedSlots.length
        ? Object.fromEntries(selectedSlots.map((k) => [k, parseFloat(weights[k]) || 1]))
        : undefined;
      const defSubunits = selectedSlots.length
        ? Object.fromEntries(selectedSlots.map((k) => [k, defaultSubunits[k] ?? 1000]))
        : undefined;

      const data = await groupsApi.createGroup({
        name: name.trim(),
        mealSlots,
        mealWeights,
        defaultMealSubunits: defSubunits,
        defaultMealsEnabled,
      });
      const groupId = data?.group?._id || data?._id;
      showToast({ status: "success", title: "Group created!" });
      router.push(groupId ? `/groups/${groupId}` : "/");
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.data?.message || ex?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={["[min-height:100dvh]", "[background:var(--bg)]", "[padding:var(--space-6)_var(--space-4)]"].filter(Boolean).join(" ")}>
      <div className={["[max-width:560px]", "[margin:0_auto]"].filter(Boolean).join(" ")}>
        <button
          onClick={() => router.back()}
          className={["[display:flex]", "[align-items:center]", "[gap:6px]", "[color:var(--tm)]", "[font-size:0.875rem]", "[margin-bottom:var(--space-5)]", "[background:none]", "[border:none]", "[cursor:pointer]", "[padding:0px]"].filter(Boolean).join(" ")}
        >
          <LuArrowLeft size={16} /> Back
        </button>

        <h1 className={["[font-size:1.375rem]", "font-extrabold", "[color:var(--tp)]", "[margin-bottom:var(--space-6)]"].filter(Boolean).join(" ")}>
          Create a Group
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-5)]"].filter(Boolean).join(" ")}>
            <Input
              label="Group Name"
              isRequired
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(""); }}
              isInvalid={!!nameErr}
              errorMessage={nameErr}
              placeholder="e.g. Block-C Mess"
            />

            {/* Meal Slots */}
            <div>
              <p className={["[font-size:0.875rem]", "font-semibold", "[color:var(--tp)]", "[margin-bottom:var(--space-3)]"].filter(Boolean).join(" ")}>
                Meal Slots
              </p>
              <div className={["[display:grid]", "[grid-template-columns:1fr_1fr]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
                {SLOTS.map(({ key, label }) => (
                  <div
                    key={key}
                    className={["[border:1px_solid_var(--bd)]", "[border-radius:var(--r-md)]", "[padding:var(--space-3)]", (slots[key]) ? "[background:var(--pale)]" : "[background:var(--bgs)]", "[transition:var(--transition)]"].filter(Boolean).join(" ")}
                  >
                    <Checkbox
                      isChecked={slots[key]}
                      onChange={() => toggleSlot(key)}
                      label={label}
                    />
                    {slots[key] && (
                      <div className={["[margin-top:var(--space-2)]"].filter(Boolean).join(" ")}>
                        <Input
                          label="Weight"
                          type="number"
                          size="sm"
                          value={weights[key]}
                          onChange={(e) => setWeights((w) => ({ ...w, [key]: e.target.value }))}
                          min={0}
                          max={10}
                          step={0.25}
                          helperText="Relative weight (0–10)"
                        />
                        <div className={["[margin-top:var(--space-2)]"].filter(Boolean).join(" ")}>
                          <p className={["[font-size:0.75rem]", "[color:var(--tm)]", "[margin-bottom:var(--space-1)]"].filter(Boolean).join(" ")}>Default portions</p>
                          <div className={["[display:flex]", "[gap:var(--space-1)]", "[flex-wrap:wrap]"].filter(Boolean).join(" ")}>
                            {SUBUNIT_OPTIONS.map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setDefaultSubunits((d) => ({ ...d, [key]: v }))}
                                className={["[padding:2px_8px]", "[border-radius:var(--r-pill)]", "[font-size:0.75rem]", (defaultSubunits[key] === v) ? "font-bold" : "font-normal", "[border:1px_solid_var(--bd)]", (defaultSubunits[key] === v) ? "[background:var(--p)]" : "[background:var(--bgs)]", (defaultSubunits[key] === v) ? "[color:var(--bgs)]" : "[color:var(--tm)]", "[cursor:pointer]", "[min-height:28px]"].filter(Boolean).join(" ")}
                              >
                                {v === 0 ? "0" : `${v / 1000}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Checkbox
              isChecked={defaultMealsEnabled}
              onChange={() => setDefaultMealsEnabled((v) => !v)}
              label="Enable meals by default for new members"
            />

            <Button type="submit" isFullWidth isLoading={loading} isDisabled={loading || selectedSlots.length === 0}>
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
