"use client";

/**
 * Members tab — roster with role badges, role/room/weight editing, add + remove,
 * and the co-member directory (privacy-first).
 *
 * Mobile-first: one row per member with a 2-up action pair; the modals are
 * bottom sheets and all destructive actions confirm with a reason-free prompt.
 */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuUserPlus, LuPencil, LuUserMinus, LuUsers, LuRefreshCw, LuShieldCheck } from "react-icons/lu";
import { useGroup } from "../GroupShell";
import { groupsApi } from "@/lib/api/groups";
import Avatar from "@/components/shared/Avatar";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import Modal from "@/components/modals/Modal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { useToast } from "@/components/shared/ToastProvider";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, SectionCard } from "../GroupUI";
import CoMemberDirectory from "./CoMemberDirectory";
import InviteMembersSheet from "./InviteMembersSheet";

const ROLE_VALUES = ["member", "auditor", "treasurer", "manager", "owner"];

const ROLE_VARIANT = {
  owner: "danger",
  manager: "warning",
  treasurer: "success",
  auditor: "info",
  member: "secondary",
};

function MemberRow({ m, canEdit, onEdit, onDepart, t }) {
  const name = m.displayName || m.userId?.username || t("members.memberFallback");
  const isPlaceholder = m.isPlaceholder;
  return (
    <li className="flex items-center gap-2.5 rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
      <Avatar name={name} size="md" src={m.userId?.profilePic} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-(--tp)">{name}</span>
          {isPlaceholder && (
            <Badge colorScheme="subtle" size="sm" isRounded>
              {t("members.placeholder")}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant={ROLE_VARIANT[m.role] || "secondary"} colorScheme="subtle" size="sm" isRounded>
            {t(`grp.role.${m.role}`)}
          </Badge>
          {m.room && <span className="text-[11px] text-(--tm)">{t("members.rooms")}: {m.room}</span>}
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-0.5">
          <Button size="sm" variant="ghost" isRound ariaLabel={t("members.makeRole")} onClick={() => onEdit(m)}>
            <LuPencil size={14} />
          </Button>
          <Button size="sm" variant="ghost" isRound ariaLabel={t("members.kick")} onClick={() => onDepart(m)}>
            <LuUserMinus size={14} />
          </Button>
        </div>
      )}
    </li>
  );
}

export default function MembersClient({ initialMembers = [], initialDirectory = null }) {
  const t = useT();
  const searchParams = useSearchParams();
  const groupCtx = useGroup() || {};
  const { groupId, canManage, reload: reloadShell } = groupCtx;
  const { showToast } = useToast();

  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editing, setEditing] = useState(null);
  const [departing, setDeparting] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [placeholderOpen, setPlaceholderOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = Boolean(canManage);
  const pendingRequests = groupCtx.group?.pendingRequests || [];
  const roleOptions = ROLE_VALUES.map((value) => ({ value, label: t(`grp.role.${value}`) }));

  // Deep link from the shell's "Invite" button: /members?invite=1
  useEffect(() => {
    if (searchParams?.get("invite") === "1") setInviteOpen(true);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await groupsApi.getMemberships(groupId);
      setMembers(data?.memberships || data || []);
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("members.couldNotLoad"), description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

  const loadMore = async () => {
    if (!groupId || !moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await groupsApi.getMemberships(groupId, moreCursor);
      const next = data?.memberships || [];
      setMembers((current) => {
        const seen = new Set(current.map((m) => m._id));
        return [...current, ...next.filter((m) => !seen.has(m._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("members.couldNotLoadMore"), description: ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const [editRole, setEditRole] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editWeight, setEditWeight] = useState("");

  function openEdit(m) {
    setEditing(m);
    setEditRole(m.role || "member");
    setEditRoom(m.room || "");
    setEditWeight(String(m.weight ?? 1));
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const parsedWeight = Number.parseFloat(editWeight);
      await groupsApi.updateMembership(editing._id, {
        role: editRole,
        room: editRoom || undefined,
        // `|| 1` silently rewrote a deliberate 0 back to 1 — fall back only when
        // the field is empty or not a number.
        ...(Number.isFinite(parsedWeight) ? { weight: parsedWeight } : {}),
      });
      setEditing(null);
      showToast({ status: "success", title: t("members.updated") });
      await load();
      reloadShell?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDepart() {
    setSaving(true);
    try {
      await groupsApi.departMembership(departing._id, {});
      setDeparting(null);
      showToast({ status: "success", title: t("members.removed") });
      await load();
      reloadShell?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");

  async function addMember() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await groupsApi.createMembership(groupId, { displayName: newName.trim(), role: newRole });
      setPlaceholderOpen(false);
      setNewName("");
      setNewRole("member");
      showToast({ status: "success", title: t("members.added") });
      await load();
      reloadShell?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <SectionCard
        icon={LuUsers}
        title={t("members.title")}
        subtitle={`${members.length}`}
        actions={
          <>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            {canEdit && (
              <Button size="sm" className="rounded-full" leftIcon={<LuUserPlus size={14} />} onClick={() => setInviteOpen(true)}>
                {t("shell.invite")}
              </Button>
            )}
          </>
        }
      >
        <p className="mb-2.5 flex items-start gap-1.5 rounded-xl bg-(--bgm) px-2.5 py-2 text-[11px] leading-relaxed text-(--tm)">
          <LuShieldCheck size={12} className="mt-0.5 shrink-0 text-(--p)" />
          {t("members.coMembers")} — {t("more.settingsRestricted")}
        </p>

        {/* Pending join requests — the fastest way to grow the group */}
        {canEdit && pendingRequests.length > 0 && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="mb-2.5 flex min-h-11 w-full items-center gap-2 rounded-xl border border-(--warning)/40 bg-(--warning-bg) px-2.5 text-left"
          >
            <LuUserPlus size={14} className="shrink-0 text-(--warning)" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-(--warning)">
              {t("more.pendingRequests")}
            </span>
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--warning) text-[10px] font-bold text-(--bgs)">
              {pendingRequests.length}
            </span>
          </button>
        )}

        {loading && members.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rect" height={68} className="rounded-2xl" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={LuUsers}
            title={t("members.empty")}
            action={canEdit ? <Button size="md" leftIcon={<LuUserPlus size={15} />} onClick={() => setInviteOpen(true)}>{t("shell.invite")}</Button> : null}
          />
        ) : (
          <ul className="list-none space-y-1.5">
            {members.map((m) => (
              <MemberRow key={m._id} m={m} canEdit={canEdit} onEdit={openEdit} onDepart={setDeparting} t={t} />
            ))}
            {moreCursor && (
              <li>
                <Button variant="outline" size="md" isFullWidth className="rounded-xl" isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
                  {t("members.loadMore") || t("shell.loadMore")}
                </Button>
              </li>
            )}
          </ul>
        )}
      </SectionCard>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        header={t("members.editModal")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setEditing(null)} isDisabled={saving}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" onClick={saveEdit} isLoading={saving} isDisabled={saving}>
              {t("shell.save")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Select label={t("members.role")} size="lg" value={editRole} onChange={(e) => setEditRole(e.target.value)} options={roleOptions} />
          <Input size="lg" label={t("members.rooms")} value={editRoom} onChange={(e) => setEditRoom(e.target.value)} />
          <Input size="lg" label={t("members.weight")} type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} min={0} max={10} step={0.25} />
        </div>
      </Modal>

      <InviteMembersSheet
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={groupId}
        canManage={canEdit}
        pendingRequests={pendingRequests}
        onChanged={async () => {
          await load();
          reloadShell?.();
        }}
        onAddPlaceholder={() => setPlaceholderOpen(true)}
      />

      {/* Add a placeholder membership (a shared room, no account needed) */}
      <Modal
        isOpen={placeholderOpen}
        onClose={() => setPlaceholderOpen(false)}
        header={t("members.addModal")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setPlaceholderOpen(false)} isDisabled={saving}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" onClick={addMember} isLoading={saving} isDisabled={saving || !newName.trim()}>
              {t("members.add")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input size="lg" label={t("members.displayName")} isRequired value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Select size="lg" label={t("members.role")} value={newRole} onChange={(e) => setNewRole(e.target.value)} options={roleOptions} />
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!departing}
        onClose={() => setDeparting(null)}
        onConfirm={confirmDepart}
        title={t("members.removeTitle")}
        message={t("members.removeMessage", { name: departing?.displayName || t("members.memberFallback") })}
        confirmText={t("members.remove")}
        isSubmitting={saving}
      />

      <CoMemberDirectory groupId={groupId} initialMembers={initialDirectory} />
    </div>
  );
}
