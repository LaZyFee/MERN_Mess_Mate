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
      <div className={["[min-height:100dvh]", "[background:var(--bg)]"].filter(Boolean).join(" ")}>
        {/* Sticky header */}
        <div
          className={["[background:var(--bgs)]", "[border-bottom:1px_solid_var(--bd)]", "[padding:var(--space-3)_var(--space-4)]", "[display:flex]", "[align-items:center]", "[gap:var(--space-3)]", "[position:sticky]", "[top:0px]", "z-30"].filter(Boolean).join(" ")}
        >
          <button
            onClick={() => router.push("/")}
            className={["[background:none]", "[border:none]", "[cursor:pointer]", "[color:var(--tm)]", "[display:flex]", "[align-items:center]", "[padding:0px]", "[min-height:44px]", "[min-width:44px]", "[justify-content:center]"].filter(Boolean).join(" ")}
            aria-label="Back to home"
          >
            <LuArrowLeft size={20} />
          </button>
          <div className={["flex-1", "[min-width:0px]"].filter(Boolean).join(" ")}>
            <h1
              className={["font-extrabold", "[font-size:1.0625rem]", "[color:var(--tp)]", "[white-space:nowrap]", "[overflow:hidden]", "[text-overflow:ellipsis]"].filter(Boolean).join(" ")}
            >
              {group?.name || "Group"}
            </h1>
          </div>
        </div>

        {/* Tab nav — horizontally scrollable, no horizontal page scroll */}
        <div
          className={["[background:var(--bgs)]", "[border-bottom:1px_solid_var(--bd)]", "[overflow-x:auto]", "[display:flex]", "[-webkit-overflow-scrolling:touch]", "[scrollbar-width:none]"].filter(Boolean).join(" ")}
        >
          {TABS.map(({ key, label, icon: Icon, path }) => {
            const href = base + path;
            const isActive = activeTab === key;
            return (
              <a
                key={key}
                href={href}
                className={["[display:flex]", "[flex-direction:column]", "[align-items:center]", "[gap:2px]", "[padding:var(--space-3)]", "[white-space:nowrap]", "[font-size:0.75rem]", (isActive) ? "font-bold" : "font-medium", (isActive) ? "[color:var(--p)]" : "[color:var(--tm)]", (isActive) ? "[border-bottom:2px_solid_var(--p)]" : "[border-bottom:2px_solid_transparent]", "[text-decoration:none]", "[transition:var(--transition)]", "[min-width:60px]", "[min-height:48px]", "[justify-content:center]"].filter(Boolean).join(" ")}
              >
                <Icon size={18} />
                <span className={["flex-1"].filter(Boolean).join(" ")}>{label}</span>
              </a>
            );
          })}
        </div>

        {/* Page content */}
        <div className={["[padding:var(--space-4)]", "[max-width:1100px]", "[margin:0_auto]"].filter(Boolean).join(" ")}>
          {children}
        </div>
      </div>
    </GroupContext.Provider>
  );
}
