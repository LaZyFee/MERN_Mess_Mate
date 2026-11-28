"use client";

/**
 * Notification outbox — queued / sent / failed messages, resend and manual share.
 * Mobile-first: status chips + one action row per message.
 */
import { useCallback, useEffect, useState } from "react";
import { LuExternalLink, LuRefreshCw, LuSend, LuMegaphone } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { notificationsApi } from "@/lib/api/notifications";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, SectionCard } from "../GroupUI";

const STATE_OPTIONS = [
  { value: "", label: "All states" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "not_configured", label: "Not configured" },
];

export default function NotificationsPanel({ groupId }) {
  const t = useT();
  const { showToast } = useToast();
  const [state, setState] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [links, setLinks] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.outbox(groupId, { state });
      setMessages(data?.messages || []);
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("more.notifications"), description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, state, showToast, t]);

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await notificationsApi.outbox(groupId, { state, cursor: moreCursor });
      const next = data?.messages || [];
      setMessages((current) => {
        const seen = new Set(current.map((m) => m._id));
        return [...current, ...next.filter((m) => !seen.has(m._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("more.notifications"), description: ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

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
      showToast({ status: "success", title: t("more.share") });
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const resend = async (messageId) => {
    setBusy(messageId);
    try {
      await notificationsApi.resend(groupId, messageId);
      showToast({ status: "success", title: t("more.sendInvite") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard
      icon={LuMegaphone}
      title={t("more.notifications")}
      subtitle={`${messages.length}`}
      actions={
        <>
          <Button size="sm" variant="outline" className="rounded-full" leftIcon={<LuSend size={13} />} isLoading={busy === "share"} onClick={share}>
            {t("more.share")}
          </Button>
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        </>
      }
      bodyClassName="space-y-2"
    >
      <Select size="md" options={STATE_OPTIONS} value={state} onChange={(event) => setState(event.target.value)} />

      {loading && messages.length === 0 ? (
        <Skeleton variant="rect" height={64} className="rounded-xl" />
      ) : messages.length === 0 ? (
        <EmptyState icon={LuMegaphone} title={t("shell.noResults")} body={t("more.notifications")} />
      ) : (
        <>
          {messages.map((message) => (
            <div key={message._id} className="rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge type="outbox" status={message.state} />
                <span className="truncate text-[11px] font-semibold text-(--ts)">{message.channel}</span>
                <span className="truncate text-[10.5px] text-(--tm)">{message.purpose}</span>
              </div>
              <p className="mt-1 truncate text-[10.5px] text-(--tm)">
                {message.createdAt ? formatDay(String(message.createdAt).slice(0, 10)) : ""}
                {message.attempts ? ` · ${message.attempts}×` : ""}
                {message.lastError ? ` · ${message.lastError}` : ""}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {["failed", "pending", "not_configured"].includes(message.state) && (
                  <Button
                    size="sm"
                    className="rounded-lg"
                    variant="outline"
                    isLoading={busy === message._id}
                    isDisabled={Boolean(busy)}
                    onClick={() => resend(message._id)}
                  >
                    {t("more.sendInvite")}
                  </Button>
                )}
                {links[message._id] && (
                  <a
                    href={links[message._id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-(--p) no-underline hover:bg-(--pale)"
                  >
                    <LuExternalLink size={13} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
          {!loading && moreCursor && (
            <Button variant="outline" size="md" isFullWidth className="rounded-xl" isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
              {t("shell.loadMore")}
            </Button>
          )}
        </>
      )}
    </SectionCard>
  );
}
