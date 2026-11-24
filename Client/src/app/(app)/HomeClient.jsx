"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LuUsers,
  LuPlus,
  LuLogIn,
  LuArrowRight,
  LuUtensilsCrossed,
  LuRefreshCw,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import Badge from "@/components/shared/Badge";
import Avatar from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";

function GroupCard({ group, onClick }) {
  const memberCount = group.memberCount || group.members?.length || 0;
  return (
    <button
      onClick={onClick}
      
      className="hover:border-[var(--p)] hover:shadow-[var(--shadow-lg)] [display:flex] [flex-direction:column] [gap:var(--space-3)] [padding:var(--space-5)] [background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-lg)] [box-shadow:var(--shadow-md)] [text-align:left] [width:100%] [cursor:pointer] [transition:var(--transition)]"
    >
      <div className={["[display:flex]", "[align-items:flex-start]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
        <Avatar name={group.name} size="lg" isSquare />
        <div className={["flex-1", "[min-width:0px]"].filter(Boolean).join(" ")}>
          <div
            className={["font-bold", "[font-size:1rem]", "[color:var(--tp)]", "[white-space:nowrap]", "[overflow:hidden]", "[text-overflow:ellipsis]"].filter(Boolean).join(" ")}
          >
            {group.name}
          </div>
          <div
            className={["[display:flex]", "[align-items:center]", "[gap:var(--space-2)]", "[margin-top:var(--space-1)]", "[flex-wrap:wrap]"].filter(Boolean).join(" ")}
          >
            <span className={["[font-size:0.8125rem]", "[color:var(--tm)]"].filter(Boolean).join(" ")}>
              <LuUsers size={13} className={["[display:inline]", "[margin-right:3px]"].filter(Boolean).join(" ")} />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
            {group.myRole && (
              <Badge colorScheme="primary" size="sm" isRounded>
                {group.myRole}
              </Badge>
            )}
          </div>
        </div>
        <LuArrowRight size={18} className={["[color:var(--tl)]", "shrink-0"].filter(Boolean).join(" ")} />
      </div>
    </button>
  );
}

function EmptyState({ onCreate, onJoin }) {
  return (
    <div
      className={["[text-align:center]", "[padding:var(--space-8)_var(--space-4)]", "[display:flex]", "[flex-direction:column]", "[align-items:center]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}
    >
      <LuUtensilsCrossed size={56} className={["[color:var(--tl)]"].filter(Boolean).join(" ")} />
      <div>
        <p className={["font-bold", "[font-size:1.125rem]", "[color:var(--tp)]"].filter(Boolean).join(" ")}>No groups yet</p>
        <p className={["[color:var(--tm)]", "[font-size:0.875rem]", "[margin-top:var(--space-1)]"].filter(Boolean).join(" ")}>
          Create a mess group or join one with an invite code.
        </p>
      </div>
      <div
        className={["[display:flex]", "[gap:var(--space-3)]", "[flex-wrap:wrap]", "[justify-content:center]"].filter(Boolean).join(" ")}
      >
        <Button leftIcon={<LuPlus size={16} />} onClick={onCreate}>
          Create Group
        </Button>
        <Button variant="outline" leftIcon={<LuLogIn size={16} />} onClick={onJoin}>
          Join with Code
        </Button>
      </div>
    </div>
  );
}

/**
 * Layer 3 — CSR Component.
 * Receives initialGroups from SSR page; uses browserApi for refresh.
 */
export default function HomeClient({ initialGroups }) {
  const router = useRouter();
  const { showToast } = useToast();

  // Seed from server — no useEffect re-fetch on mount
  const [groups, setGroups] = useState(initialGroups ?? []);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await groupsApi.myGroups();
      setGroups(data?.groups || data || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not refresh groups", description: ex?.message });
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  return (
    <div>
      {/* Header row */}
      <div
        className={["[display:flex]", "[align-items:center]", "[justify-content:space-between]", "[margin-bottom:var(--space-5)]", "[flex-wrap:wrap]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}
      >
        <h2 className={["[font-size:1.125rem]", "font-extrabold", "[color:var(--tp)]"].filter(Boolean).join(" ")}>My Groups</h2>
        <div className={["[display:flex]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
          <Button size="sm" variant="ghost" leftIcon={<LuRefreshCw size={15} />} onClick={refresh} isLoading={refreshing}>
            Refresh
          </Button>
          <Button size="sm" leftIcon={<LuPlus size={15} />} onClick={() => router.push("/groups/create")}>
            Create
          </Button>
          <Button size="sm" variant="outline" leftIcon={<LuLogIn size={15} />} onClick={() => router.push("/join")}>
            Join
          </Button>
        </div>
      </div>

      {refreshing ? (
        <div
          className={["[display:grid]", "[gap:var(--space-4)]", "[grid-template-columns:repeat(auto-fill,_minmax(280px,_1fr))]"].filter(Boolean).join(" ")}
        >
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rect" height={100} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          onCreate={() => router.push("/groups/create")}
          onJoin={() => router.push("/join")}
        />
      ) : (
        <div
          className={["[display:grid]", "[gap:var(--space-4)]", "[grid-template-columns:repeat(auto-fill,_minmax(280px,_1fr))]"].filter(Boolean).join(" ")}
        >
          {groups.map((g) => (
            <GroupCard
              key={g._id}
              group={g}
              onClick={() => router.push(`/groups/${g._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
