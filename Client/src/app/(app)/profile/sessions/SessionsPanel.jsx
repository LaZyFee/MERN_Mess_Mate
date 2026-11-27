"use client";

import { useState, useCallback } from "react";
import { LuMonitor, LuSmartphone, LuTablet, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useToast } from "@/components/shared/ToastProvider";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import Skeleton from "@/components/shared/Skeleton";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { authApi } from "@/lib/api/auth";

function deviceIcon(ua = "") {
  const s = ua.toLowerCase();
  if (s.includes("mobile") || s.includes("android") || s.includes("iphone")) return <LuSmartphone size={18} />;
  if (s.includes("tablet") || s.includes("ipad")) return <LuTablet size={18} />;
  return <LuMonitor size={18} />;
}

function relativeTime(dateStr) {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionsPanel({ initialSessions = [] }) {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(null); // familyId
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authApi.getSessions();
      setSessions(data?.sessions || data || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load sessions", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  async function revoke(familyId) {
    setRevoking(familyId);
    try {
      const result = await authApi.revokeSession(familyId);
      if (result?.error) throw new Error(result.error);
      setSessions((s) => s.filter((x) => x.familyId !== familyId));
      showToast({ status: "success", title: "Session revoked", description: "That device is signed out now." });
    } catch (ex) {
      showToast({ status: "error", title: "Could not revoke session", description: ex?.data?.msg || ex?.message });
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setConfirmAll(false);
    setLoading(true);
    try {
      const current = sessions.find((session) => session.isCurrent)?.familyId;
      if (!current) throw new Error("Could not identify this device. Refresh the session list and try again.");
      await authApi.revokeAllSessions(current);
      setSessions((previous) => previous.filter((session) => session.isCurrent));
      showToast({ status: "success", title: "All other sessions revoked", description: "Those devices are signed out now." });
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-4 rounded-2xl border border-(--info)/20 bg-(--info-bg) px-4 py-3 text-sm leading-relaxed text-(--ts)">
        Revoking a session signs that device out immediately — its refresh token stops working.
      </p>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-(--tp)">Active sessions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" leftIcon={<LuRefreshCw size={15} />} onClick={load} isDisabled={loading}>
            Refresh
          </Button>
          {sessions.length > 1 && (
            <Button variant="danger" size="sm" leftIcon={<LuTrash2 size={15} />} onClick={() => setConfirmAll(true)}>
              Revoke All Others
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rect" height={72} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-(--bd2) bg-(--bgs) px-5 py-10 text-center text-sm text-(--tm)">No active sessions found.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div
              key={s.familyId || s._id}
              className="flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-(--bd) bg-(--bgs) p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
            >
              <span className="[color:var(--tm)] shrink-0">{deviceIcon(s.userAgent)}</span>
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-(--tp)">
                    {s.deviceName || s.userAgent?.slice(0, 64) || "Unknown device"}
                  </span>
                  {s.isCurrent && (
                <Badge variant="success" colorScheme="subtle" size="sm" isRounded>This device</Badge>
                  )}
                </div>
                <div className="mt-1 break-all text-xs text-(--tm)">
                  Started {relativeTime(s.createdAt)} · {s.ip || "IP unknown"}
                </div>
              </div>
              {!s.isCurrent && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={revoking === s.familyId}
                  isDisabled={!!revoking}
                  onClick={() => revoke(s.familyId)}
                  ariaLabel="Revoke session"
                  className="min-h-11 w-full sm:w-auto"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={revokeAll}
        title="Revoke All Other Sessions"
        message="This signs out every other device immediately. Your current session stays active."
        confirmText="Revoke All"
      />
    </div>
  );
}
