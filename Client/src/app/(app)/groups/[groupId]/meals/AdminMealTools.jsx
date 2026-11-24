"use client";

import { useMemo, useState } from "react";
import { LuCalendarX, LuPlay, LuUpload } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Textarea from "@/components/shared/Textarea";
import Toast from "@/components/shared/Toast";
import { mealsApi } from "@/lib/api/meals";

const SLOT_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snacks", label: "Snacks" },
  { value: "dinner", label: "Dinner" },
];

export default function AdminMealTools({ groupId, memberships, enabledSlots }) {
  const [toast, setToast] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [slots, setSlots] = useState(enabledSlots);
  const [preview, setPreview] = useState(null);
  const [bulkJson, setBulkJson] = useState(
    '[\n  { "userId": "MEMBER_ID", "date": "2026-11-24", "slots": { "lunch": { "state": "consumed", "portionSubunits": 500 } } }\n]',
  );
  const [bulkPreview, setBulkPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const memberOptions = useMemo(
    () =>
      memberships
        .filter((item) => item?.userId)
        .map((item) => ({
          value: item.userId?._id || item.userId?.id || item.userId,
          label: item.displayName || item.userId?.username || "Member",
        })),
    [memberships],
  );

  const toggleSlot = (slot) => {
    setSlots((current) =>
      current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot],
    );
  };

  const runAbsence = async (apply) => {
    setBusy(true);
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
      setToast({
        type: "success",
        message: apply ? "Absence applied" : `${data.count ?? data.preview?.length ?? 0} changes found`,
      });
    } catch (error) {
      setToast({ type: "error", message: error?.message || "Absence operation failed" });
    } finally {
      setBusy(false);
    }
  };

  const runBulk = async (apply) => {
    setBusy(true);
    try {
      const entries = JSON.parse(bulkJson);
      if (!Array.isArray(entries)) throw new Error("Bulk entries must be a JSON array");
      const data = apply
        ? await mealsApi.applyBulk(groupId, entries)
        : await mealsApi.previewBulk(groupId, entries);
      setBulkPreview(data);
      setToast({ type: "success", message: apply ? "Bulk entries applied" : "Bulk preview ready" });
    } catch (error) {
      setToast({ type: "error", message: error?.message || "Invalid bulk entries" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {toast && <div className="lg:col-span-2"><Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /></div>}
      <Card header={<div className="flex items-center gap-2"><LuCalendarX size={20} className="text-(--p)" /><h2 className="font-bold text-(--tp)">Absence window</h2></div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input size="lg" type="date" label="From" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input size="lg" type="date" label="To" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Select size="lg" label="Member (optional)" value={targetUser} options={[{ value: "", label: "All active members" }, ...memberOptions]} onChange={(event) => setTargetUser(event.target.value)} />
          <div>
            <p className="mb-2 text-sm font-semibold text-(--ts)">Slots</p>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_OPTIONS.filter((item) => enabledSlots.includes(item.value)).map((item) => (
                <Button key={item.value} variant={slots.includes(item.value) ? "primary" : "outline"} size="lg" onClick={() => toggleSlot(item.value)}>
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" leftIcon={<LuPlay size={16} />} isLoading={busy} onClick={() => runAbsence(false)}>Preview</Button>
            <Button variant="primary" size="lg" leftIcon={<LuCalendarX size={16} />} isLoading={busy} onClick={() => runAbsence(true)}>Apply absence</Button>
          </div>
          {preview && (
            <div className="max-h-48 overflow-auto rounded-xl border border-(--bd) p-3 text-sm text-(--ts)">
              <pre className="whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
            </div>
          )}
        </div>
      </Card>

      <Card header={<div className="flex items-center gap-2"><LuUpload size={20} className="text-(--p)" /><h2 className="font-bold text-(--tp)">Bulk entry</h2></div>}>
        <div className="space-y-3">
          <Textarea label="Entries JSON" value={bulkJson} onChange={(event) => setBulkJson(event.target.value)} rows={10} />
          <div className="flex gap-2">
            <Button variant="outline" size="lg" leftIcon={<LuPlay size={16} />} isLoading={busy} onClick={() => runBulk(false)}>Preview</Button>
            <Button variant="primary" size="lg" leftIcon={<LuUpload size={16} />} isLoading={busy} onClick={() => runBulk(true)}>Apply bulk</Button>
          </div>
          {bulkPreview && (
            <div className="max-h-48 overflow-auto rounded-xl border border-(--bd) p-3 text-sm text-(--ts)">
              <pre className="whitespace-pre-wrap">{JSON.stringify(bulkPreview, null, 2)}</pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
