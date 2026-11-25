"use client";

/**
 * T8.6 — Co-member directory (privacy: username + optional WhatsApp only; the
 * server never returns email/phone here). Leaving is self-service and explains
 * the history cutoff before confirming.
 */
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LuUsers,
  LuRefreshCw,
  LuLogOut,
  LuPhone,
  LuTriangleAlert,
  LuShieldCheck,
} from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Skeleton from "@/components/shared/Skeleton";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { groupsApi } from "@/lib/api/groups";
import { useAuthStore } from "@/lib/store/authStore";
import { useGroupStore } from "@/lib/store/groupStore";

function waHref(whatsapp) {
  const digits = String(whatsapp || "").replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function MemberCard({ member, isMe }) {
  const wa = waHref(member.whatsapp);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-(--bd) bg-(--bgs) p-3">
      <Avatar name={member.username} src={member.profilePic} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-(--tp)">
          {member.username} {isMe && <span className="text-[10px] font-bold text-(--p)">(you)</span>}
        </p>
        <p className="text-[10px] text-(--tm)">{member.whatsapp ? "WhatsApp shared" : "No contact shared"}</p>
      </div>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label={`Message ${member.username} on WhatsApp`}
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-(--success-bg) text-(--success) no-underline transition-[var(--transition)] hover:brightness-105"
        >
          <LuPhone size={16} />
        </a>
      )}
    </li>
  );
}

export default function CoMemberDirectory({ groupId, initialMembers = null }) {
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
      showToast({ status: "error", title: "Could not load members", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  const leave = async () => {
    if (!me?._id) return;
    setBusy(true);
    try {
      await groupsApi.leaveGroup(groupId, me._id);
      setLeftNotice({
        message: "You left the group. Past records stay with the group, but meal, expense and statement views now start after your leave date.",
      });
      setLeaving(false);
      showToast({ status: "success", title: "You left the group" });
      router.push("/");
    } catch (ex) {
      showToast({ status: "error", title: "Could not leave group", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(false);
    }
  };

  const isOwner = useGroupStore((s) => s.myRole) === "owner";

  return (
    <Card variant="outlined" padding="md" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-(--tp)">
          <LuUsers size={15} /> Co-members
        </h2>
        <Button size="xs" variant="ghost" isRound ariaLabel="Reload directory" isLoading={loading} onClick={load}>
          <LuRefreshCw size={13} />
        </Button>
      </div>

      <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-(--bgm) px-2 py-1.5 text-[10px] text-(--tm)">
        <LuShieldCheck size={12} className="mt-px shrink-0" />
        Only usernames and shared WhatsApp numbers are visible. Email and phone stay private.
      </p>

      {members === null || (loading && members.length === 0) ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rect" height={56} />)}
        </div>
      ) : members.length === 0 ? (
        <p className="py-6 text-center text-xs text-(--tm)">No co-members yet.</p>
      ) : (
        <ul className="flex list-none flex-col gap-2">
          {members.map((member) => (
            <MemberCard key={member._id} member={member} isMe={String(member._id) === String(me?._id)} />
          ))}
        </ul>
      )}

      {!isOwner && (
        <div className="mt-3 border-t border-(--bd) pt-3">
          <Button size="sm" variant="danger" leftIcon={<LuLogOut size={13} />} onClick={() => setLeaving(true)}>
            Leave this group
          </Button>
          <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-(--tm)">
            <LuTriangleAlert size={12} className="mt-px shrink-0" />
            Leaving cuts your access immediately; balances and history stay with the group.
          </p>
        </div>
      )}

      <ConfirmationModal
        isOpen={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={leave}
        title="Leave this group?"
        message={"Your access ends immediately and the owner is notified.\n\nYour past meals, expenses and statement items remain in the group ledger for history, but they are no longer visible to you after your leave date."}
        status="warning"
        confirmText="Leave group"
        isSubmitting={busy}
      />
    </Card>
  );
}
