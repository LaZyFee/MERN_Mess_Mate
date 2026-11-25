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
import Alert from "@/components/shared/Alert";
import { groupsApi } from "@/lib/api/groups";
import { useGroupStore } from "@/lib/store/groupStore";

function GroupCard({ group, onClick }) {
  const memberCount = group.memberCount || group.members?.length || 0;
  return (
    <button
      onClick={onClick}
      
      className="hover:border-[var(--p)] hover:shadow-[var(--shadow-lg)] flex flex-col gap-3 [padding:var(--space-5)] [background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-lg)] [box-shadow:var(--shadow-md)] text-left w-full cursor-pointer [transition:var(--transition)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={group.name} size="lg" isSquare />
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-base [color:var(--tp)] whitespace-nowrap [overflow:hidden] [text-overflow:ellipsis]"
          >
            {group.name}
          </div>
          <div
            className="flex items-center gap-2 mt-1 flex-wrap"
          >
            <span className="[font-size:0.8125rem] [color:var(--tm)]">
              <LuUsers size={13} className="inline [margin-right:3px]" />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
            {group.myRole && (
              <Badge colorScheme="primary" size="sm" isRounded>
                {group.myRole}
              </Badge>
            )}
          </div>
        </div>
        <LuArrowRight size={18} className="[color:var(--tl)] shrink-0" />
      </div>
    </button>
  );
}

function EmptyState({ onCreate, onJoin }) {
  return (
    <div
      className="text-center [padding:var(--space-8)_var(--space-4)] flex flex-col items-center gap-4"
    >
      <LuUtensilsCrossed size={56} className="[color:var(--tl)]" />
      <div>
        <p className="font-bold text-lg [color:var(--tp)]">No groups yet</p>
        <p className="[color:var(--tm)] text-sm mt-1">
          Create a mess group or join one with an invite code.
        </p>
      </div>
      <div
        className="flex gap-3 flex-wrap justify-center"
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
 * Layer 3 â€” CSR Component.
 * Receives initialGroups from SSR page; uses browserApi for refresh.
 */
export default function HomeClient({ initialGroups }) {
  const router = useRouter();
  const { showToast } = useToast();

  // Seed from server â€” no useEffect re-fetch on mount
  const [groups, setGroups] = useState(initialGroups ?? []);
  const [refreshing, setRefreshing] = useState(false);
  // Ex-member notice: set by the leave flow; cleared once acknowledged.
  const leftNotice = useGroupStore((s) => s.leftNotice);
  const setLeftNotice = useGroupStore((s) => s.setLeftNotice);

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
      {leftNotice?.message && (
        <div className="mb-4">
          <Alert status="info" title="History is clamped to your membership window" isDismissible onDismiss={() => setLeftNotice(null)}>
            {leftNotice.message}
          </Alert>
        </div>
      )}

      {/* Header row */}
      <div
        className="flex items-center justify-between mb-5 flex-wrap gap-3"
      >
        <h2 className="text-lg font-extrabold [color:var(--tp)]">My Groups</h2>
        <div className="flex gap-2">
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
          className="grid gap-4 [grid-template-columns:repeat(auto-fill,_minmax(280px,_1fr))]"
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
          className="grid gap-4 [grid-template-columns:repeat(auto-fill,_minmax(280px,_1fr))]"
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

