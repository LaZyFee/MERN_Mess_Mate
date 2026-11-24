"use client";

import { useState, useCallback } from "react";
import { LuSave, LuHistory } from "react-icons/lu";
import { useGroup } from "../layout";
import { groupsApi } from "@/lib/api/groups";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";

export default function PolicyClient({ initialPolicies = [] }) {
  const { groupId } = useGroup() || {};
  const myRole = useGroupStore((s) => s.myRole);
  const { showToast } = useToast();

  const [policies, setPolicies] = useState(initialPolicies);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const latest = initialPolicies[0];
    return {
      effectiveFrom: latest?.effectiveFrom || "",
      entryCutoffHour: latest?.entryCutoffHour ?? 20,
      reviewGraceDays: latest?.reviewGraceDays ?? 3,
    };
  });

  const isOwner = myRole === "owner";

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const d = await groupsApi.getPolicy(groupId);
      const list = d?.policies || (Array.isArray(d) ? d : [d].filter(Boolean));
      setPolicies(list);
      if (list.length > 0) {
        const latest = list[0];
        setForm({
          effectiveFrom: latest.effectiveFrom || "",
          entryCutoffHour: latest.entryCutoffHour ?? 20,
          reviewGraceDays: latest.reviewGraceDays ?? 3,
        });
      }
    } catch { setPolicies([]); }
    finally { setLoading(false); }
  }, [groupId]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.effectiveFrom) { showToast({ status: "error", title: "effectiveFrom is required (YYYY-MM)" }); return; }
    setSaving(true);
    try {
      await groupsApi.createPolicy(groupId, {
        effectiveFrom: form.effectiveFrom,
        entryCutoffHour: Number(form.entryCutoffHour),
        reviewGraceDays: Number(form.reviewGraceDays),
      });
      showToast({ status: "success", title: "Policy saved" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Error", description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner) {
    return <p className="[color:var(--tm)] p-4">Only the group owner can manage policies.</p>;
  }

  return (
    <div className="[max-width:560px]">
      <h2 className="text-base font-bold [color:var(--tp)] mb-5">Policy Editor</h2>

      {loading ? <Skeleton variant="rect" height={180} /> : (
        <form onSubmit={handleSave} noValidate>
          <div className="flex flex-col gap-4">
            <Input
              label="Effective From (YYYY-MM)"
              isRequired
              value={form.effectiveFrom}
              onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              placeholder="2026-01"
              helperText="Month this policy takes effect"
            />
            <Input
              label="Entry Cutoff Hour (0–23)"
              type="number"
              value={form.entryCutoffHour}
              onChange={(e) => setForm((f) => ({ ...f, entryCutoffHour: e.target.value }))}
              min={0}
              max={23}
              helperText="Hour after which meal entries are locked for the day"
            />
            <Input
              label="Review Grace Days"
              type="number"
              value={form.reviewGraceDays}
              onChange={(e) => setForm((f) => ({ ...f, reviewGraceDays: e.target.value }))}
              min={0}
              max={30}
              helperText="Days after period close for corrections"
            />
            <Button type="submit" leftIcon={<LuSave size={15} />} isLoading={saving} isDisabled={saving}>
              Save Policy
            </Button>
          </div>
        </form>
      )}

      {/* Version history */}
      {policies.length > 1 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <LuHistory size={15} className="[color:var(--tm)]" />
            <span className="text-sm font-semibold [color:var(--tp)]">Version History</span>
          </div>
          <div className="flex flex-col gap-2">
            {policies.slice(1).map((p, i) => (
              <div key={i} className="p-3 [background:var(--bgm)] [border-radius:var(--r-md)] [font-size:0.8125rem] [color:var(--tm)]">
                {p.effectiveFrom} — Cutoff {p.entryCutoffHour}h, Grace {p.reviewGraceDays}d
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
