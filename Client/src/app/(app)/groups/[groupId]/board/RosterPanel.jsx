"use client";

/**
 * Roster administration (manager+): create/edit rosters, publish, extend.
 * Member order is editable with up/down arrows (touch friendly).
 */
import { useCallback, useState } from "react";
import {
  LuArrowDown,
  LuArrowUp,
  LuCalendarPlus,
  LuPlus,
  LuRefreshCw,
  LuSend,
  LuSlidersHorizontal,
  LuPencil,
} from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { routinesApi } from "@/lib/api/routines";
import { useT } from "@/lib/i18n/LangProvider";
import { EmptyState, SectionCard } from "../GroupUI";
import { memberLabel, ROSTER_TYPES, ROTATION_MODES } from "./boardHelpers";

const STATUS_BADGE = {
  draft: { variant: "secondary", label: "Draft" },
  published: { variant: "success", label: "Published" },
  archived: { variant: "subtle", label: "Archived" },
};

function emptyRoster(memberships) {
  return {
    title: "",
    type: "bazar",
    rotationMode: "round_robin",
    areas: ["kitchen"],
    horizonDays: 30,
    order: memberships.map((m) => m._id),
  };
}

export default function RosterPanel({ groupId, memberships = [], initialRosters = [] }) {
  const t = useT();
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
      showToast({ status: "error", title: t("board.rosters"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

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
    if (!editing?.title?.trim()) {
      showToast({ status: "warning", title: t("shell.required") });
      return;
    }
    setBusy("save");
    const payload = {
      title: editing.title.trim(),
      type: editing.type,
      areas: editing.areas?.filter(Boolean) || [],
      rotation: {
        mode: editing.rotationMode,
        memberOrder: editing.order || [],
      },
      horizonDays: Number(editing.horizonDays) || 30,
    };
    try {
      if (editing._id) await routinesApi.updateRoster(groupId, editing._id, payload);
      else await routinesApi.createRoster(groupId, payload);
      showToast({ status: "success", title: t("shell.save") });
      setEditing(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const publish = async (roster) => {
    setBusy(`publish-${roster._id}`);
    try {
      await routinesApi.publishRoster(groupId, roster._id);
      showToast({ status: "success", title: t("board.rosters") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const extend = async (roster) => {
    setBusy(`extend-${roster._id}`);
    try {
      await routinesApi.extendRoster(groupId, roster._id, 30);
      showToast({ status: "success", title: t("board.rosters") });
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("shell.error"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SectionCard
        icon={LuSlidersHorizontal}
        title={t("board.rosters")}
        subtitle={`${rosters.length}`}
        actions={
          <>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button size="sm" className="rounded-full" leftIcon={<LuPlus size={13} />} onClick={() => setEditing(emptyRoster(memberships))}>
              {t("shell.add")}
            </Button>
          </>
        }
        bodyClassName="space-y-2"
      >
        {loading && rosters.length === 0 ? (
          <Skeleton variant="rect" height={64} className="rounded-xl" />
        ) : rosters.length === 0 ? (
          <EmptyState icon={LuSlidersHorizontal} title={t("shell.noResults")} body={t("board.rosters")} />
        ) : (
          rosters.map((roster) => {
            const state = roster.state || roster.status || "draft";
            return (
              <div key={roster._id} className="rounded-2xl border border-(--bd) bg-(--bgs) p-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-(--tp)">{roster.title || roster.name}</p>
                    <p className="truncate text-[11px] text-(--tm)">
                      {roster.type} · {roster.rotation?.mode || roster.rotationMode || "round_robin"}
                      {roster.horizonDays ? ` · ${roster.horizonDays}d` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[state]?.variant || "subtle"} size="sm" isRounded>
                    {STATUS_BADGE[state]?.label || state}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    className="rounded-lg"
                    variant="outline"
                    leftIcon={<LuPencil size={12} />}
                    onClick={() =>
                      setEditing({
                        ...emptyRoster(memberships),
                        ...roster,
                        title: roster.title || roster.name || "",
                        areas: roster.areas || [],
                        rotationMode: roster.rotation?.mode || roster.rotationMode || "round_robin",
                        order:
                          roster.rotation?.memberOrder ||
                          roster.membershipOrder ||
                          roster.order ||
                          memberships.map((m) => m._id),
                      })
                    }
                  >
                    {t("shell.edit")}
                  </Button>
                  <Button size="sm" className="rounded-lg" leftIcon={<LuSend size={12} />} isLoading={busy === `publish-${roster._id}`} onClick={() => publish(roster)}>
                    {t("shell.confirm")}
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-lg"
                    variant="ghost"
                    leftIcon={<LuCalendarPlus size={12} />}
                    isLoading={busy === `extend-${roster._id}`}
                    onClick={() => extend(roster)}
                  >
                    +30d
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </SectionCard>

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        header={editing?._id ? t("shell.edit") : t("shell.add")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setEditing(null)} isDisabled={busy === "save"}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" isLoading={busy === "save"} isDisabled={busy === "save"} onClick={save}>
              {t("shell.save")}
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-3">
            <Input size="lg" label={t("shell.required")} isRequired value={editing.title} onChange={(event) => setEditing((prev) => ({ ...prev, title: event.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select size="md" label={t("money.kind")} options={ROSTER_TYPES} value={editing.type} onChange={(event) => setEditing((prev) => ({ ...prev, type: event.target.value }))} />
              <Select size="md" label={t("board.rosters")} options={ROTATION_MODES} value={editing.rotationMode} onChange={(event) => setEditing((prev) => ({ ...prev, rotationMode: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                size="md"
                label={t("exp.category")}
                value={(editing.areas || []).join(", ")}
                onChange={(event) =>
                  setEditing((prev) => ({
                    ...prev,
                    areas: event.target.value.split(",").map((area) => area.trim()).filter(Boolean),
                  }))
                }
              />
              <Input size="md" label={t("stmt.month")} inputMode="numeric" value={editing.horizonDays ?? 30} onChange={(event) => setEditing((prev) => ({ ...prev, horizonDays: event.target.value }))} />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-(--tm)">{t("members.title")}</p>
              <ul className="list-none space-y-1">
                {(editing.order || []).map((membershipId, index) => {
                  const membership = memberships.find((m) => m._id === membershipId);
                  return (
                    <li key={membershipId} className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-(--bgm) px-2.5">
                      <span className="min-w-0 truncate text-xs text-(--ts)">
                        {index + 1}. {memberLabel(membership) || membershipId}
                      </span>
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
                  <li className="text-xs text-(--tm)">{t("members.empty")}</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
