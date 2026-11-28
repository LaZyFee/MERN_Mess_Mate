"use client";

/**
 * Hand-over composer: absence window + task checklist, with an active banner
 * while a hand-over is in force.
 * Mobile-first: dates 2-up, tasks as removable rows with a big input.
 */
import { useState } from "react";
import { LuCheck, LuPlus, LuTrash2, LuUsers, LuClipboardList } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Textarea from "@/components/shared/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { dhakaToday, formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { SectionCard } from "../GroupUI";
import { memberLabel } from "./boardHelpers";

function emptyTask() {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: "" };
}

export default function HandoverComposer({ groupId, memberships = [], activeHandovers = [], activeDate = null, onSaved }) {
  const t = useT();
  const { lang } = useMoney();
  const { showToast } = useToast();
  const [from, setFrom] = useState(activeDate || dhakaToday());
  const [to, setTo] = useState(activeDate || dhakaToday());
  const [toMembershipId, setToMembershipId] = useState("");
  const [note, setNote] = useState("");
  const [tasks, setTasks] = useState([emptyTask()]);
  const [saving, setSaving] = useState(false);

  const addTask = () => setTasks((prev) => [...prev, emptyTask()]);
  const setTask = (key, value) =>
    setTasks((prev) => prev.map((task) => (task.key === key ? { ...task, text: value } : task)));
  const removeTask = (key) => setTasks((prev) => prev.filter((task) => task.key !== key));

  const submit = async () => {
    const cleaned = tasks.map((task) => task.text.trim()).filter(Boolean);
    if (to < from) {
      showToast({ status: "warning", title: t("exp.date"), description: t("exp.err.date") });
      return;
    }
    setSaving(true);
    try {
      await routinesApi.createNote(groupId, {
        kind: "handover",
        title: `${t("board.handover")} ${formatDay(from, lang)} → ${formatDay(to, lang)}`,
        body: note.trim() || undefined,
        audience: { type: "members" },
        handover: {
          from,
          to,
          ...(toMembershipId ? { toMembershipId } : {}),
        },
        tasks: cleaned.map((text, index) => ({ taskKey: `task-${index + 1}`, text })),
      });
      showToast({ status: "success", title: t("board.handover") });
      setTasks([emptyTask()]);
      setNote("");
      onSaved?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {activeHandovers.length > 0 && (
        <div className="rounded-2xl border border-(--warning)/40 bg-(--warning-bg) px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-(--warning)">
            <LuUsers size={13} /> {t("board.handover")}
          </p>
          <ul className="mt-1 list-none space-y-0.5">
            {activeHandovers.map((handover, index) => (
              <li key={handover._id || index} className="truncate text-[11px] text-(--warning)">
                {handover.title || `${formatDay(handover.from, lang)} → ${formatDay(handover.to, lang)}`}
                {handover.toMembershipId ? ` · ${memberLabel(handover.toMembershipId)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <SectionCard icon={LuClipboardList} title={t("board.handover")} subtitle={t("board.notes")}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input size="md" type="date" label={t("stmt.prev")} value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input size="md" type="date" label={t("stmt.next")} value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Select
            size="lg"
            label={t("money.toMember")}
            options={[
              { value: "", label: t("exp.everyone") },
              ...memberships.map((m) => ({ value: m._id, label: memberLabel(m) })),
            ]}
            value={toMembershipId}
            onChange={(event) => setToMembershipId(event.target.value)}
          />
          <Textarea
            label={t("exp.note")}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("exp.notePlaceholder")}
          />

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("board.duties")}</p>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={task.key} className="flex items-end gap-1.5">
                  <div className="min-w-0 flex-1">
                    <Input
                      size="md"
                      label={`${t("exp.line")} ${index + 1}`}
                      value={task.text}
                      onChange={(event) => setTask(task.key, event.target.value)}
                    />
                  </div>
                  <Button size="md" variant="ghost" isRound ariaLabel={t("shell.delete")} onClick={() => removeTask(task.key)}>
                    <LuTrash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-1.5 rounded-full" leftIcon={<LuPlus size={13} />} onClick={addTask}>
              {t("exp.addLine")}
            </Button>
          </div>

          <div className="sticky bottom-2 z-10 rounded-2xl border border-(--bd) bg-(--glb) p-2 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <Button className="rounded-xl" isFullWidth leftIcon={<LuCheck size={14} />} isLoading={saving} isDisabled={saving} onClick={submit}>
              {t("shell.save")}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
