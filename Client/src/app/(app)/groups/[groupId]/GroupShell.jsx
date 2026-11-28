"use client";

/**
 * Layer 3 — CSR Shell for group routes.
 * Owns GroupContext + the group tab bar.
 *
 * Tabs are still real routes (deep-linkable, SSR data per tab) but navigation is
 * made to feel instant:
 *  - every tab <Link> is preloaded into the client router on mount and on hover,
 *    so a click swaps content without waiting for the network
 *  - the clicked tab shows a pending state immediately (useLinkStatus), and a
 *    thin progress line runs under the bar while the route streams in
 *  - a single sliding indicator marks the active tab (no per-tab pill restyle)
 *
 * Layout: sticky group header → modern tab bar (horizontal scroll on mobile,
 * centred on desktop) → capped page container.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LuUsers,
  LuUserPlus,
  LuChevronDown,
  LuHouse,
  LuLayoutDashboard,
  LuUtensils,
  LuReceipt,
  LuBanknote,
  LuFileText,
  LuCalendarCheck,
  LuChartLine,
  LuHistory,
  LuMenu,
} from "react-icons/lu";
import { useGroupStore } from "@/lib/store/groupStore";
import { useAuthStore, useUser } from "@/lib/store/authStore";
import { groupsApi } from "@/lib/api/groups";
import { useToast } from "@/components/shared/ToastProvider";
import { useLang } from "@/lib/i18n/LangProvider";

export const GroupContext = createContext(null);
export const useGroup = () => useContext(GroupContext);

/** Primary tabs always show icon + label. */
const PRIMARY_TABS = [
  { key: "overview", label: "Overview", path: "", icon: LuLayoutDashboard },
  { key: "meals", label: "Meals", path: "/meals", icon: LuUtensils },
  { key: "expenses", label: "Expenses", path: "/expenses", icon: LuReceipt },
  { key: "money", label: "Money", path: "/money", icon: LuBanknote },
  { key: "statements", label: "Statements", path: "/statements", icon: LuFileText },
];

/** Secondary tabs collapse behind "More" on phones. */
const SECONDARY_TABS = [
  { key: "board", label: "Board", path: "/board", icon: LuCalendarCheck },
  { key: "charts", label: "Charts", path: "/charts", icon: LuChartLine },
  { key: "activity", label: "Activity", path: "/activity", icon: LuHistory },
  { key: "more", label: "More", path: "/more", icon: LuMenu },
];

const ROLE_TONE = {
  owner: "bg-(--brand-on)/20 text-(--brand-on) ring-(--brand-on)/30",
  manager: "bg-(--brand-fg)/12 text-(--brand-fg) ring-(--brand-fg)/25",
  treasurer: "bg-(--brand-fg)/12 text-(--brand-fg) ring-(--brand-fg)/25",
  auditor: "bg-(--brand-fg)/10 text-(--brand-mute) ring-(--brand-fg)/15",
  member: "bg-(--brand-fg)/10 text-(--brand-mute) ring-(--brand-fg)/15",
};

const MANAGE_ROLES = ["owner", "manager"];

/** Translate a tab label, falling back to the English literal. */
function tabLabel(t, key, fallback) {
  const translated = t(`group.tab.${key}`);
  return translated === `group.tab.${key}` ? fallback : translated;
}

/**
 * Pending-aware tab.
 * `useLinkStatus` must live inside the <Link>, so the visual is a child.
 */
function TabContent({ label, pendingLabel }) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
      {pending && (
        <span
          aria-hidden="true"
          className="size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70"
        />
      )}
      <span>{pending ? pendingLabel : label}</span>
    </span>
  );
}

export default function GroupShell({ initialGroup, initialMemberships = [], groupId, children }) {
  const { t } = useLang();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const setGroup = useGroupStore((s) => s.setGroup);
  const user = useAuthStore((s) => s.user);
  const hydratedUser = useUser();
  const stripRef = useRef(null);
  const tabsRef = useRef(new Map());

  const [group, setGroupLocal] = useState(initialGroup);
  const [memberships, setMemberships] = useState(initialMemberships || []);
  const [navigating, setNavigating] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    setGroupLocal(initialGroup);
  }, [initialGroup]);

  useEffect(() => {
    setMemberships(initialMemberships || []);
  }, [initialMemberships]);

  // Resolve my role from membership intervals first (the source of truth used by
  // the permissions middleware), then fall back to legacy embedded members.
  const myMembership = useMemo(() => {
    const myId = user?._id || hydratedUser?._id;
    if (!myId) return null;
    return (
      (memberships || []).find((m) => {
        const memberUserId = m.userId?._id || m.userId;
        return memberUserId && String(memberUserId) === String(myId) && !m.leftAt;
      }) || null
    );
  }, [memberships, user, hydratedUser]);

  const resolvedRole = useMemo(() => {
    if (myMembership?.role) return myMembership.role;
    if (group?.myRole) return group.myRole;
    const myId = user?._id || hydratedUser?._id;
    if (group?.admin && myId && String(group.admin?._id || group.admin) === String(myId)) return "owner";
    const legacy = (group?.members || []).find(
      (m) => myId && String(m.user?._id || m.user) === String(myId),
    );
    return legacy?.role || null;
  }, [myMembership, group, user, hydratedUser]);

  const canManage = MANAGE_ROLES.includes(resolvedRole);

  // Refresh group + membership intervals together, so role changes made in the
  // Members tab are reflected in this shell without a full reload.
  const reload = useCallback(async () => {
    try {
      const [groupRes, membershipsRes] = await Promise.all([
        groupsApi.getGroup(groupId),
        groupsApi.getMemberships(groupId).catch(() => null),
      ]);
      const nextGroup = groupRes?.group || groupRes;
      if (nextGroup) setGroupLocal(nextGroup);
      const list = membershipsRes?.memberships || membershipsRes;
      if (Array.isArray(list)) setMemberships(list);
    } catch {
      /* SSR already validated access — a failed refresh is not fatal */
    }
  }, [groupId]);

  useEffect(() => {
    if (group) {
      setGroup({
        ...group,
        groupId: groupId || group._id,
        myMembership,
        myRole: resolvedRole || null,
      });
    }
  }, [group, myMembership, resolvedRole, setGroup, groupId]);

  const base = `/groups/${groupId}`;
  const normalized = pathname?.replace(/\/$/, "") || "";

  const allTabs = useMemo(() => [...PRIMARY_TABS, ...SECONDARY_TABS], []);
  const activeTab =
    allTabs.find((tab) => {
      const full = base + tab.path;
      if (tab.path === "") return normalized === full || normalized.startsWith(`${full}/policy`);
      return normalized === full || normalized.startsWith(`${full}/`);
    })?.key || "overview";

  const isSecondaryActive = SECONDARY_TABS.some((tab) => tab.key === activeTab) || activeTab === "members";

  // ── Instant-feel navigation ────────────────────────────────────────────────
  // Preload every tab into the client router once the shell is hydrated.
  useEffect(() => {
    if (!base) return;
    const id = window.setTimeout(() => {
      allTabs.forEach((tab) => {
        const href = base + tab.path;
        if (href !== normalized) router.prefetch(href);
      });
      router.prefetch(base);
    }, 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Progress hint for slow routes (only appears if the transition drags on).
  useEffect(() => {
    setNavigating(false); // route settled
  }, [pathname]);

  const prefetch = (href) => {
    if (href !== normalized) router.prefetch(href);
  };

  // Keep the active tab in view on mobile without scrolling the page.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const node = strip.querySelector('[data-active="true"]');
    if (!node) return;
    const target = node.offsetLeft - strip.clientWidth / 2 + node.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeTab, showSecondary]);

  // Member count from live membership intervals (falls back to the group doc).
  const memberCount = useMemo(() => {
    const active = (memberships || []).filter((m) => !m.leftAt && !m.endDate);
    if (active.length) return active.length;
    return (group?.memberships || []).filter((m) => !m.endDate && !m.leftAt).length || (group?.members || []).length;
  }, [memberships, group]);

  const copyGroupId = async () => {
    try {
      await navigator.clipboard?.writeText(groupId);
      showToast({ status: "success", title: t("grp.copiedId") });
    } catch {
      showToast({ status: "error", title: t("shell.error") });
    }
  };

  /** Shared tab element — rendered twice (primary rail + secondary grid). */
  const renderTab = ({ key, label, path, icon: Icon }, variant = "rail") => {
    const href = base + path;
    const isActive = activeTab === key;
    const translated = tabLabel(t, key, label);
    const common = {
      key,
      href,
      "data-active": isActive,
      "aria-current": isActive ? "page" : undefined,
      onMouseEnter: () => prefetch(href),
      onFocus: () => prefetch(href),
      onNavigate: () => setNavigating(true),
      scroll: false,
    };

    if (variant === "grid") {
      return (
        <Link
          {...common}
          className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold no-underline transition-colors ${
            isActive ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm)"
          }`}
        >
          {Icon && <Icon size={15} strokeWidth={isActive ? 2.3 : 1.8} className="shrink-0" />}
          <TabContent label={translated} pendingLabel={translated} />
        </Link>
      );
    }

    return (
      <Link
        {...common}
        ref={(node) => {
          if (node) tabsRef.current.set(key, node);
          else tabsRef.current.delete(key);
        }}
        className={`relative inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold no-underline transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/50 sm:px-3.5 sm:text-[13px] ${
          isActive
            ? "bg-(--p) text-(--bgs) shadow-[0_2px_10px_-2px_var(--p)]"
            : "text-(--tm) hover:bg-(--pale) hover:text-(--p)"
        }`}
      >
        {Icon && <Icon size={15} strokeWidth={isActive ? 2.3 : 1.8} className="shrink-0" />}
        <TabContent label={translated} pendingLabel={translated} />
      </Link>
    );
  };

  // Measure the active tab for the sliding indicator.
  const [indicator, setIndicator] = useState(null);
  useEffect(() => {
    const node = tabsRef.current.get(activeTab);
    if (!node) {
      setIndicator(null);
      return;
    }
    setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
  }, [activeTab, showSecondary, pathname]);

  return (
    <GroupContext.Provider value={{ group, groupId, memberships, reload, canManage, myRole: resolvedRole }}>
      <div className="min-h-[100dvh] min-w-0 bg-(--bg) pb-4">
        {/* ── Sticky group header ─────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-(--bd) bg-(--bgs)/95 backdrop-blur-xl supports-[backdrop-filter]:bg-(--bgs)/80">
          <div className="mx-auto flex min-w-0 max-w-6xl items-center gap-2 px-3 pt-2 sm:px-5 sm:pt-2.5">
            <Link
              href="/dashboard"
              aria-label={t("shell.backHome")}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p) no-underline transition-colors hover:bg-(--bgm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/50"
            >
              <LuHouse size={17} />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className="truncate text-[15px] font-extrabold tracking-tight text-(--tp) sm:text-base">
                  {group?.name || t("shell.groups")}
                </h1>
                {resolvedRole && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ring-1 ${ROLE_TONE[resolvedRole] || ROLE_TONE.member}`}
                  >
                    {t(`grp.role.${resolvedRole}`)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={copyGroupId}
                title={t("grp.copyId")}
                className="block max-w-full truncate text-left text-[11px] leading-tight text-(--tm) hover:text-(--p) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/40"
              >
                {t(memberCount === 1 ? "grp.members.singular" : "grp.members.plural", { count: memberCount })}
                <span className="mx-1 opacity-40">·</span>
                <span className="font-mono text-[10px]">{String(groupId).slice(-6)}</span>
              </button>
            </div>

            {/* Members entry point — always visible, invites for managers */}
            <div className="flex shrink-0 items-center gap-1">
              {canManage && (
                <Link
                  href={`${base}/members?invite=1`}
                  onMouseEnter={() => prefetch(`${base}/members`)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-(--p) px-3 text-[11.5px] font-bold text-(--bgs) no-underline shadow-sm shadow-(--p)/25 transition-transform active:scale-95"
                >
                  <LuUserPlus size={14} />
                  <span className="hidden xs:inline sm:inline">{t("shell.invite")}</span>
                </Link>
              )}
              <Link
                href={`${base}/members`}
                onMouseEnter={() => prefetch(`${base}/members`)}
                aria-label={t("members.title")}
                className={`grid size-10 place-items-center rounded-full no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)/50 ${!canManage ? "bg-(--pale) text-(--p) hover:bg-(--bgm)" : "text-(--ts) hover:bg-(--pale) hover:text-(--p)"
                  }`}
              >
                <LuUsers size={17} />
              </Link>
            </div>
          </div>

          {/* ── Tab bar ───────────────────────────────────────── */}
          <nav aria-label={t("shell.primaryNav")} className="relative mt-0.5">
            {/* Extra vertical padding so the active pill's glow is never clipped by
                the scroll container, and tabs start flush (no half-cut first pill). */}
            <div className="mx-auto flex max-w-6xl items-center px-2 pb-2 pt-0.5 sm:px-4">
              <div
                ref={stripRef}
                className="relative flex flex-1 snap-x snap-mandatory gap-0.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-center lg:overflow-visible"
              >
                {PRIMARY_TABS.map((tab) => renderTab(tab))}

                {/* Secondary tabs collapse behind a "More" trigger on mobile,
                    and inline on desktop */}
                <button
                  type="button"
                  onClick={() => setShowSecondary((v) => !v)}
                  aria-expanded={showSecondary}
                  aria-label={t("shell.more")}
                  className={`relative inline-flex min-h-10 shrink-0 snap-start items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold transition-colors lg:hidden ${isSecondaryActive
                    ? "bg-(--p) text-(--bgs) shadow-[0_2px_10px_-2px_var(--p)]"
                    : "text-(--tm) hover:bg-(--pale) hover:text-(--p)"
                    }`}
                >
                  <LuMenu size={14} className="shrink-0" />
                  {t("shell.more")}
                  <LuChevronDown size={13} className={`transition-transform ${showSecondary ? "rotate-180" : ""}`} />
                </button>

                <span className="hidden items-center gap-0.5 lg:flex">
                  {SECONDARY_TABS.map((tab) => renderTab(tab))}
                </span>

                {/* Sliding glow under the active tab — one shared element, not a
                    per-tab restyle. Hidden while the "More" trigger is active
                    because that one lives outside the measured tab map. */}
                {indicator && !isSecondaryActive && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-(--p)/50 transition-[left,width] duration-300 ease-[var(--expo)]"
                    style={{ left: indicator.left, width: indicator.width }}
                  />
                )}
              </div>
            </div>

            {/* Thin progress line — only visible under a slow transition */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-(--p) transition-opacity ${navigating ? "opacity-100 route-progress" : "opacity-0"
                }`}
            />
          </nav>

          {/* ── Secondary sheet (mobile) ──────────────────────── */}
          {showSecondary && (
            <div className="border-t border-(--bd)/70 bg-(--bgs) px-3 pb-2 lg:hidden">
              <div className="grid grid-cols-2 gap-1 pt-2">
                <Link
                  href={`${base}/members`}
                  prefetch
                  onNavigate={() => {
                    setShowSecondary(false);
                    setNavigating(true);
                  }}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold no-underline transition-colors ${activeTab === "members" ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm)"
                    }`}
                >
                  <LuUsers size={15} /> {t("members.title")}
                </Link>
                {SECONDARY_TABS.map((tab) => (
                  <Link
                    key={tab.key}
                    href={base + tab.path}
                    onMouseEnter={() => prefetch(base + tab.path)}
                    onNavigate={() => {
                      setShowSecondary(false);
                      setNavigating(true);
                    }}
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold no-underline transition-colors ${activeTab === tab.key ? "bg-(--pale) text-(--p)" : "text-(--ts) hover:bg-(--bgm)"
                      }`}
                  >
                    <TabContent label={tabLabel(t, tab.key, tab.label)} pendingLabel={tabLabel(t, tab.key, tab.label)} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* ── Page content ────────────────────────────────────── */}
        <div className="mx-auto min-w-0 max-w-6xl px-3 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-5 sm:pt-5 sm:pb-8">
          <div key={activeTab} className="page-enter min-w-0">
            {children}
          </div>
        </div>
      </div>
    </GroupContext.Provider>
  );
}
