"use client";

import { useState, useCallback } from "react";
import {
  LuUserPlus,
  LuPencil,
  LuUserMinus,
  LuUser,
} from "react-icons/lu";
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
import { useGroupStore } from "@/lib/store/groupStore";
import CoMemberDirectory from "./CoMemberDirectory";

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "auditor", label: "Auditor" },
  { value: "treasurer", label: "Treasurer" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
];

const ROLE_COLOR = {
  owner: "danger",
  manager: "warning",
  treasurer: "success",
  auditor: "info",
  member: "default",
};

function MemberRow({ m, canEdit, onEdit, onDepart }) {
  const name = m.displayName || m.userId?.username || "Member";
  const isPlaceholder = m.isPlaceholder;
  return (
    <div
      className="flex items-center gap-3 [padding:var(--space-3)_var(--space-4)] [background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-md)]"
    >
      <Avatar name={name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold [color:var(--tp)] [font-size:0.9rem]">{name}</span>
          {isPlaceholder && <Badge colorScheme="default" size="sm" isRounded>Placeholder</Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge colorScheme={ROLE_COLOR[m.role] || "default"} size="sm" isRounded>{m.role}</Badge>
          {m.room && <span className="text-xs [color:var(--tl)]">Room {m.room}</span>}
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" ariaLabel="Edit membership" onClick={() => onEdit(m)}>
            <LuPencil size={15} />
          </Button>
          <Button size="sm" variant="ghost" ariaLabel="Remove member" onClick={() => onDepart(m)}>
            <LuUserMinus size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MembersClient({ initialMembers = [], initialDirectory = null }) {
  const { groupId } = useGroup() || {};
  const myRole = useGroupStore((s) => s.myRole);
  const { showToast } = useToast();

  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [departing, setDeparting] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = ["owner", "manager"].includes(myRole);

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const data = await groupsApi.getMemberships(groupId);
      setMembers(data?.memberships || data || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load members", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  // Edit form state
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
      await groupsApi.updateMembership(editing._id, {
        role: editRole,
        room: editRoom || undefined,
        weight: parseFloat(editWeight) || 1,
      });
      setEditing(null);
      showToast({ status: "success", title: "Membership updated" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDepart() {
    setSaving(true);
    try {
      await groupsApi.departMembership(departing._id, {});
      setDeparting(null);
      showToast({ status: "success", title: "Member removed" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  // Add member form
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("member");

  async function addMember() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await groupsApi.createMembership(groupId, { displayName: newName.trim(), role: newRole });
      setAddOpen(false);
      setNewName("");
      setNewRole("member");
      showToast({ status: "success", title: "Member added" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold [color:var(--tp)]">Members</h2>
        {canEdit && (
          <Button size="sm" leftIcon={<LuUserPlus size={15} />} onClick={() => setAddOpen(true)}>
            Add Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rect" height={72} />)}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center p-8 [color:var(--tm)]">
          <LuUser size={40} className="[color:var(--tl)] mb-3" />
          <p>No members yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <MemberRow
              key={m._id}
              m={m}
              canEdit={canEdit}
              onEdit={openEdit}
              onDepart={setDeparting}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        header="Edit Membership"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditing(null)} isDisabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} isLoading={saving} isDisabled={saving}>Save</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Role"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            options={ROLE_OPTIONS}
          />
          <Input label="Room" value={editRoom} onChange={(e) => setEditRoom(e.target.value)} />
          <Input label="Weight" type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} min={0} max={10} step={0.25} />
        </div>
      </Modal>

      {/* Add member modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        header="Add Member / Placeholder"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAddOpen(false)} isDisabled={saving}>Cancel</Button>
            <Button onClick={addMember} isLoading={saving} isDisabled={saving || !newName.trim()}>Add</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Display Name" isRequired value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Select label="Role" value={newRole} onChange={(e) => setNewRole(e.target.value)} options={ROLE_OPTIONS} />
        </div>
      </Modal>

      {/* Depart confirm */}
      <ConfirmationModal
        isOpen={!!departing}
        onClose={() => setDeparting(null)}
        onConfirm={confirmDepart}
        title="Remove Member"
        message={`Remove ${departing?.displayName || "this member"} from the group? Their historical data remains.`}
        confirmText="Remove"
        isSubmitting={saving}
      />

      <div className="mt-5">
        <CoMemberDirectory groupId={groupId} initialMembers={initialDirectory} />
      </div>
    </div>
  );
}
