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
      await authApi.revokeSession(familyId);
      setSessions((s) => s.filter((x) => x.familyId !== familyId));
      showToast({ status: "success", title: "Session revoked" });
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.message });
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setConfirmAll(false);
    setLoading(true);
    try {
      await authApi.revokeAllSessions();
      setSessions([]);
      showToast({ status: "success", title: "All other sessions revoked" });
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-3 rounded-lg border border-(--bd) bg-(--bgm) px-3 py-2 text-xs text-(--tm)">
        Session coverage is grouped by device family. New-device history is hidden until a user-scoped device endpoint is available.
      </p>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold [color:var(--tp)]">Active Sessions</h2>
        <div className="flex gap-2">
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
        <p className="[color:var(--tm)] text-sm text-center p-8">
          No active sessions found.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div
              key={s.familyId || s._id}
              className="flex items-center gap-3 p-4 [background:var(--bgs)] [border:1px_solid_var(--bd)] [border-radius:var(--r-md)]"
            >
              <span className="[color:var(--tm)] shrink-0">{deviceIcon(s.userAgent)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold [color:var(--tp)] whitespace-nowrap">
                    {s.deviceName || s.userAgent?.slice(0, 40) || "Unknown device"}
                  </span>
                  {s.isCurrent && (
                    <Badge colorScheme="success" size="sm" isRounded>This device</Badge>
                  )}
                </div>
                <div className="text-xs [color:var(--tl)] mt-0.5">
                  Last seen: {relativeTime(s.lastUsedAt || s.createdAt)} · {s.ipAddress || "IP unknown"}
                </div>
              </div>
              {!s.isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={revoking === s.familyId}
                  isDisabled={!!revoking}
                  onClick={() => revoke(s.familyId)}
                  ariaLabel="Revoke session"
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
        message="This will log you out from all other devices. Your current session will stay active."
        confirmLabel="Revoke All"
      />
    </div>
  );
}
