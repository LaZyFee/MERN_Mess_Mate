"use client";

/**
 * T9.10 — Polls for quick house decisions (menu, bazar, duties).
 */
import { useCallback, useState } from "react";
import { LuChartBar, LuCheck, LuLock, LuPlus, LuRefreshCw, LuVote } from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { pollsApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";

function PollCard({ groupId, poll, canManage, onChanged }) {
  const { showToast } = useToast();
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(null);

  const options = poll.options || [];
  const counts = results?.counts || poll.counts || [];
  const totalVotes = results?.totalVotes ?? poll.totalVotes ?? counts.reduce((sum, n) => sum + (n || 0), 0);
  const closed = poll.status === "closed" || Boolean(poll.closedAt);
  const myVote = results?.myVote ?? poll.myVote;

  const vote = async (index) => {
    setBusy(`vote-${index}`);
    try {
      await pollsApi.vote(groupId, poll._id, index);
      const data = await pollsApi.results(groupId, poll._id);
      setResults(data?.results || data);
      showToast({ status: "success", title: "Vote recorded" });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not vote", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const loadResults = async () => {
    setBusy("results");
    try {
      const data = await pollsApi.results(groupId, poll._id);
      setResults(data?.results || data);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load results", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const close = async () => {
    setBusy("close");
    try {
      await pollsApi.close(groupId, poll._id);
      showToast({ status: "success", title: "Poll closed" });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Could not close poll", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-(--tp)">{poll.question || poll.title}</h3>
          <p className="text-[11px] text-(--tm)">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            {poll.createdAt ? ` · ${formatDay(String(poll.createdAt).slice(0, 10))}` : ""}
          </p>
        </div>
        <Badge variant={closed ? "secondary" : "info"}>{closed ? "Closed" : "Open"}</Badge>
      </header>

      <ul className="mt-2 list-none space-y-1">
        {options.map((option, index) => {
          const label = typeof option === "string" ? option : option.label;
          const count = counts[index] || 0;
          const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const selected = myVote === index;
          return (
            <li key={`${label}-${index}`}>
              <button
                type="button"
                disabled={closed || Boolean(busy)}
                onClick={() => vote(index)}
                className={`relative flex min-h-11 w-full items-center justify-between gap-2 overflow-hidden rounded-md border px-2 text-left text-xs transition-[var(--transition)] ${selected ? "border-(--p) bg-(--pale)" : "border-(--bd) bg-(--bgm) hover:border-(--p)"
                  } ${closed ? "cursor-default" : ""}`}
              >
                {results && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-(--p)/15 w-[var(--bar)]"
                    style={{ "--bar": `${percent}%` }}
                  />
                )}
                <span className="relative flex min-w-0 items-center gap-1.5">
                  {selected && <LuCheck size={12} className="shrink-0 text-(--p)" />}
                  <span className="truncate text-(--ts)">{label}</span>
                </span>
                {results && (
                  <span className="relative shrink-0 tabular-nums text-(--tm)">{count} · {percent}%</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" leftIcon={<LuChartBar size={13} />} isLoading={busy === "results"} onClick={loadResults}>
          Results
        </Button>
        {canManage && !closed && (
          <Button size="sm" variant="outline" leftIcon={<LuLock size={13} />} isLoading={busy === "close"} onClick={close}>
            Close poll
          </Button>
        )}
      </div>
    </article>
  );
}

export default function PollsPanel({ groupId, initialPolls = [], canManage = false }) {
  const { showToast } = useToast();
  const [polls, setPolls] = useState(initialPolls || []);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pollsApi.list(groupId);
      setPolls(data?.polls || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load polls", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  const create = async () => {
    const cleaned = options.map((option) => option.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) {
      showToast({ status: "warning", title: "Add a question and at least two options" });
      return;
    }
    setSaving(true);
    try {
      await pollsApi.create(groupId, { question: question.trim(), options: cleaned });
      showToast({ status: "success", title: "Poll created" });
      setOpen(false);
      setQuestion("");
      setOptions(["", ""]);
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not create poll", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
            <LuVote size={15} className="text-(--p)" /> Polls
          </h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button size="sm" leftIcon={<LuPlus size={13} />} onClick={() => setOpen(true)}>New poll</Button>
          </div>
        </div>
      }
    >
      {loading && polls.length === 0 ? (
        <Skeleton variant="rect" height={80} />
      ) : polls.length === 0 ? (
        <p className="py-4 text-center text-xs text-(--tm)">No polls yet. Ask the house what to cook on Friday.</p>
      ) : (
        <div className="space-y-2">
          {polls.map((poll) => (
            <PollCard key={poll._id} groupId={groupId} poll={poll} canManage={canManage} onChanged={load} />
          ))}
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        header="New poll"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} isDisabled={saving}>Cancel</Button>
            <Button isLoading={saving} isDisabled={saving} onClick={create}>Create poll</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input size="lg" label="Question" isRequired maxLength={200} value={question} onChange={(event) => setQuestion(event.target.value)} />
          {options.map((option, index) => (
            <Input
              key={index}
              size="lg"
              label={`Option ${index + 1}`}
              value={option}
              maxLength={120}
              onChange={(event) => setOptions((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))}
            />
          ))}
          {options.length < 6 && (
            <Button size="sm" variant="ghost" leftIcon={<LuPlus size={13} />} onClick={() => setOptions((prev) => [...prev, ""])}>
              Add option
            </Button>
          )}
        </div>
      </Modal>
    </Card>
  );
}
