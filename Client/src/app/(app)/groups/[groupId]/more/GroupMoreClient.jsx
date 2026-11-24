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
import { useGroup } from "../layout";
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

const SPLIT_MODES = [
  { value: "equal", label: "Equal" },
  { value: "per_unit", label: "Per Unit" },
  { value: "per_head", label: "Per Head" },
  { value: "fixed", label: "Fixed" },
  { value: "weighted", label: "Weighted" },
  { value: "beneficiaries", label: "Beneficiaries" },
  { value: "none", label: "None" },
  { value: "usage_quantity", label: "Usage Quantity" },
];

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
      navigator.share({ title: "Join MealMate Group", url }).catch(() => {});
    } else {
      copy(url);
    }
  }

  return (
    <div className={["[background:var(--bgs)]", "[border:1px_solid_var(--bd)]", "[border-radius:var(--r-md)]", "[padding:var(--space-4)]"].filter(Boolean).join(" ")}>
      <div className={["[display:flex]", "[align-items:center]", "[gap:var(--space-2)]", "[margin-bottom:var(--space-3)]"].filter(Boolean).join(" ")}>
        <LuKey size={16} className={["[color:var(--p)]"].filter(Boolean).join(" ")} />
        <span className={["font-bold", "[font-size:0.9375rem]", "[color:var(--tp)]"].filter(Boolean).join(" ")}>Invite Code</span>
      </div>
      {loading ? <Skeleton variant="rect" height={60} /> : (
        <>
          {meta ? (
            <div className={["[display:flex]", "[align-items:center]", "[gap:var(--space-3)]", "[flex-wrap:wrap]"].filter(Boolean).join(" ")}>
              <code className={["[font-family:monospace]", "font-bold", "[font-size:1.125rem]", "[color:var(--p)]", "[background:var(--pale)]", "[padding:4px_12px]", "[border-radius:var(--r-md)]"].filter(Boolean).join(" ")}>
                MM-{meta.prefix}…
              </code>
              <span className={["[font-size:0.75rem]", "[color:var(--tl)]"].filter(Boolean).join(" ")}>
                {meta.usesLeft !== undefined ? `${meta.usesLeft} uses left` : ""}{meta.expiresAt ? ` · expires ${new Date(meta.expiresAt).toLocaleDateString()}` : ""}
              </span>
            </div>
          ) : (
            <p className={["[color:var(--tm)]", "[font-size:0.875rem]"].filter(Boolean).join(" ")}>No active invite code.</p>
          )}
          {codeRevealed && (
            <div className={["[margin-top:var(--space-3)]", "[display:flex]", "[flex-direction:column]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
              <div className={["[display:flex]", "[align-items:center]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
                <code className={["[font-family:monospace]", "font-bold", "[color:var(--p)]"].filter(Boolean).join(" ")}>{codeRevealed.code}</code>
                <Button size="sm" variant="ghost" leftIcon={<LuCopy size={14} />} onClick={() => copy(codeRevealed.code)}>Copy Code</Button>
              </div>
              <div className={["[display:flex]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
                <Button size="sm" variant="ghost" leftIcon={<LuCopy size={14} />} onClick={() => copy(codeRevealed.inviteLink)}>Copy Link</Button>
                <Button size="sm" variant="ghost" leftIcon={<LuShare2 size={14} />} onClick={() => share(codeRevealed.inviteLink)}>Share</Button>
              </div>
            </div>
          )}
          <Button size="sm" variant="outline" leftIcon={<LuRefreshCw size={14} />} isLoading={generating} onClick={regenerate} className={["[margin-top:var(--space-3)]"].filter(Boolean).join(" ")}>
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
        <div className={["[display:flex]", "[gap:var(--space-3)]"].filter(Boolean).join(" ")}>
          <Button variant="outline" onClick={() => { setEditing(null); setAddOpen(false); }} isDisabled={saving}>Cancel</Button>
          <Button onClick={save} isLoading={saving} isDisabled={saving || !form.name.trim()}>Save</Button>
        </div>
      }
    >
      <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-4)]"].filter(Boolean).join(" ")}>
        <Input label="Name" isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Icon (emoji)" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🍔" helperText="Optional emoji shown as icon" />
        <Select label="Split Mode" value={form.splitMode} onChange={(e) => setForm((f) => ({ ...f, splitMode: e.target.value }))} options={SPLIT_MODES} />
      </div>
    </Modal>
  );

  return (
    <div className={["[background:var(--bgs)]", "[border:1px_solid_var(--bd)]", "[border-radius:var(--r-md)]", "[padding:var(--space-4)]"].filter(Boolean).join(" ")}>
      <div className={["[display:flex]", "[align-items:center]", "[justify-content:space-between]", "[margin-bottom:var(--space-3)]"].filter(Boolean).join(" ")}>
        <div className={["[display:flex]", "[align-items:center]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
          <LuTag size={16} className={["[color:var(--p)]"].filter(Boolean).join(" ")} />
          <span className={["font-bold", "[font-size:0.9375rem]", "[color:var(--tp)]"].filter(Boolean).join(" ")}>Expense Categories</span>
        </div>
        <Button size="sm" leftIcon={<LuPlus size={14} />} onClick={openAdd}>Add</Button>
      </div>
      {loading ? <Skeleton variant="rect" height={80} /> : cats.length === 0 ? (
        <p className={["[color:var(--tm)]", "[font-size:0.875rem]"].filter(Boolean).join(" ")}>No categories. Add one to get started.</p>
      ) : (
        <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-2)]"].filter(Boolean).join(" ")}>
          {cats.map((c) => (
            <div key={c._id} className={["[display:flex]", "[align-items:center]", "[gap:var(--space-3)]", "[padding:var(--space-2)_var(--space-3)]", "[border-radius:var(--r-md)]", "[border:1px_solid_var(--bd)]"].filter(Boolean).join(" ")}>
              {c.icon && <span className={["[font-size:1.125rem]"].filter(Boolean).join(" ")}>{c.icon}</span>}
              <span className={["flex-1", "[font-size:0.875rem]", "font-medium", "[color:var(--tp)]"].filter(Boolean).join(" ")}>{c.name}</span>
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
  const { groupId } = useGroup() || {};
  const myRole = useGroupStore((s) => s.myRole);
  const isAdmin = ["owner", "manager"].includes(myRole);

  if (!groupId) return null;

  return (
    <div className={["[display:flex]", "[flex-direction:column]", "[gap:var(--space-5)]"].filter(Boolean).join(" ")}>
      <h2 className={["[font-size:1rem]", "font-bold", "[color:var(--tp)]"].filter(Boolean).join(" ")}>Group Settings</h2>
      {isAdmin && <InviteSection groupId={groupId} initialMeta={initialInviteMeta} />}
      {isAdmin && <CategoriesSection groupId={groupId} initialCategories={initialCategories} />}
      {!isAdmin && (
        <p className={["[color:var(--tm)]", "[font-size:0.875rem]"].filter(Boolean).join(" ")}>Settings are only available to managers and owners.</p>
      )}
    </div>
  );
}
