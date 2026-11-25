"use client";

/**
 * T8.8 — Global user directory: search, cursor pagination, verify and suspend
 * toggles. Suspension revokes every authenticated request server-side, so it is
 * always confirmed through the shared ConfirmationModal.
 */
import { useCallback, useState } from "react";
import { LuSearch, LuBan, LuBadgeCheck, LuRefreshCw, LuUsers } from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { adminApi } from "@/lib/api/admin";

function UserRow({ user, busy, onToggleSuspend, onToggleVerify }) {
  const suspended = Boolean(user.suspended);
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-(--bd) bg-(--bgs) p-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={user.username} src={user.profilePic} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-(--tp)">{user.username}</p>
          <p className="truncate text-[11px] text-(--tm)">{user.email || "—"}</p>
          <p className="truncate text-[11px] text-(--tl)">
            {user.phone || "no phone"} · {user.googleId ? "Google account" : "password account"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge
          type="driver"
          status={user.isVerified ? "active" : "pending"}
          config={{
            active: { variant: "success", label: "Verified" },
            pending: { variant: "warning", label: "Unverified" },
          }}
        />
        <StatusBadge
          type="driver"
          status={suspended ? "suspended" : "active"}
          config={{
            suspended: { variant: "danger", label: "Suspended" },
            active: { variant: "success", label: "Active" },
          }}
        />
        <Button
          size="xs"
          variant="outline"
          isDisabled={busy}
          leftIcon={<LuBan size={12} />}
          onClick={() => onToggleSuspend(user)}
        >
          {suspended ? "Unsuspend" : "Suspend"}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          isDisabled={busy}
          leftIcon={<LuBadgeCheck size={12} />}
          onClick={() => onToggleVerify(user)}
        >
          {user.isVerified ? "Unverify" : "Verify"}
        </Button>
      </div>
    </li>
  );
}

export default function AdminUsersClient({ initialUsers = [], initialCursor = null, initialHasMore = false, initialQuery = "" }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async (q, nextCursor = "", append = false) => {
    setLoading(true);
    try {
      const data = await adminApi.users({ q, cursor: nextCursor || undefined });
      const items = data?.items || [];
      setUsers((prev) => (append ? [...prev, ...items] : items));
      setCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load users", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const search = (event) => {
    event.preventDefault();
    load(query.trim());
  };

  const patch = async (user, payload, successTitle) => {
    setBusyId(user._id);
    try {
      const res = await adminApi.updateUser(user._id, payload);
      const updated = res?.user || { ...user, ...payload };
      setUsers((prev) => prev.map((row) => (row._id === user._id ? { ...row, ...updated } : row)));
      showToast({ status: "success", title: successTitle });
    } catch (ex) {
      showToast({ status: "error", title: "Update failed", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  };

  const confirmSuspend = () => {
    const user = confirming;
    patch(user, { suspended: !user.suspended }, user.suspended ? "User unsuspended" : "User suspended");
  };

  return (
    <div className="flex flex-col gap-(--space-4)">
      <form onSubmit={search} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Search users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="username, email or phone"
            helperText="Sensitive reads are audit-logged."
          />
        </div>
        <Button type="submit" isLoading={loading} leftIcon={<LuSearch size={14} />} ariaLabel="Search users">
          Search
        </Button>
        <Button type="button" variant="ghost" isRound ariaLabel="Reload users" onClick={() => load(query.trim())}>
          <LuRefreshCw size={14} />
        </Button>
      </form>

      {loading && users.length === 0 ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rect" height={72} />)}
        </div>
      ) : users.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <div className="flex flex-col items-center gap-2 py-6 text-center text-(--tm)">
            <LuUsers size={28} />
            <p className="text-sm">No users match “{query || "all"}”.</p>
          </div>
        </Card>
      ) : (
        <ul className="flex list-none flex-col gap-2">
          {users.map((user) => (
            <UserRow
              key={user._id}
              user={user}
              busy={busyId === user._id}
              onToggleSuspend={setConfirming}
              onToggleVerify={(u) => patch(u, { isVerified: !u.isVerified }, u.isVerified ? "User unverified" : "User verified")}
            />
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          variant="outline"
          isFullWidth
          isLoading={loading}
          onClick={() => load(query.trim(), cursor, true)}
        >
          Load more
        </Button>
      )}

      <ConfirmationModal
        isOpen={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={confirmSuspend}
        title={confirming?.suspended ? "Unsuspend this user?" : "Suspend this user?"}
        message={
          confirming?.suspended
            ? "Their login and every authenticated request start working again immediately."
            : "Suspension blocks login, refresh and every authenticated request until you lift it."
        }
        status={confirming?.suspended ? "success" : "warning"}
        confirmText={confirming?.suspended ? "Unsuspend" : "Suspend"}
        isSubmitting={Boolean(busyId)}
      />
    </div>
  );
}
