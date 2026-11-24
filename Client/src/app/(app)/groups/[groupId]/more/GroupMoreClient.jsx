"use client";

import { useState, useCallback } from "react";
import {
  LuCopy,
  LuShare2,
  LuRefreshCw,
  LuPlus,
  LuPencil,
  LuArchive,
  LuKey,
  LuTag,
} from "react-icons/lu";
import { groupsApi } from "@/lib/api/groups";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Badge from "@/components/shared/Badge";
import Modal from "@/components/modals/Modal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { SPLIT_MODES } from "@/lib/utils/money";
import NotificationsPanel from "./NotificationsPanel";
import DisputesPanel from "./DisputesPanel";
import ReconciliationPanel from "./ReconciliationPanel";

// ── Invite Code Section ───────────────────────────────────────────────────────
function InviteSection({ groupId, initialMeta }) {
  const { showToast } = useToast();
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(null); // { code, inviteLink }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadMeta = useCallback(async () => {
    try {
      const d = await groupsApi.getInviteCode(groupId);
      setMeta(d?.data || d);
    } catch {
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  async function regenerate() {
    setGenerating(true);
    try {
      const d = await groupsApi.createInviteCode({ groupId, maxUses: 50, ttlDays: 30 });
      const code = d?.code || d?.data?.code;
      const inviteLink = `${appUrl}/join?code=${code}&groupId=${groupId}`;
      setCodeRevealed({ code, inviteLink });
      showToast({ status: "success", title: "New invite code generated" });
      loadMeta();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.message });
    } finally {
      setGenerating(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => showToast({ status: "success", title: "Copied!" }));
  }

  function share(url) {
    if (navigator.share) {
      navigator.share({ title: "Join MealMate Group", url }).catch(() => { });
    } else {
      copy(url);
    }
  }

  return (
    <div className="[background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-md)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <LuKey size={16} className="[color:var(--p)]" />
        <span className="font-bold [font-size:0.9375rem] [color:var(--tp)]">Invite Code</span>
      </div>
      {loading ? <Skeleton variant="rect" height={60} /> : (
        <>
          {meta ? (
            <div className="flex items-center gap-3 flex-wrap">
              <code className="font-mono font-bold text-lg [color:var(--p)] [background:var(--pale)] [padding:4px_12px] [border-radius:var(--r-md)]">
                MM-{meta.prefix}…
              </code>
              <span className="text-xs [color:var(--tl)]">
                {meta.usesLeft !== undefined ? `${meta.usesLeft} uses left` : ""}{meta.expiresAt ? ` · expires ${new Date(meta.expiresAt).toLocaleDateString()}` : ""}
              </span>
            </div>
          ) : (
            <p className="[color:var(--tm)] text-sm">No active invite code.</p>
          )}
          {codeRevealed && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <code className="font-mono font-bold [color:var(--p)]">{codeRevealed.code}</code>
                <Button size="sm" variant="ghost" leftIcon={<LuCopy size={14} />} onClick={() => copy(codeRevealed.code)}>Copy Code</Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" leftIcon={<LuCopy size={14} />} onClick={() => copy(codeRevealed.inviteLink)}>Copy Link</Button>
                <Button size="sm" variant="ghost" leftIcon={<LuShare2 size={14} />} onClick={() => share(codeRevealed.inviteLink)}>Share</Button>
              </div>
            </div>
          )}
          <Button size="sm" variant="outline" leftIcon={<LuRefreshCw size={14} />} isLoading={generating} onClick={regenerate} className="mt-3">
            {meta ? "Regenerate" : "Generate"} Code
          </Button>
        </>
      )}
    </div>
  );
}

// ── Categories Section ────────────────────────────────────────────────────────
function CategoriesSection({ groupId, initialCategories }) {
  const { showToast } = useToast();
  const [cats, setCats] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", splitMode: "equal", icon: "" });

  const load = useCallback(async () => {
    try {
      const d = await groupsApi.getCategories(groupId);
      setCats(d?.categories || d || []);
    } catch { setCats([]); } finally { setLoading(false); }
  }, [groupId]);

  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name, splitMode: c.splitMode || "equal", icon: c.icon || "" });
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", splitMode: "equal", icon: "" });
    setAddOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await groupsApi.updateCategory(groupId, editing._id, form);
        setEditing(null);
      } else {
        await groupsApi.createCategory(groupId, form);
        setAddOpen(false);
      }
      showToast({ status: "success", title: "Category saved" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.message });
    } finally {
      setSaving(false);
    }
  }

  async function archive(c) {
    setSaving(true);
    try {
      await groupsApi.deleteCategory(groupId, c._id);
      showToast({ status: "success", title: "Category archived" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.message });
    } finally {
      setSaving(false);
    }
  }

  const catFormModal = (
    <Modal
      isOpen={!!editing || addOpen}
      onClose={() => { setEditing(null); setAddOpen(false); }}
      header={editing ? "Edit Category" : "Add Category"}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setEditing(null); setAddOpen(false); }} isDisabled={saving}>Cancel</Button>
          <Button onClick={save} isLoading={saving} isDisabled={saving || !form.name.trim()}>Save</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Name" isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Icon (emoji)" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🍔" helperText="Optional emoji shown as icon" />
        <Select label="Split Mode" value={form.splitMode} onChange={(e) => setForm((f) => ({ ...f, splitMode: e.target.value }))} options={SPLIT_MODES} />
      </div>
    </Modal>
  );

  return (
    <div className="[background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-md)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LuTag size={16} className="[color:var(--p)]" />
          <span className="font-bold [font-size:0.9375rem] [color:var(--tp)]">Expense Categories</span>
        </div>
        <Button size="sm" leftIcon={<LuPlus size={14} />} onClick={openAdd}>Add</Button>
      </div>
      {loading ? <Skeleton variant="rect" height={80} /> : cats.length === 0 ? (
        <p className="[color:var(--tm)] text-sm">No categories. Add one to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cats.map((c) => (
            <div key={c._id} className="flex items-center gap-3 [padding:var(--space-2)_var(--space-3)] [border-radius:var(--r-md)] [border:1px_solid_var(--bd)]">
              {c.icon && <span className="text-lg">{c.icon}</span>}
              <span className="flex-1 text-sm font-medium [color:var(--tp)]">{c.name}</span>
              <Badge colorScheme="default" size="sm">{c.splitMode}</Badge>
              <Button size="sm" variant="ghost" ariaLabel="Edit" onClick={() => openEdit(c)}><LuPencil size={14} /></Button>
              <Button size="sm" variant="ghost" ariaLabel="Archive" onClick={() => archive(c)}><LuArchive size={14} /></Button>
            </div>
          ))}
        </div>
      )}
      {catFormModal}
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function GroupMoreClient({ initialInviteMeta = null, initialCategories = [] }) {
  const myRole = useGroupStore((s) => s.myRole);
  const groupId = useGroupStore((s) => s.groupId);
  const isAdmin = ["owner", "manager"].includes(myRole);
  const isManager = ["owner", "manager"].includes(myRole);
  const isTreasurer = ["owner", "manager", "treasurer"].includes(myRole);
  if (!groupId) return null;
  return (
    <div className="flex flex-col [gap:var(--space-5)]">
      <h2 className="text-base font-bold [color:var(--tp)]">Group Settings</h2>
      {isAdmin && <InviteSection groupId={groupId} initialMeta={initialInviteMeta} />}
      {isAdmin && <CategoriesSection groupId={groupId} initialCategories={initialCategories} />}
      {isManager && <NotificationsPanel groupId={groupId} />}
      <DisputesPanel groupId={groupId} canManage={isManager} />
      {isTreasurer && <ReconciliationPanel groupId={groupId} />}
      {!isAdmin && (
        <p className="[color:var(--tm)] text-sm">Settings are only available to managers and owners.</p>
      )}
    </div>
  );
}
