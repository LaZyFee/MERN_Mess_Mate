"use client";

/**
 * Polls for quick house decisions (menu, bazar, duties).
 * Mobile-first: options are full-width bars with the result fill behind the
 * label, so voting and reading results both work one-handed.
 */
import { useCallback, useState } from "react";
import { LuChartBar, LuCheck, LuLock, LuPlus, LuRefreshCw, LuVote } from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { pollsApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState, SectionCard } from "../GroupUI";

function PollCard({ groupId, poll, canManage, onChanged }) {
  const t = useT();
  const { n } = useMoney();
  const { showToast } = useToast();
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(null);

  const options = poll.options || [];
  const counts = results?.counts || poll.counts || [];
  const totalVotes = results?.totalVotes ?? poll.totalVotes ?? counts.reduce((sum, v) => sum + (v || 0), 0);
  const closed = poll.status === "closed" || Boolean(poll.closedAt);
  const myVote = results?.myVote ?? poll.myVote;

  const vote = async (index) => {
    setBusy(`vote-${index}`);
    try {
      await pollsApi.vote(groupId, poll._id, index);
      const data = await pollsApi.results(groupId, poll._id);
      setResults(data?.results || data);
      showToast({ status: "success", title: t("shell.confirm") });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const close = async () => {
    setBusy("close");
    try {
      await pollsApi.close(groupId, poll._id);
      showToast({ status: "success", title: t("shell.confirm") });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="rounded-2xl border border-(--bd) bg-(--bgs) p-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13.5px] font-bold text-(--tp)">{poll.question || poll.title}</h3>
          <p className="text-[11px] text-(--tm)">
            {n(totalVotes)} · {poll.createdAt ? formatDay(String(poll.createdAt).slice(0, 10)) : ""}
          </p>
        </div>
        <Badge variant={closed ? "secondary" : "info"} size="sm" isRounded>
          {closed ? t("shell.close") : t("status.open")}
        </Badge>
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
                aria-pressed={selected}
                className={`relative flex min-h-11 w-full items-center justify-between gap-2 overflow-hidden rounded-xl border px-2.5 text-left text-xs transition-colors ${selected ? "border-(--p) bg-(--pale)" : "border-(--bd) bg-(--bgm) hover:border-(--p)/50"
                  } ${closed ? "cursor-default" : ""}`}
              >
                {results && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-(--p)/15"
                    style={{ width: `${percent}%` }}
                  />
                )}
                <span className="relative flex min-w-0 items-center gap-1.5">
                  {selected && <LuCheck size={12} className="shrink-0 text-(--p)" />}
                  <span className={`truncate ${selected ? "font-bold text-(--p)" : "text-(--ts)"}`}>{label}</span>
                </span>
                {results && (
                  <span className="relative shrink-0 text-[11px] font-semibold tabular-nums text-(--tm)">
                    {n(count)} · {n(percent)}%
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" className="rounded-full" variant="ghost" leftIcon={<LuChartBar size={13} />} isLoading={busy === "results"} onClick={loadResults}>
          {t("charts.byCategory")}
        </Button>
        {canManage && !closed && (
          <Button size="sm" className="rounded-full" variant="outline" leftIcon={<LuLock size={13} />} isLoading={busy === "close"} onClick={close}>
            {t("shell.close")}
          </Button>
        )}
      </div>
    </article>
  );
}

export default function PollsPanel({ groupId, initialPolls = [], canManage = false }) {
  const t = useT();
  const { n } = useMoney();
  const { showToast } = useToast();
  const [polls, setPolls] = useState(initialPolls || []);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pollsApi.list(groupId);
      setPolls(data?.polls || []);
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await pollsApi.list(groupId, { cursor: moreCursor });
      const next = data?.polls || [];
      setPolls((current) => {
        const seen = new Set(current.map((p) => p._id));
        return [...current, ...next.filter((p) => !seen.has(p._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const create = async () => {
    const cleaned = options.map((option) => option.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) {
      showToast({ status: "warning", title: t("shell.required") });
      return;
    }
    setSaving(true);
    try {
      await pollsApi.create(groupId, { question: question.trim(), options: cleaned });
      showToast({ status: "success", title: t("shell.confirm") });
      setOpen(false);
      setQuestion("");
      setOptions(["", ""]);
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        icon={LuVote}
        title={t("board.polls")}
        subtitle={n(polls.length)}
        actions={
          <>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button variant="primary" size="sm" className="rounded-full" leftIcon={<LuPlus size={13} />} onClick={() => setOpen(true)}>
              {t("shell.add")}
            </Button>
          </>
        }
        bodyClassName="space-y-2"
      >
        {loading && polls.length === 0 ? (
          <Skeleton variant="rect" height={80} className="rounded-2xl" />
        ) : polls.length === 0 ? (
          <EmptyState icon={LuVote} title={t("shell.noResults")} body={t("board.polls")} />
        ) : (
          <>
            {polls.map((poll) => (
              <PollCard key={poll._id} groupId={groupId} poll={poll} canManage={canManage} onChanged={load} />
            ))}
            {moreCursor && (
              <Button variant="outline" size="md" isFullWidth className="rounded-xl" isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
                {t("shell.loadMore")}
              </Button>
            )}
          </>
        )}
      </SectionCard>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        header={t("board.polls")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setOpen(false)} isDisabled={saving}>
              {t("shell.cancel")}
            </Button>
            <Button variant="primary" isFullWidth className="sm:!w-fit" isLoading={saving} isDisabled={saving} onClick={create}>
              {t("shell.confirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input size="lg" label={t("board.polls")} isRequired maxLength={200} value={question} onChange={(event) => setQuestion(event.target.value)} />
          {options.map((option, index) => (
            <Input
              key={index}
              size="lg"
              label={`${t("exp.line")} ${index + 1}`}
              value={option}
              maxLength={120}
              onChange={(event) => setOptions((prev) => prev.map((value, i) => (i === index ? event.target.value : value)))}
            />
          ))}
          {options.length < 6 && (
            <Button size="sm" variant="ghost" className="rounded-full" leftIcon={<LuPlus size={13} />} onClick={() => setOptions((prev) => [...prev, ""])}>
              {t("exp.addLine")}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
