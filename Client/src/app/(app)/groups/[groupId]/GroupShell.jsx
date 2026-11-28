"use client";

/**
 * Layer 3 — CSR Shell for group routes.
 * Receives initialGroup from SSR layout; owns GroupContext + tab nav.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  LuLayoutDashboard,
  LuUtensils,
  LuReceipt,
  LuBanknote,
  LuFileText,
  LuCalendarCheck,
  LuUsers,
  LuMenu,
  LuHistory,
} from "react-icons/lu";
import PageHeader from "@/components/shared/PageHeader";
import { useGroupStore } from "@/lib/store/groupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { groupsApi } from "@/lib/api/groups";
import { useLang } from "@/lib/i18n/LangProvider";

export const GroupContext = createContext(null);
export const useGroup = () => useContext(GroupContext);

const TABS = [
  { key: "overview", label: "Overview", icon: LuLayoutDashboard, path: "" },
  { key: "meals", label: "Meals", icon: LuUtensils, path: "/meals" },
  { key: "expenses", label: "Expenses", icon: LuReceipt, path: "/expenses" },
  { key: "money", label: "Money", icon: LuBanknote, path: "/money" },
  { key: "statements", label: "Statements", icon: LuFileText, path: "/statements" },
  { key: "board", label: "Board", icon: LuCalendarCheck, path: "/board" },
  { key: "charts", label: "Charts", icon: LuLayoutDashboard, path: "/charts" },
  { key: "members", label: "Members", icon: LuUsers, path: "/members" },
  { key: "activity", label: "Activity", icon: LuHistory, path: "/activity" },
  { key: "more", label: "More", icon: LuMenu, path: "/more" },
];

/** Translate a tab label, falling back to the English literal. */
function tabLabel(t, key, fallback) {
  const translated = t(`group.tab.${key}`);
  return translated === `group.tab.${key}` ? fallback : translated;
}

export default function GroupShell({ initialGroup, groupId, children }) {
  const { t } = useLang();
  const pathname = usePathname();
  const setGroup = useGroupStore((s) => s.setGroup);
  const myRole = useGroupStore((s) => s.myRole);
  const user = useAuthStore((s) => s.user);

  // Seed from server — no useEffect re-fetch
  const [group, setGroupLocal] = useState(initialGroup);

  useEffect(() => { setGroupLocal(initialGroup); }, [initialGroup]);

  // Sync to zustand for cross-component role checks
  useEffect(() => {
    if (group) {
      const myId = user?._id;
      const mine = (group.memberships || []).find((m) => {
        const memberId = m.userId?._id || m.userId;
        return myId && memberId && String(memberId) === String(myId);
      });
      setGroup({
        ...group,
        myMembership: mine || null,
        myRole: mine?.role || group.myRole || (group.admin && myId && String(group.admin) === String(myId) ? "owner" : null),
      });
    }
  }, [group, user, setGroup]);

  // Manual refresh via browserApi
  const reload = useCallback(async () => {
    try {
      const data = await groupsApi.getGroup(groupId);
      const g = data?.group || data;
      setGroupLocal(g);
    } catch { /* ignore — SSR already validated access */ }
  }, [groupId]);

  const base = `/groups/${groupId}`;
  const normalized = pathname?.replace(/\/$/, "") || "";
  const activeTab =
    TABS.find((t) => {
      const full = base + t.path;
      return t.path === "" ? normalized === full : normalized.startsWith(full);
    })?.key || "overview";

  return (
    <GroupContext.Provider value={{ group, groupId, reload }}>
      <div className="min-h-[100dvh] bg-(--bg) overflow-x-hidden">
        {/* Page header — branded card, mobile-first */}
        <PageHeader
          as="div"
          className="mb-4 sm:mb-6"
          backHref="/dashboard"
          backLabel={t("shell.backHome")}
          title={group?.name || t("shell.groups")}
          actions={
            <>
              {myRole && (
                <span className="shrink-0 rounded-full bg-(--brand-fg)/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-(--brand-on) ring-1 ring-(--brand-on)/20">
                  {t(`grp.role.${myRole}`)}
                </span>
              )}
            </>
          }
        />

        {/* Tab nav — sticky on scroll, horizontally scrollable on mobile */}
        <nav
          aria-label={t("shell.primaryNav")}
          className="sticky top-0 z-10 [background:var(--bgs)] border-b border-(--bd) overflow-x-auto flex [-webkit-overflow-scrolling:touch] [scrollbar-width:none] pb-1 sm:pb-2"
        >
          <div className="flex min-w-full gap-0.5 px-3 sm:px-6">
            {TABS.map(({ key, label, icon: Icon, path }) => {
              const href = base + path;
              const isActive = activeTab === key;
              return (
                <a
                  key={key}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2.5 sm:px-5 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium ${isActive ? "text-(--p)" : "text-(--tm)"} ${isActive ? "border-b-2 border-b-(--p)" : "border-b-2 border-b-transparent"} [text-decoration:none] [transition:var(--transition)] [min-height:44px] justify-center`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{tabLabel(t, key, label)}</span>
                </a>
              );
            })}
          </div>
        </nav>

        {/* Page content */}
        <div className="mx-auto min-w-0 max-w-6xl p-3 sm:p-6 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </GroupContext.Provider>
  );
}
