"use client";

import { useState, useCallback } from "react";
import {
  LuUserPlus,
  LuPencil,
  LuUserMinus,
  LuUser,
} from "react-icons/lu";
import { useGroup } from "../layout";
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
      className={["[display:flex]", "[align-items:center]", "[gap:var(--space-3)]", "[padding:var(--space-3)_var(--space-4)]", "[background:var(--bgs)]", "[border:1px_solid_var(--bd)]", "[border-radius:var(--r-md)]"].filter(Boolean).join(" ")}
    >
      <Avatar name={name} size="md" />
      <div className={["flex-1", "[min-width:0px]"].filter(Boolean).join(" ")}>
        <div className={["[display:flex]", "[align-items:center]", "[gap:var(--space-2)]", "[flex-wrap:wrap]"].filter(Boolean).join(" ")}>
          <span className={["font-semibold", "[color:var(--tp)]", "[font-size:0.9rem]"].filter(Boolean).join(" ")}>{name}</span>
          {isPlaceholder && <Badge colorScheme="default" size="sm" isRounded>Placeholder</Badge>}
        </div>
        <div className={["[display:flex]", "[align-items:center]", "[gap:var(--space-2)]", "[margin-top:2px]", "[flex-wrap:wrap]"].filter(Boolean).join(" ")}>
          <Badge colorScheme={ROLE_COLOR[m.role] || "default"} size="sm" isRounded>{m.role}</Badge>
          {m.room && <span className={["[font-size:0.75rem]", "[color:var(--tl)]"].filter(Boolean).join(" ")}>Room {m.room}</span>}
        </div>
      </div>
      {canEdit && (
        <div className={["[display:flex]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
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

export default function MembersClient({ initialMembers = [] }) {
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
      <div className={["[display:flex]", "[justify-content:space-between]", "[align-items:center]", "[margin-bottom:var(--space-4)]"].filter(Boolean).join(" ")}>
        <h2 className={["[font-size:1rem]", "font-bold", "[color:var(--tp)]"].filter(Boolean).join(" ")}>Members</h2>
        {canEdit && (
          <Button size="sm" leftIcon={<LuUserPlus size={15} />} onClick={() => setAddOpen(true)}>
            Add Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rect" height={72} />)}
        </div>
      ) : members.length === 0 ? (
        <div className={["[text-align:center]", "[padding:var(--space-8)]", "[color:var(--tm)]"].filter(Boolean).join(" ")}>
          <LuUser size={40} className={["[color:var(--tl)]", "[margin-bottom:var(--space-3)]"].filter(Boolean).join(" ")} />
          <p>No members yet.</p>
        </div>
      ) : (
        <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
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
          <div className={["[display:flex]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
            <Button variant="outline" onClick={() => setEditing(null)} isDisabled={saving}>Cancel</Button>
            <Button onClick={saveEdit} isLoading={saving} isDisabled={saving}>Save</Button>
          </div>
        }
      >
        <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}>
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
          <div className={["[display:flex]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
            <Button variant="outline" onClick={() => setAddOpen(false)} isDisabled={saving}>Cancel</Button>
            <Button onClick={addMember} isLoading={saving} isDisabled={saving || !newName.trim()}>Add</Button>
          </div>
        }
      >
        <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}>
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
        confirmLabel="Remove"
        isLoading={saving}
      />
    </div>
  );
}
