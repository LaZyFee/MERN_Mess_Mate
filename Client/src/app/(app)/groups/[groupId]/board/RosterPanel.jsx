"use client";

/**
 * T9.3 — Roster administration (manager+): create/edit rosters, publish and
 * extend the horizon. Member order is editable with arrows (touch friendly).
 */
import { useCallback, useState } from "react";
import { LuArrowDown, LuArrowUp, LuCalendarPlus, LuPlus, LuRefreshCw, LuSend } from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";
import { memberLabel, ROSTER_TYPES, ROTATION_MODES } from "./boardHelpers";

const STATUS_BADGE = {
  draft: { variant: "secondary", label: "Draft" },
  published: { variant: "success", label: "Published" },
  archived: { variant: "subtle", label: "Archived" },
};

function emptyRoster(memberships) {
  return {
    name: "",
    type: "bazar",
    rotationMode: "round_robin",
    startDate: new Date().toISOString().slice(0, 10),
    area: "kitchen",
    slotsPerTurn: 1,
    order: memberships.map((m) => m._id),
  };
}

export default function RosterPanel({ groupId, memberships = [], initialRosters = [] }) {
  const { showToast } = useToast();
  const [rosters, setRosters] = useState(initialRosters || []);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await routinesApi.rosters(groupId);
      setRosters(data?.rosters || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load rosters", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    return undefined;
  }, []);

  const move = (index, delta) => {
    setEditing((prev) => {
      const next = [...prev.order];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, order: next };
    });
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      showToast({ status: "warning", title: "Give the roster a name" });
      return;
    }
    setBusy("save");
    const payload = {
      name: editing.name.trim(),
      type: editing.type,
      rotationMode: editing.rotationMode,
      startDate: editing.startDate,
      area: editing.area,
      slotsPerTurn: Number(editing.slotsPerTurn) || 1,
      membershipOrder: editing.order,
    };
    try {
      if (editing._id) await routinesApi.updateRoster(groupId, editing._id, payload);
      else await routinesApi.createRoster(groupId, payload);
      showToast({ status: "success", title: editing._id ? "Roster updated" : "Roster created" });
      setEditing(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not save roster", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const publish = async (roster) => {
    setBusy(`publish-${roster._id}`);
    try {
      await routinesApi.publishRoster(groupId, roster._id);
      showToast({ status: "success", title: "Roster published — duties generated" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not publish", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const extend = async (roster) => {
    setBusy(`extend-${roster._id}`);
    try {
      await routinesApi.extendRoster(groupId, roster._id);
      showToast({ status: "success", title: "Horizon extended" });
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not extend", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-(--tp)">Rosters</h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button size="sm" leftIcon={<LuPlus size={13} />} onClick={() => setEditing(emptyRoster(memberships))}>New</Button>
          </div>
        </div>
      }
    >
      {loading && rosters.length === 0 ? (
        <Skeleton variant="rect" height={64} />
      ) : rosters.length === 0 ? (
        <p className="py-4 text-center text-xs text-(--tm)">No rosters yet. Create one to rotate bazar or cleaning duties.</p>
      ) : (
        <ul className="list-none space-y-2">
          {rosters.map((roster) => (
            <li key={roster._id} className="rounded-lg border border-(--bd) p-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-(--tp)">{roster.name}</p>
                  <p className="text-[11px] text-(--tm)">
                    {roster.type} · {roster.rotationMode} · starts {roster.startDate ? formatDay(roster.startDate) : "—"}
                    {roster.horizonEndDate ? ` → ${formatDay(roster.horizonEndDate)}` : ""}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[roster.status]?.variant || "subtle"}>
                  {STATUS_BADGE[roster.status]?.label || roster.status || "draft"}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing({
                  ...emptyRoster(memberships),
                  ...roster,
                  order: roster.membershipOrder || roster.order || memberships.map((m) => m._id),
                })}>
                  Edit
                </Button>
                <Button size="sm" leftIcon={<LuSend size={12} />} isLoading={busy === `publish-${roster._id}`} onClick={() => publish(roster)}>
                  Publish
                </Button>
                <Button size="sm" variant="ghost" leftIcon={<LuCalendarPlus size={12} />} isLoading={busy === `extend-${roster._id}`} onClick={() => extend(roster)}>
                  Extend horizon
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        header={editing?._id ? "Edit roster" : "New roster"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} isDisabled={busy === "save"}>Cancel</Button>
            <Button isLoading={busy === "save"} isDisabled={busy === "save"} onClick={save}>Save</Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Input size="lg" label="Name" isRequired value={editing.name} onChange={(event) => setEditing((prev) => ({ ...prev, name: event.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select size="lg" label="Type" options={ROSTER_TYPES} value={editing.type} onChange={(event) => setEditing((prev) => ({ ...prev, type: event.target.value }))} />
              <Select size="lg" label="Rotation" options={ROTATION_MODES} value={editing.rotationMode} onChange={(event) => setEditing((prev) => ({ ...prev, rotationMode: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input size="lg" type="date" label="Start" value={editing.startDate} onChange={(event) => setEditing((prev) => ({ ...prev, startDate: event.target.value }))} />
              <Input size="lg" label="Area" value={editing.area || ""} onChange={(event) => setEditing((prev) => ({ ...prev, area: event.target.value }))} />
            </div>
            <Input size="lg" label="Slots per turn" inputMode="numeric" value={editing.slotsPerTurn ?? 1} onChange={(event) => setEditing((prev) => ({ ...prev, slotsPerTurn: event.target.value }))} />

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-(--tm)">Member order</p>
              <ul className="list-none space-y-1">
                {(editing.order || []).map((membershipId, index) => {
                  const membership = memberships.find((m) => m._id === membershipId);
                  return (
                    <li key={membershipId} className="flex min-h-11 items-center justify-between gap-2 rounded-md bg-(--bgm) px-2">
                      <span className="min-w-0 truncate text-xs text-(--ts)">{index + 1}. {memberLabel(membership) || membershipId}</span>
                      <span className="flex shrink-0 gap-1">
                        <Button size="sm" variant="ghost" isRound ariaLabel="Move up" onClick={() => move(index, -1)}>
                          <LuArrowUp size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" isRound ariaLabel="Move down" onClick={() => move(index, 1)}>
                          <LuArrowDown size={13} />
                        </Button>
                      </span>
                    </li>
                  );
                })}
                {(!editing.order || editing.order.length === 0) && (
                  <li className="text-xs text-(--tm)">No members to rotate.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
