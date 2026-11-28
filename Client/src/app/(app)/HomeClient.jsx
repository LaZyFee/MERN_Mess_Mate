"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LuUsers,
  LuPlus,
  LuLogIn,
  LuArrowRight,
  LuUtensilsCrossed,
  LuRefreshCw,
} from "react-icons/lu";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import Badge from "@/components/shared/Badge";
import Avatar from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";
import { useGroupStore } from "@/lib/store/groupStore";
import { useT } from "@/lib/i18n/LangProvider";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";

function GroupCard({ group, onClick }) {
  const t = useT();
  const memberCount = group.memberCount || group.members?.length || 0;
  return (
    <Button
      as="button"
      type="button"
      variant="outline"
      isFullWidth
      onClick={onClick}
      className="group !h-auto !min-h-24 !w-full !justify-start !whitespace-normal !rounded-2xl !border-(--bd) !bg-(--bgs) !p-4 !text-left !text-(--tp) shadow-sm hover:!border-(--p) hover:shadow-lg sm:!p-5"
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
              {t("grp.members", { count: memberCount })}
            </span>
            {group.myRole && (
              <Badge colorScheme="primary" size="sm" isRounded>
                {t(`grp.role.${group.myRole}`)}
              </Badge>
            )}
          </div>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--pale) text-(--p) transition-transform group-hover:translate-x-0.5">
          <LuArrowRight size={18} />
        </span>
      </div>
    </Button>
  );
}

function EmptyState({ onCreate, onJoin, t }) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-(--bd2) bg-(--bgs) px-4 py-10 text-center sm:py-14"
    >
      <LuUtensilsCrossed size={56} className="[color:var(--tl)]" />
      <div>
        <p className="font-bold text-lg [color:var(--tp)]">{t("home.empty")}</p>
        <p className="[color:var(--tm)] text-sm mt-1">
          {t("grp.emptyHint")}
        </p>
      </div>
      <div
        className="flex gap-3 flex-wrap justify-center"
      >
        <Button variant="primary" leftIcon={<LuPlus size={16} />} onClick={onCreate}>
          {t("home.create")}
        </Button>
        <Button variant="outline" leftIcon={<LuLogIn size={16} />} onClick={onJoin}>
          {t("home.join")}
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
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();

  // Seed from server â€” no useEffect re-fetch on mount
  const [groups, setGroups] = useState(initialGroups ?? []);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  // Ex-member notice: set by the leave flow; cleared once acknowledged.
  const leftNotice = useGroupStore((s) => s.leftNotice);
  const setLeftNotice = useGroupStore((s) => s.setLeftNotice);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await groupsApi.myGroups();
      setGroups(data?.groups || data || []);
    } catch (ex) {
      showToast({ status: "error", title: t("grp.couldNotRefresh"), description: ex?.message });
    } finally {
      setRefreshing(false);
    }
  }, [showToast, t]);

  // Ex-member notice: fire once when the user lands here after leaving a group,
  // then clear it so a re-render (or a different route) cannot re-toast it.
  useEffect(() => {
    if (!leftNotice?.message) return;
    showToast({
      status: "info",
      title: t("grp.leftNoticeTitle"),
      description: leftNotice.message,
      duration: 8000,
    });
    setLeftNotice(null);
  }, [leftNotice, setLeftNotice, showToast, t]);

  const filteredGroups = groups
    .filter((group) => group.name?.toLowerCase().includes(query.trim().toLowerCase()))
    .slice()
    .sort((a, b) => sortBy === "members"
      ? (b.memberCount || b.members?.length || 0) - (a.memberCount || a.members?.length || 0)
      : (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="min-h-[100dvh] bg-(--bg) overflow-x-hidden">
      <PageHeader
        as="div"
        className="mb-4 sm:mb-6"
        eyebrow={t("shell.builtFor")}
        title={t("shell.groups")}
        description={t("home.groupsHint")}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LuRefreshCw size={15} />}
              onClick={refresh}
              isLoading={refreshing}
              className="w-full sm:w-fit"
            >
              {t("shell.refresh")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LuPlus size={15} />}
              onClick={() => router.push("/groups/create")}
              className="w-full sm:w-fit"
            >
              {t("grp.create")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<LuLogIn size={15} />}
              onClick={() => router.push("/join")}
              className="w-full sm:w-fit"
            >
              {t("grp.join")}
            </Button>
          </>
        }
      />

      {/* Search & sort bar */}
      {/* {groups.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] p-3 sm:p-4 sm:bg-(--bgs) sm:rounded-2xl sm:border sm:border-(--bd)">
          <Input
            label={t("home.searchGroups")}
            type="search"
            size="md"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("home.searchGroups")}
            aria-label={t("home.searchGroups")}
          />
          <Select
            label={t("home.sortGroups")}
            size="md"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            options={[
              { value: "name", label: t("home.sortName") },
              { value: "members", label: t("home.sortMembers") },
            ]}
          />
        </div>
      )} */}

      {refreshing ? (
        <div
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
        >
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rect" height={100} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          t={t}
          onCreate={() => router.push("/groups/create")}
          onJoin={() => router.push("/join")}
        />
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-(--bd2) bg-(--bgs) px-4 py-10 text-center text-sm text-(--tm)">
          {t("home.noMatchingGroups")}
        </div>
      ) : (
        <div
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
        >
          {filteredGroups.map((g) => (
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

