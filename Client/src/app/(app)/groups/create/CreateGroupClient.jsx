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
    <main className="[min-height:100dvh] [background:var(--bg)] [padding:var(--space-6)_var(--space-4)]">
      <div className="[max-width:560px] mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 [color:var(--tm)] text-sm mb-5 bg-none border-0 cursor-pointer p-0"
        >
          <LuArrowLeft size={16} /> Back
        </button>

        <h1 className="[font-size:1.375rem] font-extrabold [color:var(--tp)] mb-6">
          Create a Group
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col [gap:var(--space-5)]">
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
              <p className="text-sm font-semibold [color:var(--tp)] mb-3">
                Meal Slots
              </p>
              <div className="grid [grid-template-columns:1fr_1fr] gap-3">
                {SLOTS.map(({ key, label }) => (
                  <div
                    key={key}
                    className={`[border:1px_solid_var(--bd)] [border-radius:var(--r-md)] p-3 ${(slots[key]) ? "[background:var(--pale)]" : "[background:var(--bgs)]"} [transition:var(--transition)]`}
                  >
                    <Checkbox
                      isChecked={slots[key]}
                      onChange={() => toggleSlot(key)}
                      label={label}
                    />
                    {slots[key] && (
                      <div className="mt-2">
                        <Input
                          label="Weight"
                          type="number"
                          size="sm"
                          value={weights[key]}
                          onChange={(e) => setWeights((w) => ({ ...w, [key]: e.target.value }))}
                          min={0}
                          max={10}
                          step={0.25}
                          helperText="Relative weight (0â€“10)"
                        />
                        <div className="mt-2">
                          <p className="text-xs [color:var(--tm)] mb-1">Default portions</p>
                          <div className="flex gap-1 flex-wrap">
                            {SUBUNIT_OPTIONS.map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setDefaultSubunits((d) => ({ ...d, [key]: v }))}
                                className={`[padding:2px_8px] [border-radius:var(--r-pill)] text-xs ${(defaultSubunits[key] === v) ? "font-bold" : "font-normal"} [border:1px_solid_var(--bd)] ${(defaultSubunits[key] === v) ? "[background:var(--p)]" : "[background:var(--bgs)]"} ${(defaultSubunits[key] === v) ? "[color:var(--bgs)]" : "[color:var(--tm)]"} cursor-pointer [min-height:28px]`}
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

