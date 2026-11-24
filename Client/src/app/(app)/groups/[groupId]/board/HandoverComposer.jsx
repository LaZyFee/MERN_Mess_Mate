"use client";

/**
 * T9.6 — Hand-over composer: absence window + task checklist, with an active
 * banner while a hand-over is in force.
 */
import { useState } from "react";
import { LuCheck, LuPlus, LuTrash2, LuUsers } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Textarea from "@/components/shared/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { dhakaToday, formatDay } from "@/lib/utils/format";
import { memberLabel } from "./boardHelpers";

function emptyTask() {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: "" };
}

export default function HandoverComposer({ groupId, memberships = [], activeHandovers = [], activeDate = null, onSaved }) {
  const { showToast } = useToast();
  const [from, setFrom] = useState(activeDate || dhakaToday());
  const [to, setTo] = useState(activeDate || dhakaToday());
  const [toMembershipId, setToMembershipId] = useState("");
  const [note, setNote] = useState("");
  const [tasks, setTasks] = useState([emptyTask()]);
  const [saving, setSaving] = useState(false);

  const addTask = () => setTasks((prev) => [...prev, emptyTask()]);
  const setTask = (key, value) => setTasks((prev) => prev.map((task) => (task.key === key ? { ...task, text: value } : task)));
  const removeTask = (key) => setTasks((prev) => prev.filter((task) => task.key !== key));

  const submit = async () => {
    const cleaned = tasks.map((task) => task.text.trim()).filter(Boolean);
    if (to < from) {
      showToast({ status: "warning", title: "End date must be after the start date" });
      return;
    }
    setSaving(true);
    try {
      await routinesApi.createNote(groupId, {
        kind: "handover",
        title: `Hand-over ${formatDay(from)} → ${formatDay(to)}`,
        body: note.trim() || undefined,
        audience: { type: "members" },
        handover: {
          from,
          to,
          ...(toMembershipId ? { toMembershipId } : {}),
        },
        tasks: cleaned.map((text, index) => ({ taskKey: `task-${index + 1}`, text })),
      });
      showToast({ status: "success", title: "Hand-over created" });
      setTasks([emptyTask()]);
      setNote("");
      onSaved?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not create hand-over", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {activeHandovers.length > 0 && (
        <div className="rounded-lg border border-(--warning) bg-(--warning-bg) px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-(--warning)">
            <LuUsers size={13} /> Hand-over active
          </p>
          <ul className="mt-1 list-none space-y-0.5">
            {activeHandovers.map((handover, index) => (
              <li key={handover._id || index} className="truncate text-[11px] text-(--warning)">
                {handover.title || `${formatDay(handover.from)} → ${formatDay(handover.to)}`}
                {handover.toMembershipId ? ` · ${memberLabel(handover.toMembershipId)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card padding="md" header={<h2 className="text-sm font-bold text-(--tp)">New hand-over</h2>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input size="lg" type="date" label="From" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input size="lg" type="date" label="To" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Select
            size="lg"
            label="Taking over"
            options={[{ value: "", label: "Anyone available" }, ...memberships.map((m) => ({ value: m._id, label: memberLabel(m) }))]}
            value={toMembershipId}
            onChange={(event) => setToMembershipId(event.target.value)}
          />
          <Textarea
            label="Instructions"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Where the keys are, bazar list, what to avoid…"
          />

          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">Task checklist</p>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.key} className="flex items-end gap-2">
                  <Input size="lg" label="Task" value={task.text} onChange={(event) => setTask(task.key, event.target.value)} />
                  <Button size="md" variant="ghost" isRound ariaLabel="Remove task" onClick={() => removeTask(task.key)}>
                    <LuTrash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-2" leftIcon={<LuPlus size={13} />} onClick={addTask}>
              Add task
            </Button>
          </div>

          <Button isFullWidth leftIcon={<LuCheck size={14} />} isLoading={saving} isDisabled={saving} onClick={submit}>
            Create hand-over
          </Button>
        </div>
      </Card>
    </div>
  );
}
