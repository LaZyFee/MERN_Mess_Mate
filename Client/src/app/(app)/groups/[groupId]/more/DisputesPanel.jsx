"use client";

import { useCallback, useState } from "react";
import { LuChevronDown, LuMessageCircle, LuPlus, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Textarea from "@/components/shared/Textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { disputesApi } from "@/lib/api/notifications";
import { formatDay } from "@/lib/utils/format";

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
      showToast({ status: "success", title: kind === "reply" ? "Reply added" : "Dispute resolved" });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: "Action failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <details className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
      <summary className="flex min-h-11 list-none cursor-pointer items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-(--tp)">{dispute.reason}</span>
          <span className="block truncate text-[11px] text-(--tm)">
            {dispute.targetType} · {dispute.raisedBy?.username || "member"} ·{" "}
            {formatDay(String(dispute.createdAt).slice(0, 10))}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <StatusBadge type="ticket" status={disputeTicketStatus(dispute.status)} />
          <LuChevronDown size={14} className="text-(--tm)" />
        </span>
      </summary>

      <div className="mt-2 space-y-2 border-t border-(--bd) pt-2">
        <p className="text-xs text-(--ts)">Target: <span className="font-mono text-(--tm)">{dispute.targetId}</span></p>
        {(dispute.responses || []).map((response, index) => (
          <div key={index} className="rounded-md bg-(--bgm) px-2 py-1 text-xs text-(--ts)">
            <span className="font-semibold">{response.userId?.username || "Member"}: </span>
            {response.text}
          </div>
        ))}
        {dispute.resolutionNote && (
          <p className="rounded-md bg-(--pale) px-2 py-1 text-xs text-(--p)">Resolution: {dispute.resolutionNote}</p>
        )}

        {dispute.status === "open" && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                size="lg"
                label="Reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Add your response"
              />
              <Button
                size="lg"
                leftIcon={<LuMessageCircle size={14} />}
                isLoading={busy === "reply"}
                isDisabled={Boolean(busy) || !reply.trim()}
                onClick={() => act("reply")}
              >
                Reply
              </Button>
            </div>
            {canManage && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  size="lg"
                  label="Resolution note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="lg" isLoading={busy === "resolve"} isDisabled={Boolean(busy)} onClick={() => act("resolve")}>
                    Resolve
                  </Button>
                  <Button
                    size="lg"
                    variant="danger"
                    isLoading={busy === "reject"}
                    isDisabled={Boolean(busy)}
                    onClick={() => act("reject")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export default function DisputesPanel({ groupId, canManage }) {
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
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
      setLoaded(true);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load disputes", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, status, showToast]);

  const create = async () => {
    if (!/^[0-9a-fA-F]{24}$/.test(targetId) || !reason.trim()) {
      showToast({ status: "warning", title: "Enter a valid target id and a reason" });
      return;
    }
    setSaving(true);
    try {
      await disputesApi.open(groupId, { targetType, targetId, reason: reason.trim() });
      showToast({ status: "success", title: "Dispute opened" });
      setCreating(false);
      setTargetId("");
      setReason("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not open dispute", description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-(--tp)">Disputes</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LuPlus size={13} />}
              onClick={() => setCreating((value) => !value)}
            >
              Open
            </Button>
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
          </div>
        </div>
      }
    >
      {creating && (
        <div className="mb-3 space-y-2 rounded-lg border border-(--bd) bg-(--bgm) p-3">
          <Select size="lg" label="Target type" options={TARGETS} value={targetType} onChange={(e) => setTargetType(e.target.value)} />
          <Input size="lg" label="Target id" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="24-char id" />
          <Textarea label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="md" isFullWidth isLoading={saving} isDisabled={saving} onClick={create}>
            Submit dispute
          </Button>
        </div>
      )}

      <Select
        size="sm"
        options={STATUS_FILTERS}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      />

      <div className="mt-3 space-y-2">
        {!loaded && !loading ? (
          <Button variant="secondary" size="md" isFullWidth onClick={load}>
            Load disputes
          </Button>
        ) : loading ? (
          <Skeleton variant="rect" height={72} />
        ) : disputes.length === 0 ? (
          <p className="py-4 text-center text-xs text-(--tm)">No disputes.</p>
        ) : (
          disputes.map((dispute) => (
            <DisputeItem
              key={dispute._id}
              groupId={groupId}
              dispute={dispute}
              canManage={canManage}
              onChanged={load}
            />
          ))
        )}
      </div>
    </Card>
  );
}
