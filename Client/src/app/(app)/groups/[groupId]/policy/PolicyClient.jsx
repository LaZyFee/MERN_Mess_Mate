"use client";

/**
 * Group policy editor (owner only): effective month, entry cutoff hour and
 * review grace days, plus the version history.
 *
 * Mobile-first: single-column form, sticky save, history as compact rows.
 */
import { useCallback, useState } from "react";
import { LuSave, LuHistory, LuShieldAlert, LuSlidersHorizontal, LuClock, LuCalendarClock } from "react-icons/lu";
import { useGroup } from "../GroupShell";
import { groupsApi } from "@/lib/api/groups";
import Input from "@/components/shared/Input";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, MiniStat, SectionCard } from "../GroupUI";

export default function PolicyClient({ initialPolicies = [] }) {
  const t = useT();
  const { groupId } = useGroup() || {};
  const myRole = useGroupStore((s) => s.myRole);
  const { showToast } = useToast();

  const [policies, setPolicies] = useState(initialPolicies);
  const [loading] = useState(false);
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
    } catch {
      setPolicies([]);
    }
  }, [groupId]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.effectiveFrom) {
      showToast({ status: "error", title: t("shell.required") });
      return;
    }
    setSaving(true);
    try {
      await groupsApi.createPolicy(groupId, {
        effectiveFrom: form.effectiveFrom,
        entryCutoffHour: Number(form.entryCutoffHour),
        reviewGraceDays: Number(form.reviewGraceDays),
      });
      showToast({ status: "success", title: t("shell.save") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.message || ex?.message });
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner) {
    return (
      <SectionCard icon={LuShieldAlert} tone="warning" title={t("more.groupSettings")}>
        <EmptyState icon={LuShieldAlert} title={t("more.settingsRestricted")} />
      </SectionCard>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <SectionCard icon={LuSlidersHorizontal} title={t("more.groupSettings")} subtitle={t("shell.settings")}>
        {loading ? (
          <Skeleton variant="rect" height={180} className="rounded-2xl" />
        ) : (
          <form onSubmit={handleSave} noValidate className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label={t("stmt.month")} value={form.effectiveFrom || "—"} />
              <MiniStat label={t("meals.selectedSlots")} value={`${form.entryCutoffHour}:00`} />
            </div>

            <Input
              size="md"
              label={t("stmt.month")}
              isRequired
              value={form.effectiveFrom}
              onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              placeholder="2026-01"
              helperText="YYYY-MM"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                size="md"
                label={t("overview.mealRate")}
                type="number"
                value={form.entryCutoffHour}
                onChange={(e) => setForm((f) => ({ ...f, entryCutoffHour: e.target.value }))}
                min={0}
                max={23}
                helperText={`${form.entryCutoffHour}:00`}
              />
              <Input
                size="md"
                label={t("stmt.close.checklist")}
                type="number"
                value={form.reviewGraceDays}
                onChange={(e) => setForm((f) => ({ ...f, reviewGraceDays: e.target.value }))}
                min={0}
                max={30}
              />
            </div>

            <div className="sticky bottom-2 z-10 rounded-2xl border border-(--bd) bg-(--glb) p-2 shadow-lg backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
              <Button type="submit" className="rounded-xl" isFullWidth leftIcon={<LuSave size={15} />} isLoading={saving} isDisabled={saving}>
                {t("shell.save")}
              </Button>
            </div>
          </form>
        )}
      </SectionCard>

      {policies.length > 1 && (
        <SectionCard icon={LuHistory} title={t("stmt.versions")} subtitle={`${policies.length - 1}`}>
          <ul className="space-y-1.5">
            {policies.slice(1).map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-(--bgm) px-2.5 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-(--ts)">
                  <LuCalendarClock size={12} className="text-(--tm)" /> {p.effectiveFrom}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-(--tm)">
                  <LuClock size={11} /> {p.entryCutoffHour}h · {p.reviewGraceDays}d
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
