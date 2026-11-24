"use client";

/**
 * Layer 3 — CSR Shell for group routes.
 * Receives initialGroup from SSR layout; owns GroupContext + tab nav.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LuLayoutDashboard,
  LuUtensils,
  LuReceipt,
  LuBanknote,
  LuFileText,
  LuBarChart2,
  LuUsers,
  LuMoreHorizontal,
  LuArrowLeft,
} from "react-icons/lu";
import { useGroupStore } from "@/lib/store/groupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { groupsApi } from "@/lib/api/groups";

export const GroupContext = createContext(null);
export const useGroup = () => useContext(GroupContext);

const TABS = [
  { key: "overview", label: "Overview", icon: LuLayoutDashboard, path: "" },
  { key: "meals", label: "Meals", icon: LuUtensils, path: "/meals" },
  { key: "expenses", label: "Expenses", icon: LuReceipt, path: "/expenses" },
  { key: "money", label: "Money", icon: LuBanknote, path: "/money" },
  { key: "statements", label: "Statements", icon: LuFileText, path: "/statements" },
  { key: "charts", label: "Charts", icon: LuBarChart2, path: "/charts" },
  { key: "members", label: "Members", icon: LuUsers, path: "/members" },
  { key: "more", label: "More", icon: LuMoreHorizontal, path: "/more" },
];

export default function GroupShell({ initialGroup, groupId, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const setGroup = useGroupStore((s) => s.setGroup);
  const user = useAuthStore((s) => s.user);

  // Seed from server — no useEffect re-fetch
  const [group, setGroupLocal] = useState(initialGroup);

  // Sync to zustand for cross-component role checks
  useEffect(() => {
    if (group) {
      const myMembership = group.memberships?.find(
        (m) => m.userId === user?._id || m.userId?._id === user?._id
      );
      setGroup({ ...group, myRole: myMembership?.role || group.myRole });
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
  const activeTab =
    TABS.find((t) => {
      const full = base + t.path;
      return t.path === "" ? pathname === full : pathname.startsWith(full);
    })?.key || "overview";

  return (
    <GroupContext.Provider value={{ group, groupId, reload }}>
      <div className="[min-height:100dvh] [background:var(--bg)]">
        {/* Sticky header */}
        <div
          className="[background:var(--bgs)] [border-bottom:1px_solid_var(--bd)] [padding:var(--space-3)_var(--space-4)] flex items-center gap-3 [position:sticky] top-0 z-30"
        >
          <button
            onClick={() => router.push("/")}
            className="bg-none border-0 cursor-pointer [color:var(--tm)] flex items-center p-0 [min-height:44px] [min-width:44px] justify-center"
            aria-label="Back to home"
          >
            <LuArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1
              className="font-extrabold [font-size:1.0625rem] [color:var(--tp)] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]"
            >
              {group?.name || "Group"}
            </h1>
          </div>
        </div>

        {/* Tab nav — horizontally scrollable, no horizontal page scroll */}
        <div
          className="[background:var(--bgs)] [border-bottom:1px_solid_var(--bd)] [overflow-x:auto] flex [-webkit-overflow-scrolling:touch] [scrollbar-width:none]"
        >
          {TABS.map(({ key, label, icon: Icon, path }) => {
            const href = base + path;
            const isActive = activeTab === key;
            return (
              <a
                key={key}
                href={href}
                className={`flex flex-col items-center gap-0.5 p-3 whitespace-nowrap text-xs ${isActive ? "font-bold" : "font-medium"} ${isActive ? "[color:var(--p)]" : "[color:var(--tm)]"} ${isActive ? "[border-bottom:2px_solid_var(--p)]" : "[border-bottom:2px_solid_transparent]"} [text-decoration:none] [transition:var(--transition)] [min-width:60px] [min-height:48px] justify-center`}
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
              </a>
            );
          })}
        </div>

        {/* Page content */}
        <div className="p-4 [max-width:1100px] mx-auto">
          {children}
        </div>
      </div>
    </GroupContext.Provider>
  );
}
