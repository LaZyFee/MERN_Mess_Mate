"use client";

/**
 * Notice board: feed, create note/announcement/alert, pin, audience, receipts.
 * Mobile-first: each notice is a card with a compact action row; hand-over
 * notes expose their task checklist with tappable Claim / Done buttons.
 */
import { useCallback, useEffect, useState } from "react";
import {
  LuArchive,
  LuCheck,
  LuEye,
  LuPin,
  LuPinOff,
  LuPlus,
  LuRefreshCw,
  LuStickyNote,
  LuMegaphone,
} from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Textarea from "@/components/shared/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { EmptyState, SectionCard } from "../GroupUI";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { NOTE_KINDS, memberLabel } from "./boardHelpers";

const KIND_VARIANT = { note: "subtle", announcement: "info", alert: "danger", handover: "warning" };

function NoteCard({ groupId, note, canManage, onChanged }) {
  const t = useT();
  const { lang } = useMoney();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null);
  const [tasks, setTasks] = useState(note.tasks || []);

  const act = async (kind, taskId, action) => {
    setBusy(taskId ? `${kind}:${taskId}` : kind);
    try {
      if (kind === "pin") await routinesApi.updateNote(groupId, note._id, { pinned: !note.pinned });
      else if (kind === "archive") await routinesApi.updateNote(groupId, note._id, { state: "archived" });
      else if (kind === "ack") await routinesApi.ackNote(groupId, note._id);
      else if (kind === "task") await routinesApi.taskAction(groupId, note._id, taskId, action);
      showToast({ status: "success", title: note.title });
      if (kind === "task") {
        setTasks((prev) =>
          prev.map((task) => (task._id === taskId ? { ...task, status: action === "claim" ? "claimed" : "done" } : task)),
        );
      } else {
        onChanged?.();
      }
    } catch (ex) {
      showToast({ status: "error", title: "Action failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const ackCount = (note.ackedBy || []).length;

  return (
    <article
      className={`rounded-2xl border bg-(--bgs) p-3 ${note.pinned ? "border-(--p)/45" : "border-(--bd)"
        }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-[13.5px] font-bold text-(--tp)">
            {note.pinned && <LuPin size={12} className="shrink-0 text-(--p)" />}
            <span className="truncate">{note.title}</span>
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-(--tm)">
            {formatDay(String(note.createdAt).slice(0, 10), lang)} · {note.audience?.type || "all"} · {ackCount} seen
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Badge variant={KIND_VARIANT[note.kind] || "subtle"} size="sm" isRounded>
            {note.kind || "note"}
          </Badge>
          {canManage && (
            <>
              <Button
                size="sm"
                variant="ghost"
                isRound
                ariaLabel={note.pinned ? "Unpin" : "Pin"}
                isLoading={busy === "pin"}
                onClick={() => act("pin")}
              >
                {note.pinned ? <LuPinOff size={14} /> : <LuPin size={14} />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isRound
                ariaLabel="Archive"
                isLoading={busy === "archive"}
                onClick={() => act("archive")}
              >
                <LuArchive size={14} />
              </Button>
            </>
          )}
        </div>
      </header>

      {note.body && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-(--ts)">{note.body}</p>}

      {tasks.length > 0 && (
        <ul className="mt-2 list-none space-y-1 border-t border-(--bd) pt-2">
          {tasks.map((task) => {
            const done = task.status === "done";
            return (
              <li key={task._id} className="flex min-h-10 items-center justify-between gap-2 rounded-lg bg-(--bgm) px-2">
                <span className={`min-w-0 flex-1 truncate text-xs ${done ? "text-(--tl) line-through" : "text-(--ts)"}`}>
                  {task.text}
                  {task.assigneeMembershipId ? ` · ${memberLabel(task.assigneeMembershipId)}` : ""}
                </span>
                {!done && (
                  <span className="flex shrink-0 gap-1">
                    <Button size="sm" className="rounded-lg" variant="ghost" isLoading={busy === `task:${task._id}`} onClick={() => act("task", task._id, "claim")}>
                      {t("shell.confirm")}
                    </Button>
                    <Button size="sm" className="rounded-lg" variant="outline" leftIcon={<LuCheck size={12} />} onClick={() => act("task", task._id, "done")}>
                      {t("board.markDone")}
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {note.kind !== "handover" && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-1.5 rounded-lg"
          leftIcon={<LuEye size={13} />}
          isLoading={busy === "ack"}
          onClick={() => act("ack")}
        >
          Mark as seen
        </Button>
      )}
    </article>
  );
}

export default function NoticeBoardClient({ groupId, initialNotes = [], canManage = false, memberships = [] }) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState(initialNotes || []);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ kind: "note", title: "", body: "", pinned: false, audience: "all" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await routinesApi.notes(groupId);
      setNotes(data?.notes || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load notices", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    return onRealtime((event) => {
      if (event === "note-created" || event === "note-updated") load();
    });
  }, [load]);

  const create = async () => {
    if (!form.title.trim()) {
      showToast({ status: "warning", title: "Add a title" });
      return;
    }
    setSaving(true);
    try {
      await routinesApi.createNote(groupId, {
        kind: form.kind,
        title: form.title.trim(),
        body: form.body.trim() || undefined,
        pinned: form.pinned,
        audience: { type: form.audience },
      });
      showToast({ status: "success", title: "Notice published" });
      setOpen(false);
      setForm({ kind: "note", title: "", body: "", pinned: false, audience: "all" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not publish", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  const visible = notes.filter((note) => note.state !== "archived");

  return (
    <>
      <SectionCard
        icon={LuStickyNote}
        title="Notice board"
        subtitle={`${visible.length}`}
        actions={
          <>
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button variant="primary" size="sm" className="rounded-full" leftIcon={<LuPlus size={13} />} onClick={() => setOpen(true)}>
              New
            </Button>
          </>
        }
        bodyClassName="space-y-2"
      >
        {loading && visible.length === 0 ? (
          <div className="space-y-2">
            <Skeleton variant="rect" height={80} className="rounded-2xl" />
            <Skeleton variant="rect" height={80} className="rounded-2xl" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={LuMegaphone} title="No notices yet" body="Post an announcement, an alert or a hand-over for the house." />
        ) : (
          visible.map((note) => (
            <NoteCard key={note._id} groupId={groupId} note={note} canManage={canManage} onChanged={load} />
          ))
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        header="New notice"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setOpen(false)} isDisabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" isFullWidth className="sm:!w-fit" isLoading={saving} isDisabled={saving} onClick={create}>
              Publish
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select size="lg" label="Kind" options={NOTE_KINDS} value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} />
          <Input size="lg" label="Title" isRequired maxLength={120} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Body" rows={4} maxLength={2000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <Select
            size="lg"
            label="Audience"
            options={[
              { value: "all", label: "Everyone in the group" },
              { value: "members", label: "Members only" },
              ...(memberships.length ? [{ value: "role", label: "Selected roles (managers default)" }] : []),
            ]}
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-(--bgm) px-3 text-xs font-semibold text-(--ts)">
            <input
              type="checkbox"
              className="size-5 accent-(--p)"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
            />
            Pin to the top of the board
          </label>
        </div>
      </Modal>
    </>
  );
}
