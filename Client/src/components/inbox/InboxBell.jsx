"use client";

/**
 * P11.1 — Inbox bell with unread badge, bottom-sheet list on mobile and a
 * dropdown on desktop. The scope (user or admin) is decided by the server.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LuBell, LuCheckCheck, LuInbox } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { inboxApi } from "@/lib/api/platform";
import { onRealtime } from "@/components/realtime/RealtimeProvider";

const KIND_LINKS = {
  support_ticket: (id) => `/support/tickets/${id}`,
  ticket: (id) => `/support/tickets/${id}`,
  group: (id) => `/groups/${id}`,
  expense: (id, groupId) => (groupId ? `/groups/${groupId}/expenses` : "/"),
  money: (id, groupId) => (groupId ? `/groups/${groupId}/money` : "/"),
  statement: (id, groupId) => (groupId ? `/groups/${groupId}/statements` : "/"),
  note: (id, groupId) => (groupId ? `/groups/${groupId}/board` : "/"),
};

function linkFor(item) {
  const kind = item.link?.kind;
  const id = item.link?.id;
  const resolver = kind ? KIND_LINKS[kind] : null;
  if (resolver && id) return resolver(id, item.groupId);
  return "/inbox";
}

function timeAgo(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function InboxBell() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const panelRef = useRef(null);

  const loadCount = useCallback(async () => {
    try {
      const data = await inboxApi.unreadCount();
      setCount(data?.count ?? 0);
    } catch {
      /* badge is cosmetic — ignore failures */
    }
  }, []);

  const loadList = useCallback(async (nextCursor = null) => {
    setLoading(true);
    try {
      const data = await inboxApi.list({ cursor: nextCursor, limit: 15 });
      const rows = data?.notifications || [];
      setItems((prev) => (nextCursor ? [...prev, ...rows] : rows));
      setCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load inbox", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCount();
    return onRealtime((event) => {
      if (event === "inbox-new") {
        loadCount();
        if (open) loadList();
      }
    });
  }, [loadCount, loadList, open]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markAll = async () => {
    try {
      await inboxApi.markRead({ all: true });
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setCount(0);
      showToast({ status: "success", title: "All marked read" });
    } catch (ex) {
      showToast({ status: "error", title: "Could not update inbox", description: ex?.data?.msg || ex?.message });
    }
  };

  const markOne = async (item) => {
    if (item.readAt) return;
    try {
      await inboxApi.markRead({ ids: [item._id] });
      setItems((prev) => prev.map((row) => (row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row)));
      setCount((c) => Math.max(0, c - 1));
    } catch {
      /* keep unread on failure */
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="md"
        isRound
        ariaLabel="Open notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <LuBell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-(--danger) px-1 text-[10px] font-bold leading-4 text-(--bgs)">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-(--p4)/40 md:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border border-(--bd) bg-(--bgs) shadow-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-12 md:w-96 md:rounded-xl md:max-h-[70dvh]">
            <div className="flex items-center justify-between gap-2 border-b border-(--bd) px-4 py-3">
              <h2 className="text-sm font-bold text-(--tp)">Notifications</h2>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" leftIcon={<LuCheckCheck size={14} />} onClick={markAll} isDisabled={count === 0}>
                  Read all
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {loading && items.length === 0 ? (
                <div className="space-y-2 p-2">
                  <Skeleton variant="rect" height={56} />
                  <Skeleton variant="rect" height={56} />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <LuInbox size={24} className="text-(--tl)" />
                  <p className="text-xs text-(--tm)">You&apos;re all caught up.</p>
                </div>
              ) : (
                <ul className="list-none space-y-1">
                  {items.map((item) => (
                    <li key={item._id}>
                      <Link
                        href={linkFor(item)}
                        onClick={() => {
                          markOne(item);
                          setOpen(false);
                        }}
                        className={`flex min-h-11 items-start gap-2 rounded-lg px-2 py-2 no-underline transition-[var(--transition)] hover:bg-(--bgm) ${item.readAt ? "" : "bg-(--pale)"
                          }`}
                      >
                        <span
                          className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? "bg-(--bd2)" : "bg-(--p)"
                            }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-xs ${item.readAt ? "font-medium" : "font-bold"} text-(--tp)`}>
                            {item.title}
                          </span>
                          {item.body && <span className="block truncate text-[11px] text-(--tm)">{item.body}</span>}
                        </span>
                        <span className="shrink-0 text-[10px] text-(--tl)">{timeAgo(item.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {hasMore && (
                <div className="p-2">
                  <Button size="sm" variant="outline" isFullWidth isLoading={loading} onClick={() => loadList(cursor)}>
                    Load more
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-(--bd) px-4 py-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
              <Link href="/inbox" onClick={() => setOpen(false)} className="block min-h-11 py-3 text-center text-xs font-bold text-(--p) no-underline">
                Open inbox
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
