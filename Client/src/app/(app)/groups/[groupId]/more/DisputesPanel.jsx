"use client";

/**
 * Disputes on expenses / money transactions / statement items.
 * Mobile-first: each dispute is a collapsible card; reply + resolution controls
 * live inside the open card and stack on narrow screens.
 */
import { useCallback, useState } from "react";
import { LuChevronDown, LuMessageCircle, LuPlus, LuRefreshCw, LuMessageSquareWarning } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Textarea from "@/components/shared/Textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { disputesApi } from "@/lib/api/notifications";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, SectionCard } from "../GroupUI";

const TARGETS = [
  { value: "expense", label: "Expense" },
  { value: "money_transaction", label: "Money transaction" },
  { value: "statement_item", label: "Statement item" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

function disputeTicketStatus(status) {
  if (status === "resolved") return "resolved";
  if (status === "rejected") return "closed";
  return "open";
}

function DisputeItem({ groupId, dispute, canManage, onChanged }) {
  const t = useT();
  const { showToast } = useToast();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);

  const act = async (kind) => {
    setBusy(kind);
    try {
      if (kind === "reply") {
        await disputesApi.respond(groupId, dispute._id, reply.trim());
        setReply("");
      } else {
        await disputesApi.resolve(groupId, dispute._id, {
          rejected: kind === "reject",
          note: note.trim() || undefined,
        });
      }
      showToast({ status: "success", title: kind === "reply" ? t("shell.confirm") : t("status.resolved") });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <details className="rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-(--tp)">{dispute.reason}</span>
          <span className="block truncate text-[11px] text-(--tm)">
            {dispute.targetType} · {dispute.raisedBy?.username || t("money.member")} ·{" "}
            {formatDay(String(dispute.createdAt).slice(0, 10))}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <StatusBadge type="ticket" status={disputeTicketStatus(dispute.status)} />
          <LuChevronDown size={14} className="text-(--tm)" />
        </span>
      </summary>

      <div className="mt-2 space-y-2 border-t border-(--bd) pt-2">
        <p className="truncate text-[11px] text-(--ts)">
          {t("money.reference")}: <span className="font-mono text-(--tm)">{dispute.targetId}</span>
        </p>
        {(dispute.responses || []).map((response, index) => (
          <div key={index} className="rounded-lg bg-(--bgm) px-2.5 py-1.5 text-xs text-(--ts)">
            <span className="font-semibold text-(--tp)">{response.userId?.username || t("money.member")}: </span>
            {response.text}
          </div>
        ))}
        {dispute.resolutionNote && (
          <p className="rounded-lg bg-(--pale) px-2.5 py-1.5 text-xs text-(--p)">{dispute.resolutionNote}</p>
        )}

        {dispute.status === "open" && (
          <>
            <Input size="md" label={t("shell.confirm")} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={t("exp.reasonPlaceholder")} />
            <Button
              size="md"
              className="rounded-xl"
              isFullWidth
              leftIcon={<LuMessageCircle size={14} />}
              isLoading={busy === "reply"}
              isDisabled={Boolean(busy) || !reply.trim()}
              onClick={() => act("reply")}
            >
              {t("shell.confirm")}
            </Button>
            {canManage && (
              <>
                <Input size="md" label={t("exp.reasonOptional")} value={note} onChange={(event) => setNote(event.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Button size="md" className="rounded-xl" isLoading={busy === "resolve"} isDisabled={Boolean(busy)} onClick={() => act("resolve")}>
                    {t("status.resolved")}
                  </Button>
                  <Button
                    size="md"
                    className="rounded-xl"
                    variant="danger"
                    isLoading={busy === "reject"}
                    isDisabled={Boolean(busy)}
                    onClick={() => act("reject")}
                  >
                    {t("exp.reject")}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export default function DisputesPanel({ groupId, canManage }) {
  const t = useT();
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [targetType, setTargetType] = useState("expense");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await disputesApi.list(groupId, status);
      setDisputes(data?.disputes || []);
      setMoreCursor(data?.nextCursor || null);
      setLoaded(true);
    } catch (ex) {
      showToast({ status: "error", title: t("more.disputes"), description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, status, showToast, t]);

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await disputesApi.list(groupId, status, moreCursor);
      const next = data?.disputes || [];
      setDisputes((current) => {
        const seen = new Set(current.map((d) => d._id));
        return [...current, ...next.filter((d) => !seen.has(d._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("more.disputes"), description: ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const create = async () => {
    if (!/^[0-9a-fA-F]{24}$/.test(targetId) || !reason.trim()) {
      showToast({ status: "warning", title: t("shell.required") });
      return;
    }
    setSaving(true);
    try {
      await disputesApi.open(groupId, { targetType, targetId, reason: reason.trim() });
      showToast({ status: "success", title: t("more.disputes") });
      setCreating(false);
      setTargetId("");
      setReason("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      icon={LuMessageSquareWarning}
      title={t("more.disputes")}
      subtitle={loaded ? `${disputes.length}` : ""}
      actions={
        <>
          <Button size="sm" variant="outline" className="rounded-full" leftIcon={<LuPlus size={13} />} onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
            {t("shell.add")}
          </Button>
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        </>
      }
      bodyClassName="space-y-2"
    >
      {creating && (
        <div className="space-y-2 rounded-2xl border border-(--bd) bg-(--bgm) p-3">
          <Select size="md" label={t("money.kind")} options={TARGETS} value={targetType} onChange={(e) => setTargetType(e.target.value)} />
          <Input size="md" label={t("money.reference")} value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="24-char id" />
          <Textarea label={t("exp.reasonRequired")} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="md" className="rounded-xl" isFullWidth isLoading={saving} isDisabled={saving} onClick={create}>
            {t("shell.confirm")}
          </Button>
        </div>
      )}

      <Select size="md" options={STATUS_FILTERS} value={status} onChange={(event) => setStatus(event.target.value)} />

      {!loaded && !loading ? (
        <Button variant="secondary" size="md" className="rounded-xl" isFullWidth onClick={load}>
          {t("shell.loadMore")}
        </Button>
      ) : loading ? (
        <Skeleton variant="rect" height={72} className="rounded-xl" />
      ) : disputes.length === 0 ? (
        <EmptyState icon={LuMessageSquareWarning} title={t("shell.noResults")} body={t("more.disputes")} />
      ) : (
        <>
          {disputes.map((dispute) => (
            <DisputeItem key={dispute._id} groupId={groupId} dispute={dispute} canManage={canManage} onChanged={load} />
          ))}
          {moreCursor && (
            <Button variant="outline" size="md" isFullWidth className="rounded-xl" isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
              {t("shell.loadMore")}
            </Button>
          )}
        </>
      )}
    </SectionCard>
  );
}
