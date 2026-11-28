"use client";

/**
 * Access sections for group settings: invite codes + expense categories.
 * Extracted from GroupMoreClient so the settings hub can mount them one at a
 * time (mobile) — behaviour is unchanged.
 */
import { useCallback, useState } from "react";
import {
  LuCopy,
  LuShare2,
  LuRefreshCw,
  LuPlus,
  LuPencil,
  LuArchive,
  LuKey,
  LuTag,
  LuMail,
  LuCircleAlert,
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
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { EmptyState, SectionCard } from "../GroupUI";

const SPLIT_VALUES = ["meal_units", "equal_all", "equal_selected", "member_days", "fixed_amounts", "weighted", "usage", "personal"];

// ── Invite code ─────────────────────────────────────────────────────────────
export default function InviteSection({ groupId, initialMeta }) {
  const t = useT();
  const { lang } = useMoney();
  const { showToast } = useToast();
  const [meta, setMeta] = useState(initialMeta);
  const [generating, setGenerating] = useState(false);
  const [reveal, setReveal] = useState(null);
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
    <SectionCard icon={LuKey} title={t("more.invitePeople")}>
      <div className="rounded-2xl bg-(--bgm) p-3">
        {meta ? (
          <>
            <code className="block w-full truncate rounded-xl bg-(--bgs) px-3 py-2 font-mono text-sm font-bold text-(--p)">
              MM-{meta.prefix}…
            </code>
            <p className="mt-1.5 text-[11px] text-(--tm)">
              {meta.usesLeft !== undefined ? t("more.usesLeft", { count: meta.usesLeft }) : ""}
              {meta.expiresAt ? ` · ${t("more.expiresOn", { date: dateLabel(meta.expiresAt) })}` : ""}
            </p>
          </>
        ) : (
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-(--tm)">
            <LuCircleAlert size={12} className="mt-0.5 shrink-0" />
            {t("more.noInviteCode")}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-(--tm)">{t("more.inviteHint")}</p>
        <Button
          size="md"
          className="mt-2 rounded-xl"
          isFullWidth
          leftIcon={<LuRefreshCw size={14} />}
          isLoading={generating}
          isDisabled={generating}
          onClick={() => (meta ? setConfirmRegen(true) : regenerate())}
        >
          {meta ? t("more.regenerateCode") : t("more.generateCode")}
        </Button>
      </div>

      <div className="mt-3 space-y-2 border-t border-(--bd) pt-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">
          <LuMail size={12} /> {t("more.inviteByEmail")}
        </p>
        <Input
          size="lg"
          type="email"
          label={t("auth.login.email")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="roommate@example.com"
          autoComplete="email"
        />
        <Button size="md" className="rounded-xl" isFullWidth isLoading={inviting} isDisabled={inviting || !email.trim()} onClick={sendEmailInvite}>
          {t("more.sendInvite")}
        </Button>
      </div>

      <Modal
        isOpen={Boolean(reveal)}
        onClose={() => setReveal(null)}
        header={t("more.revealTitle")}
        footer={<Button isFullWidth onClick={() => setReveal(null)}>{t("more.done")}</Button>}
      >
        {reveal && (
          <div className="space-y-3">
            <p className="rounded-xl border border-(--warning)/40 bg-(--warning-bg) px-3 py-2 text-[11px] font-semibold leading-relaxed text-(--warning)">
              {t("more.copyNowBody")}
            </p>
            <code className="block break-all rounded-xl bg-(--bgm) px-3 py-3 text-center font-mono text-lg font-bold text-(--p)">
              {reveal.code}
            </code>
            <p className="text-center text-[11px] text-(--tm)">
              {reveal.maxUses ? t("more.maxUses", { count: reveal.maxUses }) : t("more.limitedUses")}
              {reveal.expiresAt ? ` · ${t("more.expiresOn", { date: dateLabel(reveal.expiresAt) })}` : ""}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button size="md" className="rounded-xl" variant="outline" isFullWidth leftIcon={<LuCopy size={14} />} onClick={() => copy(reveal.code)}>
                {t("more.copyCode")}
              </Button>
              <Button size="md" className="rounded-xl" variant="outline" isFullWidth leftIcon={<LuCopy size={14} />} onClick={() => copy(reveal.inviteLink)}>
                {t("more.copyLink")}
              </Button>
              <Button size="md" className="rounded-xl" variant="outline" isFullWidth leftIcon={<LuShare2 size={14} />} onClick={() => share(reveal.inviteLink)}>
                {t("more.share")}
              </Button>
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
    </SectionCard>
  );
}

// ── Expense categories ──────────────────────────────────────────────────────
export function CategoriesSection({ groupId, initialCategories }) {
  const t = useT();
  const { showToast } = useToast();
  const [cats, setCats] = useState(initialCategories);
  const [loading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", splitMode: "equal", icon: "" });

  const load = useCallback(async () => {
    try {
      const d = await groupsApi.getCategories(groupId);
      setCats(d?.categories || d || []);
    } catch {
      setCats([]);
    }
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

  return (
    <SectionCard
      icon={LuTag}
      title={t("more.expenseCategories")}
      subtitle={`${cats.length}`}
      actions={
        <Button size="sm" className="rounded-full" leftIcon={<LuPlus size={14} />} onClick={openAdd}>
          {t("shell.add")}
        </Button>
      }
    >
      {loading ? (
        <Skeleton variant="rect" height={80} className="rounded-xl" />
      ) : cats.length === 0 ? (
        <EmptyState icon={LuTag} title={t("more.noCategories")} />
      ) : (
        <ul className="space-y-1.5">
          {cats.map((c) => (
            <li key={c._id} className="flex items-center gap-2 rounded-xl border border-(--bd) px-2.5 py-2">
              {c.icon ? (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--bgm) text-base">{c.icon}</span>
              ) : (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--bgm) text-(--tm)">
                  <LuTag size={12} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-(--tp)">{c.name}</p>
                <Badge colorScheme="subtle" size="sm">
                  {t(`split.${c.splitMode}`)}
                </Badge>
              </div>
              <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.edit")} onClick={() => openEdit(c)}>
                <LuPencil size={14} />
              </Button>
              <Button size="sm" variant="ghost" isRound ariaLabel={t("more.archive")} onClick={() => archive(c)}>
                <LuArchive size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={!!editing || addOpen}
        onClose={() => {
          setEditing(null);
          setAddOpen(false);
        }}
        header={editing ? t("more.editCategory") : t("more.addCategory")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              isFullWidth
              className="sm:!w-fit"
              onClick={() => {
                setEditing(null);
                setAddOpen(false);
              }}
              isDisabled={saving}
            >
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" onClick={save} isLoading={saving} isDisabled={saving || !form.name.trim()}>
              {t("shell.save")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input size="lg" label={t("more.categoryName")} isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input size="lg" label={t("more.categoryIcon")} value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🍔" helperText={t("more.categoryIconHelp")} />
          <Select size="lg" label={t("exp.splitMode")} value={form.splitMode} onChange={(e) => setForm((f) => ({ ...f, splitMode: e.target.value }))} options={splitOptions} />
        </div>
      </Modal>
    </SectionCard>
  );
}
