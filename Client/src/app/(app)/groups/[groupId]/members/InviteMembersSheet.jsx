"use client";

/**
 * InviteMembersSheet — every way to get a person into the group, in one sheet.
 *
 *   1. Share a join code  (POST /invite/codes → code shown once → /join?code=…)
 *   2. Email an invite     (POST /messgroups/invite/:groupId)
 *   3. Approve requests    (POST /messgroups/approve/:groupId/:userId)
 *   4. Add by user id      (POST /messgroups/add-member/:groupId)
 *
 * Roles: `owner` and `manager` (the same roles the server's admin guard accepts).
 * Everyone else sees a read-only explanation instead of dead buttons.
 */
import { useCallback, useEffect, useState } from "react";
import {
  LuCopy,
  LuShare2,
  LuRefreshCw,
  LuUserPlus,
  LuMail,
  LuKeyRound,
  LuCheck,
  LuShieldAlert,
  LuCircleCheck,
  LuLink,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Modal from "@/components/modals/Modal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

const ROLE_OPTIONS = [
  { value: "member", labelKey: "grp.role.member" },
  { value: "treasurer", labelKey: "grp.role.treasurer" },
  { value: "auditor", labelKey: "grp.role.auditor" },
  { value: "manager", labelKey: "grp.role.manager" },
];

function dateLabel(value, lang) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB");
}

export default function InviteMembersSheet({
  isOpen,
  onClose,
  groupId,
  canManage,
  pendingRequests = [],
  onChanged,
  onAddPlaceholder,
}) {
  const t = useT();
  const { lang } = useMoney();
  const { showToast } = useToast();

  const [tab, setTab] = useState("code");
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("member");
  const [adding, setAdding] = useState(false);

  const [approving, setApproving] = useState(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const joinLink = reveal?.code ? `${appUrl}/join?code=${reveal.code}` : "";

  const loadMeta = useCallback(async () => {
    if (!groupId || !canManage) return;
    setLoadingMeta(true);
    try {
      const d = await groupsApi.getInviteCode(groupId);
      setMeta(d?.data || d || null);
    } catch {
      setMeta(null);
    } finally {
      setLoadingMeta(false);
    }
  }, [groupId, canManage]);

  useEffect(() => {
    if (!isOpen || !canManage) return;
    loadMeta();
  }, [isOpen, canManage, loadMeta]);

  const copy = async (text, successTitle) => {
    try {
      await navigator.clipboard?.writeText(text);
      showToast({ status: "success", title: successTitle });
    } catch {
      showToast({ status: "error", title: t("shell.error") });
    }
  };

  const share = async () => {
    if (navigator.share && joinLink) {
      try {
        await navigator.share({ title: t("more.shareTitle"), url: joinLink });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    copy(joinLink, t("more.copied"));
  };

  async function regenerate() {
    setGenerating(true);
    try {
      const d = await groupsApi.createInviteCode({ groupId, maxUses: 20, ttlDays: 7 });
      const payload = d?.data || d;
      setReveal({
        code: payload?.code,
        expiresAt: payload?.expiresAt,
        maxUses: payload?.maxUses,
      });
      setConfirmRegen(false);
      showToast({ status: "success", title: t("more.inviteGenerated") });
      loadMeta();
      onChanged?.();
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

  async function addByUserId() {
    if (!userId.trim()) return;
    setAdding(true);
    try {
      await groupsApi.addMember(groupId, { userId: userId.trim(), role });
      showToast({ status: "success", title: t("members.added") });
      setUserId("");
      setRole("member");
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setAdding(false);
    }
  }

  async function approve(request) {
    const id = request._id || request.id || request;
    setApproving(id);
    try {
      await groupsApi.approveRequest(groupId, id);
      showToast({ status: "success", title: t("members.approve") });
      onChanged?.();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setApproving(null);
    }
  }

  const tabs = [
    { key: "code", label: t("more.invitePeople"), icon: LuKeyRound },
    { key: "email", label: t("more.inviteByEmail"), icon: LuMail },
    { key: "requests", label: t("more.pendingRequests"), icon: LuUserPlus, badge: pendingRequests.length },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={
        <span className="flex items-center gap-2">
          <LuUserPlus size={17} className="text-(--p)" />
          {t("members.add")}
        </span>
      }
      bodyClassName="px-4 py-4 sm:px-6"
    >
      {!canManage ? (
        <div className="rounded-2xl bg-(--warning-bg) px-3 py-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-(--warning)">
            <LuShieldAlert size={14} className="mt-0.5 shrink-0" />
            {t("more.settingsRestricted")}
          </p>
        </div>
      ) : (
        <>
          {/* ── Method switch ─────────────────────────────────── */}
          <div className="mb-3 flex gap-1 rounded-full bg-(--bgm) p-1">
            {tabs.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[11.5px] font-bold transition-colors ${tab === key ? "bg-(--bgs) text-(--p) shadow-sm" : "text-(--tm)"
                  }`}
              >
                <Icon size={13} />
                <span className="truncate">{label}</span>
                {badge > 0 && (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-(--danger) text-[9px] font-bold text-(--bgs)">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── 1. Join code ──────────────────────────────────── */}
          {tab === "code" && (
            <div className="space-y-3">
              {loadingMeta ? (
                <Skeleton variant="rect" height={84} className="rounded-2xl" />
              ) : reveal ? (
                <div className="rounded-2xl border border-(--p)/35 bg-(--pale) p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-(--p)">{t("more.copyNow")}</p>
                  <code className="mt-1 block break-all rounded-xl bg-(--bgs) px-3 py-2.5 text-center font-mono text-lg font-bold tracking-wider text-(--p)">
                    {reveal.code}
                  </code>
                  <p className="mt-1.5 text-center text-[11px] text-(--tm)">
                    {reveal.maxUses ? t("more.maxUses", { count: reveal.maxUses }) : t("more.limitedUses")}
                    {reveal.expiresAt ? ` · ${t("more.expiresOn", { date: dateLabel(reveal.expiresAt, lang) })}` : ""}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <Button size="sm" className="rounded-lg" variant="outline" leftIcon={<LuCopy size={13} />} onClick={() => copy(reveal.code, t("more.copied"))}>
                      {t("more.copyCode")}
                    </Button>
                    <Button size="sm" className="rounded-lg" variant="outline" leftIcon={<LuLink size={13} />} onClick={() => copy(joinLink, t("more.copied"))}>
                      {t("more.copyLink")}
                    </Button>
                    <Button size="sm" className="rounded-lg" variant="outline" leftIcon={<LuShare2 size={13} />} onClick={share}>
                      {t("more.share")}
                    </Button>
                  </div>
                </div>
              ) : meta ? (
                <div className="rounded-2xl bg-(--bgm) p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-(--bgs) text-(--p)">
                      <LuKeyRound size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-bold text-(--p)">MM-{meta.prefix}…</p>
                      <p className="truncate text-[11px] text-(--tm)">
                        {meta.usesLeft !== undefined ? t("more.usesLeft", { count: meta.usesLeft }) : ""}
                        {meta.expiresAt ? ` · ${t("more.expiresOn", { date: dateLabel(meta.expiresAt, lang) })}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-(--tm)">{t("more.inviteHint")}</p>
                </div>
              ) : (
                <p className="rounded-2xl bg-(--bgm) px-3 py-3 text-[11px] leading-relaxed text-(--tm)">
                  {t("more.noInviteCode")}
                </p>
              )}

              <Button
                size="md"
                className="rounded-xl"
                isFullWidth
                leftIcon={<LuRefreshCw size={14} />}
                isLoading={generating}
                isDisabled={generating}
                onClick={() => (meta || reveal ? setConfirmRegen(true) : regenerate())}
              >
                {meta || reveal ? t("more.regenerateCode") : t("more.generateCode")}
              </Button>

              <p className="text-[11px] leading-relaxed text-(--tm)">
                {t("more.inviteHint")} {t("more.regenBody")}
              </p>
            </div>
          )}

          {/* ── 2. Email invite ───────────────────────────────── */}
          {tab === "email" && (
            <div className="space-y-3">
              <Input
                size="lg"
                type="email"
                label={t("auth.login.email")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="roommate@example.com"
                autoComplete="email"
                helperText={t("more.inviteEmailSent")}
              />
              <Button
                size="md"
                className="rounded-xl"
                isFullWidth
                leftIcon={<LuMail size={14} />}
                isLoading={inviting}
                isDisabled={inviting || !email.trim()}
                onClick={sendEmailInvite}
              >
                {t("more.sendInvite")}
              </Button>
            </div>
          )}

          {/* ── 3. Pending requests ───────────────────────────── */}
          {tab === "requests" && (
            <div className="space-y-2">
              {pendingRequests.length === 0 ? (
                <p className="rounded-2xl bg-(--bgm) px-3 py-3 text-center text-xs text-(--tm)">
                  {t("more.pendingRequests")} · {t("shell.noResults")}
                </p>
              ) : (
                pendingRequests.map((request) => {
                  const id = request._id || request.id || request;
                  const name = request.username || request.email || String(id).slice(-6);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-2xl border border-(--bd) bg-(--bgs) px-2.5 py-2"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--bgm) text-[11px] font-bold uppercase text-(--ts)">
                        {String(name).slice(0, 2)}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-(--tp)">{name}</p>
                      <Button
                        size="sm"
                        className="shrink-0 rounded-lg"
                        leftIcon={<LuCheck size={12} />}
                        isLoading={approving === id}
                        isDisabled={Boolean(approving)}
                        onClick={() => approve(request)}
                      >
                        {t("members.approve")}
                      </Button>
                    </div>
                  );
                })
              )}

              {/* Add by user id — the escape hatch when the person cannot join themselves */}
              <div className="mt-2 space-y-2 rounded-2xl border border-(--bd) bg-(--bgm) p-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("shell.addMember")}</p>
                <Input
                  size="md"
                  label="User ID"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="24-character user id"
                />
                <Select
                  size="md"
                  label={t("members.role")}
                  options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                />
                <Button
                  size="md"
                  className="rounded-xl"
                  isFullWidth
                  leftIcon={<LuCircleCheck size={14} />}
                  isLoading={adding}
                  isDisabled={adding || !userId.trim()}
                  onClick={addByUserId}
                >
                  {t("shell.addMember")}
                </Button>
              </div>

              {/* Placeholder membership: a room/boarder without an account yet */}
              {onAddPlaceholder && (
                <Button
                  size="md"
                  className="rounded-xl"
                  variant="dashed"
                  isFullWidth
                  leftIcon={<LuUserPlus size={14} />}
                  onClick={() => {
                    onClose?.();
                    onAddPlaceholder();
                  }}
                >
                  {t("members.addModal")}
                </Button>
              )}
            </div>
          )}
        </>
      )}

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
    </Modal>
  );
}
