"use client";

/**
 * Owner-only meal tools: absence windows and bulk JSON entry.
 * Each block previews first, then applies — nothing writes until confirmed.
 * Mobile-first: single column, sticky-ish apply buttons, JSON preview scrolls.
 */
import { useMemo, useState } from "react";
import { LuCalendarX, LuPlay, LuUpload, LuEye, LuCode } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Textarea from "@/components/shared/Textarea";
import { useToast } from "@/components/shared/ToastProvider";
import { mealsApi } from "@/lib/api/meals";
import { useT } from "@/lib/i18n/LangProvider";
import { SectionCard } from "../GroupUI";

const SLOT_OPTIONS = [
  { value: "breakfast", labelKey: "meals.slot.breakfast" },
  { value: "lunch", labelKey: "meals.slot.lunch" },
  { value: "snacks", labelKey: "meals.slot.snacks" },
  { value: "dinner", labelKey: "meals.slot.dinner" },
];

export default function AdminMealTools({ groupId, memberships, enabledSlots }) {
  const t = useT();
  const { showToast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [slots, setSlots] = useState(enabledSlots);
  const [preview, setPreview] = useState(null);
  const [bulkJson, setBulkJson] = useState(
    '[\n  { "userId": "MEMBER_ID", "date": "2026-11-24", "slots": { "lunch": { "state": "consumed", "portionSubunits": 500 } } }\n]',
  );
  const [bulkPreview, setBulkPreview] = useState(null);
  const [busy, setBusy] = useState(null);

  const memberOptions = useMemo(
    () =>
      memberships
        .filter((item) => item?.userId)
        .map((item) => ({
          value: item.userId?._id || item.userId?.id || item.userId,
          label: item.displayName || item.userId?.username || t("members.memberFallback"),
        })),
    [memberships, t],
  );

  const toggleSlot = (slot) => {
    setSlots((current) =>
      current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot],
    );
  };

  const runAbsence = async (apply) => {
    setBusy(apply ? "apply" : "preview");
    try {
      const body = {
        from,
        to,
        slots,
        ...(targetUser ? { userId: targetUser } : {}),
      };
      const data = apply
        ? await mealsApi.applyAbsence(groupId, body)
        : await mealsApi.previewAbsence(groupId, body);
      setPreview(data);
      showToast({
        status: "success",
        title: apply ? t("meals.saved") : t("exp.draftForm"),
        description: `${data?.count ?? data?.preview?.length ?? 0}`,
      });
    } catch (error) {
      showToast({ status: "error", title: t("shell.error"), description: error?.message });
    } finally {
      setBusy(null);
    }
  };

  const runBulk = async (apply) => {
    setBusy(apply ? "bulk-apply" : "bulk-preview");
    try {
      const entries = JSON.parse(bulkJson);
      if (!Array.isArray(entries)) throw new Error("Bulk entries must be a JSON array");
      const data = apply
        ? await mealsApi.applyBulk(groupId, entries)
        : await mealsApi.previewBulk(groupId, entries);
      setBulkPreview(data);
      showToast({ status: "success", title: apply ? t("meals.saved") : t("exp.draftForm") });
    } catch (error) {
      showToast({ status: "error", title: t("shell.error"), description: error?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <SectionCard icon={LuCalendarX} title={t("meals.absent")} subtitle={t("exp.date")}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input size="lg" type="date" label={t("stmt.prev")} value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input size="lg" type="date" label={t("stmt.next")} value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Select
            size="lg"
            label={t("stmt.member")}
            value={targetUser}
            options={[{ value: "", label: t("exp.everyone") }, ...memberOptions]}
            onChange={(event) => setTargetUser(event.target.value)}
          />
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("meals.selectedSlots")}</p>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_OPTIONS.filter((item) => enabledSlots.includes(item.value)).map((item) => {
                const active = slots.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSlot(item.value)}
                    className={`min-h-11 rounded-xl border text-[13px] font-semibold transition-colors ${active
                        ? "border-(--p) bg-(--pale) text-(--p)"
                        : "border-(--bd) text-(--ts) hover:border-(--bd2)"
                      }`}
                  >
                    {t(item.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              isFullWidth
              className="rounded-xl"
              leftIcon={<LuEye size={15} />}
              isLoading={busy === "preview"}
              isDisabled={Boolean(busy)}
              onClick={() => runAbsence(false)}
            >
              {t("stmt.close.preview")}
            </Button>
            <Button
              variant="primary"
              size="md"
              isFullWidth
              className="rounded-xl"
              leftIcon={<LuCalendarX size={15} />}
              isLoading={busy === "apply"}
              isDisabled={Boolean(busy)}
              onClick={() => runAbsence(true)}
            >
              {t("meals.saveEntry")}
            </Button>
          </div>
          {preview && (
            <div className="max-h-44 overflow-auto rounded-xl bg-(--bgm) p-3 text-[11px] text-(--ts)">
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(preview, null, 2)}</pre>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={LuCode} title={t("exp.advanced")} subtitle="JSON">
        <div className="space-y-3">
          <Textarea label="Entries JSON" value={bulkJson} onChange={(event) => setBulkJson(event.target.value)} rows={9} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              isFullWidth
              className="rounded-xl"
              leftIcon={<LuPlay size={15} />}
              isLoading={busy === "bulk-preview"}
              isDisabled={Boolean(busy)}
              onClick={() => runBulk(false)}
            >
              {t("stmt.close.preview")}
            </Button>
            <Button
              variant="primary"
              size="md"
              isFullWidth
              className="rounded-xl"
              leftIcon={<LuUpload size={15} />}
              isLoading={busy === "bulk-apply"}
              isDisabled={Boolean(busy)}
              onClick={() => runBulk(true)}
            >
              {t("exp.saveDraft")}
            </Button>
          </div>
          {bulkPreview && (
            <div className="max-h-44 overflow-auto rounded-xl bg-(--bgm) p-3 text-[11px] text-(--ts)">
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(bulkPreview, null, 2)}</pre>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
