"use client";

/**
 * Co-member directory (privacy: username + optional WhatsApp only; the server
 * never returns email/phone here). Leaving is self-service and explains the
 * history cutoff before confirming.
 *
 * Mobile-first: one tap target per card, WhatsApp action on the right edge.
 */
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LuUsers, LuRefreshCw, LuLogOut, LuPhone, LuTriangleAlert, LuShieldCheck } from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";
import { useAuthStore } from "@/lib/store/authStore";
import { useGroupStore } from "@/lib/store/groupStore";
import { useGroup } from "../GroupShell";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, SectionCard } from "../GroupUI";

function waHref(whatsapp) {
  const digits = String(whatsapp || "").replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function MemberCard({ member, isMe, youLabel }) {
  const wa = waHref(member.whatsapp);
  return (
    <li className="flex items-center gap-2.5 rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
      <Avatar name={member.username} src={member.profilePic} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-(--tp)">
          {member.username}{" "}
          {isMe && <span className="text-[10px] font-bold text-(--p)">({youLabel})</span>}
        </p>
        <p className="truncate text-[10.5px] text-(--tm)">
          {member.whatsapp ? "WhatsApp" : "—"}
        </p>
      </div>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label={`Message ${member.username} on WhatsApp`}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--success-bg) text-(--success) no-underline transition-transform active:scale-95"
        >
          <LuPhone size={15} />
        </a>
      )}
    </li>
  );
}

export default function CoMemberDirectory({ groupId, initialMembers = null }) {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const me = useAuthStore((s) => s.user);
  const setLeftNotice = useGroupStore((s) => s.setLeftNotice);
  const [members, setMembers] = useState(initialMembers);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await groupsApi.getMembers(groupId);
      setMembers(data?.members || data || []);
    } catch (ex) {
      showToast({ status: "error", title: t("members.couldNotLoad"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

  const leave = async () => {
    if (!me?._id) return;
    setBusy(true);
    try {
      await groupsApi.leaveGroup(groupId, me._id);
      setLeftNotice({ message: t("grp.leftNoticeTitle") });
      setLeaving(false);
      showToast({ status: "success", title: t("members.leave") });
      router.push("/dashboard");
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(false);
    }
  };

  const isOwner = (useGroup() || {}).myRole === "owner";

  return (
    <SectionCard
      icon={LuUsers}
      title={t("members.coMembers")}
      subtitle={members ? `${members.length}` : ""}
      actions={
        <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
          <LuRefreshCw size={13} />
        </Button>
      }
    >
      <p className="mb-2 flex items-start gap-1.5 rounded-xl bg-(--bgm) px-2.5 py-2 text-[10.5px] leading-relaxed text-(--tm)">
        <LuShieldCheck size={12} className="mt-0.5 shrink-0 text-(--p)" />
        {t("members.coMembers")} — usernames and shared WhatsApp only.
      </p>

      {members === null || (loading && members.length === 0) ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rect" height={60} className="rounded-2xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState icon={LuUsers} title={t("members.empty")} />
      ) : (
        <ul className="flex list-none flex-col gap-1.5">
          {members.map((member) => (
            <MemberCard
              key={member._id}
              member={member}
              isMe={String(member._id) === String(me?._id)}
              youLabel="you"
            />
          ))}
        </ul>
      )}

      {!isOwner && (
        <div className="mt-3 border-t border-(--bd) pt-3">
          <Button size="md" className="rounded-xl" variant="danger" leftIcon={<LuLogOut size={13} />} onClick={() => setLeaving(true)}>
            {t("members.leave")}
          </Button>
          <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-(--tm)">
            <LuTriangleAlert size={12} className="mt-0.5 shrink-0 text-(--warning)" />
            {t("grp.leftNoticeTitle")}
          </p>
        </div>
      )}

      <ConfirmationModal
        isOpen={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={leave}
        title={t("members.leave")}
        message={t("grp.leftNoticeTitle")}
        status="warning"
        confirmText={t("members.leave")}
        isSubmitting={busy}
      />
    </SectionCard>
  );
}
