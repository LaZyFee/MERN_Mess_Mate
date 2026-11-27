"use client";

/**
 * P11.2 — Inbox page. Cursor list with unread filter, mark read / all and
 * deep links resolved from `link.kind` / `link.id`.
 */
import { useCallback, useState } from "react";
import Link from "next/link";
import { LuCheckCheck, LuInbox, LuMailOpen, LuRefreshCw, LuBell } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { inboxApi } from "@/lib/api/platform";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const FILTER_VALUES = ["", "unread"];

const LINK_TARGETS = {
  support_ticket: (id) => `/support/tickets/${id}`,
  ticket: (id) => `/support/tickets/${id}`,
  group: (id) => `/groups/${id}`,
  statement: (id, g) => (g ? `/groups/${g}/statements` : "/"),
  expense: (id, g) => (g ? `/groups/${g}/expenses` : "/"),
  money_transaction: (id, g) => (g ? `/groups/${g}/money` : "/"),
  note: (id, g) => (g ? `/groups/${g}/board` : "/"),
};

function hrefFor(item) {
  const kind = item?.link?.kind;
  const id = item?.link?.id;
  const build = kind ? LINK_TARGETS[kind] : null;
  return build && id ? build(id, item.groupId) : null;
}

function dayOf(value, lang) {
  if (!value) return "";
  return formatDay(String(value).slice(0, 10), lang);
}

export default function InboxClient({ initialNotifications = [], initialNextCursor = null, initialHasMore = false }) {
  const t = useT();
  const { lang, n } = useMoney();
  const { showToast } = useToast();
  const [items, setItems] = useState(initialNotifications || []);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (unread, nextCursor = null) => {
    setLoading(true);
    try {
      const data = await inboxApi.list({ unread: unread === "unread", cursor: nextCursor, limit: 20 });
      const rows = data?.notifications || [];
      setItems((prev) => (nextCursor ? [...prev, ...rows] : rows));
      setCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (ex) {
      showToast({ status: "error", title: t("inbox.couldNotLoad"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  const applyFilter = (value) => {
    setFilter(value);
    load(value);
  };

  const markAll = async () => {
    try {
      await inboxApi.markRead({ all: true });
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      showToast({ status: "success", title: t("inbox.cleared") });
    } catch (ex) {
      showToast({ status: "error", title: t("inbox.couldNotMarkRead"), description: ex?.data?.msg || ex?.message });
    }
  };

  const markOne = async (item) => {
    if (item.readAt) return;
    try {
      await inboxApi.markRead({ ids: [item._id] });
      setItems((prev) => prev.map((row) => (row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row)));
    } catch {
      /* silent — the row stays unread */
    }
  };

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-9">
      <div className="rounded-3xl bg-(--brand-bg) p-5 text-(--brand-fg) sm:p-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-(--brand-on)"><LuBell size={17} />MealMate inbox</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("inbox.title")}</h1>
          <p className="mt-2 text-sm text-(--brand-mute)">{t("inbox.summary", { unread: n(unread), loaded: n(items.length) })}</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={() => load(filter)}>
            <LuRefreshCw size={15} />
          </Button>
          <Button size="sm" variant="outline" leftIcon={<LuCheckCheck size={14} />} onClick={markAll} isDisabled={unread === 0}>
            {t("inbox.markAllRead")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 rounded-2xl border border-(--bd) bg-(--bgs) p-2">
        {FILTER_VALUES.map((value) => (
          <Button
            variant={filter === value ? "primary" : "outline"}
            size="md"
            type="button"
            key={value || "all"}
            onClick={() => applyFilter(value)}
            aria-pressed={filter === value}
            className="!h-11 !rounded-xl !px-4"
          >
            {value ? t("inbox.unreadFilter") : t("inbox.all")}
          </Button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          <Skeleton variant="rect" height={72} />
          <Skeleton variant="rect" height={72} />
          <Skeleton variant="rect" height={72} />
        </div>
      ) : items.length === 0 ? (
        <Card padding="lg" variant="outlined" className="text-center">
          <LuInbox size={26} className="mx-auto mb-2 text-(--tl)" />
          <p className="text-sm font-semibold text-(--tp)">{t("shell.noResults")}</p>
          <p className="mt-1 text-xs text-(--tm)">{t("inbox.emptyHint")}</p>
        </Card>
      ) : (
        <ul className="list-none space-y-3">
          {items.map((item) => {
            const href = hrefFor(item);
            const body = (
              <span className="flex min-w-0 flex-1 items-start gap-3">
                <span className={`mt-2 size-2 shrink-0 rounded-full ${item.readAt ? "bg-(--bd2)" : "bg-(--p)"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${item.readAt ? "font-medium" : "font-bold"} text-(--tp)`}>{item.title}</span>
                  {item.body && <span className="mt-0.5 block text-xs text-(--ts)">{item.body}</span>}
                  <span className="mt-1 block text-[11px] text-(--tl)">{dayOf(item.createdAt, lang)}</span>
                </span>
              </span>
            );

            return (
              <li key={item._id}>
                {href ? (
                  <Link
                    href={href}
                    onClick={() => markOne(item)}
                    className={`flex min-h-16 items-start justify-between gap-2 rounded-2xl border p-4 no-underline transition-[var(--transition)] hover:border-(--p) ${item.readAt ? "border-(--bd) bg-(--bgs)" : "border-(--p)/40 bg-(--pale)"
                      }`}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => markOne(item)}
                    className={`flex min-h-16 w-full items-start justify-between gap-2 rounded-2xl border p-4 text-left transition-[var(--transition)] hover:border-(--p) ${item.readAt ? "border-(--bd) bg-(--bgs)" : "border-(--p)/40 bg-(--pale)"
                      }`}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <Button variant="outline" isFullWidth isLoading={loading} leftIcon={<LuMailOpen size={14} />} onClick={() => load(filter, cursor)}>
          {t("shell.loadMore")}
        </Button>
      )}
    </div>
  );
}
