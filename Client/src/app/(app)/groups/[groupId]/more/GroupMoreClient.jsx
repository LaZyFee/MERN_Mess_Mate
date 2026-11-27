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
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import NotificationsPanel from "./NotificationsPanel";
import DisputesPanel from "./DisputesPanel";
import ReconciliationPanel from "./ReconciliationPanel";
import AssetsPanel from "./AssetsPanel";
import BudgetsPanel from "./BudgetsPanel";

const SPLIT_VALUES = ["meal_units", "equal_all", "equal_selected", "member_days", "fixed_amounts", "weighted", "usage", "personal"];

// ── Invite Code Section ───────────────────────────────────────────────────────
function InviteSection({ groupId, initialMeta }) {
  const t = useT();
  const { lang } = useMoney();
  const { showToast } = useToast();
  const [meta, setMeta] = useState(initialMeta);
  const [generating, setGenerating] = useState(false);
  const [reveal, setReveal] = useState(null); // { code, inviteLink, expiresAt, maxUses }
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadMeta = useCallback(async () => {
    try {
      const d = await groupsApi.getInviteCode(groupId);
      setMeta(d?.data || d);
    } catch {
      setMeta(null);
    }
  }, [groupId]);

  async function regenerate() {
    setGenerating(true);
    try {
      const d = await groupsApi.createInviteCode({ groupId, maxUses: 20, ttlDays: 7 });
      const payload = d?.data || d;
      const code = payload?.code;
      setReveal({
        code,
        inviteLink: `${appUrl}/join?code=${code}`,
        expiresAt: payload?.expiresAt,
        maxUses: payload?.maxUses,
      });
      setConfirmRegen(false);
      showToast({ status: "success", title: t("more.inviteGenerated") });
      loadMeta();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setGenerating(false);
    }
  }

  async function sendEmailInvite() {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await groupsApi.inviteByEmail(groupId, { email: email.trim() });
      showToast({ status: "success", title: t("more.inviteEmailSent") });
      setEmail("");
    } catch (ex) {
      showToast({ status: "error", title: t("more.couldNotSendInvite"), description: ex?.data?.msg || ex?.message });
    } finally {
      setInviting(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => showToast({ status: "success", title: t("more.copied") }));
  }

  function share(url) {
    if (navigator.share) {
      navigator.share({ title: t("more.shareTitle"), url }).catch(() => { });
    } else {
      copy(url);
    }
  }

  const dateLabel = (value) => (value ? new Date(value).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB") : "");

  return (
    <Card
      padding="md"
      header={
        <div className="flex items-center gap-2">
          <LuKey size={16} className="text-(--p)" />
          <span className="text-sm font-bold text-(--tp)">{t("more.invitePeople")}</span>
        </div>
      }
    >
      {meta ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-[var(--r-md)] bg-(--pale) px-3 py-1 font-mono text-sm font-bold text-(--p)">
            MM-{meta.prefix}…
          </code>
          <span className="text-xs text-(--tl)">
            {meta.usesLeft !== undefined ? t("more.usesLeft", { count: meta.usesLeft }) : ""}
            {meta.expiresAt ? ` · ${t("more.expiresOn", { date: dateLabel(meta.expiresAt) })}` : ""}
          </span>
        </div>
      ) : (
        <p className="text-xs text-(--tm)">{t("more.noInviteCode")}</p>
      )}
      <p className="mt-2 text-[11px] text-(--tm)">{t("more.inviteHint")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" leftIcon={<LuRefreshCw size={14} />} isLoading={generating} isDisabled={generating} onClick={() => (meta ? setConfirmRegen(true) : regenerate())}>
          {meta ? t("more.regenerateCode") : t("more.generateCode")}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-(--bd) pt-3 sm:flex-row sm:items-end">
        <Input size="lg" type="email" label={t("more.inviteByEmail")} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="roommate@example.com" autoComplete="email" />
        <Button size="sm" isLoading={inviting} isDisabled={inviting || !email.trim()} onClick={sendEmailInvite}>{t("more.sendInvite")}</Button>
      </div>

      <Modal
        isOpen={Boolean(reveal)}
        onClose={() => setReveal(null)}
        header={t("more.revealTitle")}
        footer={<Button isFullWidth onClick={() => setReveal(null)}>{t("more.done")}</Button>}
      >
        {reveal && (
          <div className="space-y-3">
            {showToast({
              status: "warning",
              title: t("more.copyNow"),
              description: t("more.copyNowBody"),
              duration: 6000,
            })}
            <code className="block break-all rounded-[var(--r-md)] bg-(--bgm) px-3 py-2 text-center font-mono text-lg font-bold text-(--p)">
              {reveal.code}
            </code>
            <p className="text-[11px] text-(--tm)">
              {reveal.maxUses ? t("more.maxUses", { count: reveal.maxUses }) : t("more.limitedUses")}
              {reveal.expiresAt ? ` · ${t("more.expiresOn", { date: dateLabel(reveal.expiresAt) })}` : ""}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button size="sm" variant="outline" leftIcon={<LuCopy size={14} />} onClick={() => copy(reveal.code)}>{t("more.copyCode")}</Button>
              <Button size="sm" variant="outline" leftIcon={<LuCopy size={14} />} onClick={() => copy(reveal.inviteLink)}>{t("more.copyLink")}</Button>
              <Button size="sm" variant="outline" leftIcon={<LuShare2 size={14} />} onClick={() => share(reveal.inviteLink)}>{t("more.share")}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={regenerate}
        title={t("more.regenTitle")}
        message={t("more.regenBody")}
        status="warning"
        confirmText={t("more.regenerate")}
        isSubmitting={generating}
      />
    </Card>
  );
}

// ── Categories Section ────────────────────────────────────────────────────────
function CategoriesSection({ groupId, initialCategories }) {
  const t = useT();
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
      showToast({ status: "success", title: t("more.categorySaved") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.message });
    } finally {
      setSaving(false);
    }
  }

  async function archive(c) {
    setSaving(true);
    try {
      await groupsApi.deleteCategory(groupId, c._id);
      showToast({ status: "success", title: t("more.categoryArchived") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.message });
    } finally {
      setSaving(false);
    }
  }

  const splitOptions = SPLIT_VALUES.map((value) => ({ value, label: t(`split.${value}`) }));

  const catFormModal = (
    <Modal
      isOpen={!!editing || addOpen}
      onClose={() => { setEditing(null); setAddOpen(false); }}
      header={editing ? t("more.editCategory") : t("more.addCategory")}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setEditing(null); setAddOpen(false); }} isDisabled={saving}>{t("shell.cancel")}</Button>
          <Button onClick={save} isLoading={saving} isDisabled={saving || !form.name.trim()}>{t("shell.save")}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label={t("more.categoryName")} isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label={t("more.categoryIcon")} value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🍔" helperText={t("more.categoryIconHelp")} />
        <Select label={t("exp.splitMode")} value={form.splitMode} onChange={(e) => setForm((f) => ({ ...f, splitMode: e.target.value }))} options={splitOptions} />
      </div>
    </Modal>
  );

  return (
    <div className="[background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-md)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LuTag size={16} className="[color:var(--p)]" />
          <span className="font-bold [font-size:0.9375rem] [color:var(--tp)]">{t("more.expenseCategories")}</span>
        </div>
        <Button size="sm" leftIcon={<LuPlus size={14} />} onClick={openAdd}>{t("shell.add")}</Button>
      </div>
      {loading ? <Skeleton variant="rect" height={80} /> : cats.length === 0 ? (
        <p className="[color:var(--tm)] text-sm">{t("more.noCategories")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cats.map((c) => (
            <div key={c._id} className="flex items-center gap-3 [padding:var(--space-2)_var(--space-3)] [border-radius:var(--r-md)] [border:1px_solid_var(--bd)]">
              {c.icon && <span className="text-lg">{c.icon}</span>}
              <span className="flex-1 text-sm font-medium [color:var(--tp)]">{c.name}</span>
              <Badge colorScheme="default" size="sm">{t(`split.${c.splitMode}`)}</Badge>
              <Button size="sm" variant="ghost" ariaLabel={t("shell.edit")} onClick={() => openEdit(c)}><LuPencil size={14} /></Button>
              <Button size="sm" variant="ghost" ariaLabel={t("more.archive")} onClick={() => archive(c)}><LuArchive size={14} /></Button>
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
  const t = useT();
  const myRole = useGroupStore((s) => s.myRole);
  const groupId = useGroupStore((s) => s.groupId);
  const isAdmin = ["owner", "manager"].includes(myRole);
  const isManager = ["owner", "manager"].includes(myRole);
  const isTreasurer = ["owner", "manager", "treasurer"].includes(myRole);
  if (!groupId) return null;
  return (
    <div className="flex flex-col [gap:var(--space-5)]">
      <h2 className="text-base font-bold [color:var(--tp)]">{t("more.groupSettings")}</h2>
      {isAdmin && <InviteSection groupId={groupId} initialMeta={initialInviteMeta} />}
      {isAdmin && <CategoriesSection groupId={groupId} initialCategories={initialCategories} />}
      <BudgetsPanel groupId={groupId} categories={initialCategories} canEdit={isTreasurer} />
      {isManager && <NotificationsPanel groupId={groupId} />}
      <DisputesPanel groupId={groupId} canManage={isManager} />
      {isTreasurer && <ReconciliationPanel groupId={groupId} />}
      {isTreasurer && <AssetsPanel groupId={groupId} canManage={isTreasurer} />}
      {!isAdmin && (
        <p className="[color:var(--tm)] text-sm">{t("more.settingsRestricted")}</p>
      )}
    </div>
  );
}
