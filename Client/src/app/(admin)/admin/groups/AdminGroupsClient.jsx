"use client";

/**
 * T8.8 — Global group directory (the only surface where group enumeration
 * exists). Archive is ownerless-group safe on the backend and always goes
 * through the shared ConfirmationModal with an audit reason.
 */
import { useCallback, useState } from "react";
import { LuSearch, LuArchive, LuRefreshCw, LuBoxes, LuUsers } from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { adminApi } from "@/lib/api/admin";

function GroupRow({ group, busy, onArchive }) {
  const archived = Boolean(group.isArchived);
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-(--bd) bg-(--bgs) p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-(--tp)">{group.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-(--tm)">
          <span className="font-mono">{group.code || "—"}</span>
          <span>· admin {group.admin?.username || "unknown"}</span>
          {group.mealSlots?.length ? <span>· {group.mealSlots.length} slots</span> : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge colorScheme="default" size="sm" isRounded icon={LuUsers}>{group.activeMembers ?? 0} members</Badge>
        <StatusBadge
          type="driver"
          status={archived ? "inactive" : "active"}
          config={{
            active: { variant: "success", label: "Live" },
            inactive: { variant: "secondary", label: "Archived" },
          }}
        />
        <Button size="xs" variant="outline" isDisabled={busy || archived} leftIcon={<LuArchive size={12} />} onClick={() => onArchive(group)}>
          Archive
        </Button>
      </div>
    </li>
  );
}

export default function AdminGroupsClient({ initialGroups = [], initialQuery = "" }) {
  const { showToast } = useToast();
  const [groups, setGroups] = useState(initialGroups);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      const data = await adminApi.groups({ q });
      setGroups(data?.items || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load groups", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const search = (event) => {
    event.preventDefault();
    load(query.trim());
  };

  const archive = async () => {
    const group = confirming;
    setBusyId(group._id);
    try {
      await adminApi.archiveGroup(group._id, reason.trim());
      setGroups((prev) => prev.map((row) => (row._id === group._id ? { ...row, isArchived: true } : row)));
      showToast({ status: "success", title: `${group.name} archived` });
      setConfirming(null);
      setReason("");
    } catch (ex) {
      showToast({ status: "error", title: "Archive failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-(--space-4)">
      <form onSubmit={search} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Search groups"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="group name"
            helperText="Archive keeps every ledger row; it only removes the group from the app."
          />
        </div>
        <Button type="submit" variant="primary" isLoading={loading} leftIcon={<LuSearch size={14} />} ariaLabel="Search groups">
          Search
        </Button>
        <Button type="button" variant="ghost" isRound ariaLabel="Reload groups" onClick={() => load(query.trim())}>
          <LuRefreshCw size={14} />
        </Button>
      </form>

      {loading && groups.length === 0 ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rect" height={64} />)}
        </div>
      ) : groups.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center text-(--tm)">
            <LuBoxes size={28} />
            <p className="text-sm">No groups match “{query || "all"}”.</p>
          </div>
        </Card>
      ) : (
        <ul className="flex list-none flex-col gap-2">
          {groups.map((group) => (
            <GroupRow key={group._id} group={group} busy={busyId === group._id} onArchive={setConfirming} />
          ))}
        </ul>
      )}

      <ConfirmationModal
        isOpen={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={archive}
        title={`Archive ${confirming?.name || "group"}?`}
        message="The group disappears from the app for every member. Ledger history is preserved and the action is audit-logged."
        details={
          <Input
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. duplicate test group"
            maxLength={300}
          />
        }
        status="warning"
        confirmText="Archive group"
        isSubmitting={Boolean(busyId)}
      />
    </div>
  );
}
