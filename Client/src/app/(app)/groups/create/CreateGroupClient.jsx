"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Checkbox from "@/components/shared/Checkbox";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";

const SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snacks", label: "Evening Snacks" },
  { key: "dinner", label: "Dinner" },
];

const SUBUNIT_OPTIONS = [
  { value: 0, label: "0" },
  { value: 250, label: "0.25" },
  { value: 500, label: "0.5" },
  { value: 750, label: "0.75" },
  { value: 1000, label: "1" },
];

const DEFAULT_WEIGHTS = { breakfast: 0.5, lunch: 1, snacks: 0.5, dinner: 1 };

export default function CreateGroupPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [slots, setSlots] = useState({ breakfast: false, lunch: true, snacks: false, dinner: true });
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const [defaultSubunits, setDefaultSubunits] = useState({ breakfast: 500, lunch: 1000, snacks: 500, dinner: 1000 });
  const [defaultMealsEnabled, setDefaultMealsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleSlot = (k) => setSlots((s) => ({ ...s, [k]: !s[k] }));

  const selectedSlots = SLOTS.filter((s) => slots[s.key]).map((s) => s.key);
  const noSlots = selectedSlots.length === 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setNameErr("Enter a group name"); return; }
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
      showToast({ status: "success", title: "Group created" });
      router.push(groupId ? `/groups/${groupId}` : "/");
    } catch (ex) {
      showToast({ status: "error", title: "Couldn’t create group", description: ex?.data?.message || ex?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-(--bg) px-4 pb-0 pt-4">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-5 flex flex-col gap-4">
          {/* Step 1: name */}
          <section className="rounded-(--r-md) border border-(--bd) bg-(--bgs) p-4 sm:p-5">
            <Input
              label="Group name"
              isRequired
              value={name}
              onChange={(e) => { setName(e.target.value); setNameErr(""); }}
              isInvalid={!!nameErr}
              errorMessage={nameErr}
              placeholder="e.g. Block-C Mess"
            />
          </section>

          {/* Step 2: meal slots */}
          <section className="rounded-(--r-md) border border-(--bd) bg-(--bgs) p-4 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-(--tp)">Meals served</h2>
                <p className="mt-0.5 text-sm text-(--tm)">
                  Turn on the meals your group eats together.
                </p>
              </div>
              <span className="shrink-0 rounded-(--r-pill) bg-(--pale) px-2.5 py-1 text-xs font-semibold text-(--tp)">
                {selectedSlots.length} of {SLOTS.length} on
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SLOTS.map(({ key, label }) => {
                const on = slots[key];
                return (
                  <div
                    key={key}
                    className={`rounded-(--r-md) border p-3 transition-colors ${on ? "border-(--p) bg-(--pale)" : "border-(--bd) bg-(--bg)"
                      }`}
                  >
                    <Checkbox
                      isChecked={on}
                      onChange={() => toggleSlot(key)}
                      label={label}
                    />

                    {on && (
                      <div className="mt-3 flex flex-col gap-3 border-t border-(--bd) pt-3">
                        <Input
                          label="Weight"
                          type="number"
                          size="sm"
                          value={weights[key]}
                          onChange={(e) => setWeights((w) => ({ ...w, [key]: e.target.value }))}
                          min={0}
                          max={10}
                          step={0.25}
                          helperText="How much this meal counts, from 0 to 10"
                        />

                        <div>
                          <p
                            id={`portion-${key}`}
                            className="mb-1.5 text-xs font-semibold text-(--tm)"
                          >
                            Default portion
                          </p>
                          <div
                            role="group"
                            aria-labelledby={`portion-${key}`}
                            className="grid grid-cols-5 overflow-hidden rounded-(--r-pill) border border-(--bd) bg-(--bgs)"
                          >
                            {SUBUNIT_OPTIONS.map(({ value, label: optLabel }) => {
                              const active = defaultSubunits[key] === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => setDefaultSubunits((d) => ({ ...d, [key]: value }))}
                                  className={`min-h-8 cursor-pointer text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--p) ${active
                                    ? "bg-(--p) font-bold text-(--bgs)"
                                    : "font-medium text-(--tm) hover:bg-(--pale)"
                                    }`}
                                >
                                  {optLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {noSlots && (
              <p role="alert" className="mt-3 text-sm text-(--tm)">
                Select at least one meal to create the group.
              </p>
            )}
          </section>

          {/* Step 3: member defaults */}
          <section className="rounded-(--r-md) border border-(--bd) bg-(--bgs) p-4 sm:p-5">
            <h2 className="text-base font-bold text-(--tp)">New members</h2>
            <p className="mb-3 mt-0.5 text-sm text-(--tm)">
              Choose what happens when someone joins.
            </p>
            <Checkbox
              isChecked={defaultMealsEnabled}
              onChange={() => setDefaultMealsEnabled((v) => !v)}
              label="Turn meals on by default for new members"
            />
          </section>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 -mx-4 mt-5 border-t border-(--bd) bg-(--bg) px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              isFullWidth
              isLoading={loading}
              isDisabled={loading || noSlots}
            >
              Create group
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}