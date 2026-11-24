"use client";

import { useCallback, useEffect, useState } from "react";
import { LuExternalLink, LuRefreshCw, LuSend } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { notificationsApi } from "@/lib/api/notifications";
import { formatDay } from "@/lib/utils/format";

const STATE_OPTIONS = [
  { value: "", label: "All states" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "not_configured", label: "Not configured" },
];

export default function NotificationsPanel({ groupId }) {
  const { showToast } = useToast();
  const [state, setState] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.outbox(groupId, { state });
      setMessages(data?.messages || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load outbox", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, state, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const share = async () => {
    setBusy("share");
    try {
      const data = await notificationsApi.manualShare(groupId);
      const map = {};
      (data?.links || []).forEach((entry) => {
        if (entry.link) map[entry.messageId] = entry.link;
      });
      setLinks(map);
      showToast({ status: "success", title: "Manual share links ready" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not build links", description: ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const resend = async (messageId) => {
    setBusy(messageId);
    try {
      await notificationsApi.resend(groupId, messageId);
      showToast({ status: "success", title: "Resend queued" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Resend failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-(--tp)">Notification outbox</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" leftIcon={<LuSend size={13} />} isLoading={busy === "share"} onClick={share}>
              Share links
            </Button>
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
          </div>
        </div>
      }
    >
      <Select size="sm" options={STATE_OPTIONS} value={state} onChange={(event) => setState(event.target.value)} />

      <div className="mt-3 space-y-2">
        {loading && messages.length === 0 ? (
          <Skeleton variant="rect" height={64} />
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-(--tm)">No notifications queued.</p>
        ) : (
          messages.map((message) => (
            <div key={message._id} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge type="outbox" status={message.state} />
                <span className="text-xs font-semibold text-(--ts)">{message.channel}</span>
                <span className="text-[11px] text-(--tm)">{message.purpose}</span>
              </div>
              <p className="mt-1 text-[11px] text-(--tl)">
                {message.createdAt ? formatDay(String(message.createdAt).slice(0, 10)) : ""}
                {message.attempts ? ` · ${message.attempts} attempt(s)` : ""}
                {message.lastError ? ` · ${message.lastError}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["failed", "pending", "not_configured"].includes(message.state) && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={busy === message._id}
                    isDisabled={Boolean(busy)}
                    onClick={() => resend(message._id)}
                  >
                    Resend
                  </Button>
                )}
                {links[message._id] && (
                  <a
                    href={links[message._id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-(--p) hover:bg-(--pale)"
                  >
                    <LuExternalLink size={13} /> Open in WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
