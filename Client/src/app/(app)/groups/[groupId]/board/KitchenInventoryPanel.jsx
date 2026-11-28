"use client";

/**
 * Kitchen inventory: staple stock levels, add/update items and refills.
 * Contract: { name, unit, currentStock, reorderThreshold }. Refills take
 * `costPoisha` (edited in Taka).
 *
 * Mobile-first: stock rows keep the badge next to the name; actions wrap to a
 * second line so nothing gets squeezed on a 360px screen.
 */
import { useCallback, useEffect, useState } from "react";
import { LuPackage, LuPlus, LuRefreshCw, LuTrash2, LuPencil, LuPackagePlus } from "react-icons/lu";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { inventoryApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { EmptyState, SectionCard } from "../GroupUI";

const STOCK_STATUS = {
  ok: { variant: "success", labelKey: "kitchen.inStock" },
  low: { variant: "warning", labelKey: "kitchen.low" },
  out: { variant: "danger", labelKey: "kitchen.out" },
};

function stockStatus(item) {
  const current = Number(item.currentStock ?? 0);
  const threshold = Number(item.reorderThreshold ?? 0);
  if (current <= 0) return "out";
  if (threshold > 0 && current <= threshold) return "low";
  return "ok";
}

const EMPTY = { name: "", unit: "kg", currentStock: "", reorderThreshold: "" };

function ProgressBar({ value, max, tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const cls =
    tone === "danger" ? "bg-(--danger)" : tone === "warning" ? "bg-(--warning)" : "bg-(--success)";
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-(--bd)">
      <div className={`h-full rounded-full ${cls}`} style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );
}

export default function KitchenInventoryPanel({ groupId, initialItems = [] }) {
  const t = useT();
  const { parse, errorText, lang } = useMoney();
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems || []);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [refillFor, setRefillFor] = useState(null);
  const [refillAmount, setRefillAmount] = useState("");
  const [refillCost, setRefillCost] = useState("");
  const [busy, setBusy] = useState(null);

  const stockConfig = {
    ok: { variant: STOCK_STATUS.ok.variant, label: t(STOCK_STATUS.ok.labelKey) },
    low: { variant: STOCK_STATUS.low.variant, label: t(STOCK_STATUS.low.labelKey) },
    out: { variant: STOCK_STATUS.out.variant, label: t(STOCK_STATUS.out.labelKey) },
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.list(groupId);
      setItems(data?.items || (Array.isArray(data) ? data : []));
    } catch (ex) {
      showToast({ status: "error", title: t("kitchen.couldNotLoad"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

  useEffect(() => {
    return onRealtime((event) => {
      if (event === "kitchenInventory-updated") load();
    });
  }, [load]);

  const saveItem = async () => {
    if (!form?.name?.trim()) {
      showToast({ status: "warning", title: t("kitchen.nameRequired") });
      return;
    }
    const payload = {
      name: form.name.trim(),
      unit: form.unit || "kg",
      currentStock: form.currentStock === "" || form.currentStock == null ? undefined : Number(form.currentStock),
      reorderThreshold:
        form.reorderThreshold === "" || form.reorderThreshold == null ? undefined : Number(form.reorderThreshold),
    };
    setBusy("save");
    try {
      if (form._id) await inventoryApi.updateItem(groupId, form._id, payload);
      else await inventoryApi.addItem(groupId, payload);
      showToast({ status: "success", title: form._id ? t("kitchen.itemUpdated") : t("kitchen.itemAdded") });
      setForm(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("kitchen.couldNotSave"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item) => {
    setBusy(item._id);
    try {
      await inventoryApi.deleteItem(groupId, item._id);
      setItems((prev) => prev.filter((row) => row._id !== item._id));
    } catch (ex) {
      showToast({ status: "error", title: t("kitchen.couldNotDelete"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const refill = async () => {
    if (!refillFor || !refillAmount) return;
    const cost = refillCost.trim() ? parse(refillCost, { allowZero: true }) : null;
    if (cost && !cost.ok) {
      showToast({ status: "warning", title: errorText(cost.reason) });
      return;
    }
    setBusy("refill");
    try {
      await inventoryApi.refill(groupId, refillFor._id, {
        quantity: Number(refillAmount),
        ...(cost?.ok ? { costPoisha: cost.poisha } : {}),
      });
      showToast({ status: "success", title: t("kitchen.refilled", { name: refillFor.name }) });
      setRefillFor(null);
      setRefillAmount("");
      setRefillCost("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("kitchen.couldNotRefill"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const lowCount = items.filter((item) => stockStatus(item) !== "ok").length;

  return (
    <>
      <SectionCard
        icon={LuPackage}
        title={t("kitchen.title")}
        subtitle={lowCount > 0 ? t("kitchen.lowCount", { count: lowCount }) : t("kitchen.inStock")}
        tone={lowCount > 0 ? "warning" : "default"}
        actions={
          <>
            {lowCount > 0 && (
              <Badge variant="warning" size="sm" isRounded>
                {lowCount}
              </Badge>
            )}
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" leftIcon={<LuPlus size={13} />} onClick={() => setForm({ ...EMPTY })}>
              {t("shell.add")}
            </Button>
          </>
        }
      >
        {loading && items.length === 0 ? (
          <Skeleton variant="rect" height={64} className="rounded-xl" />
        ) : items.length === 0 ? (
          <EmptyState icon={LuPackage} title={t("kitchen.empty")} body={t("kitchen.title")} />
        ) : (
          <ul className="list-none space-y-1.5">
            {items.map((item) => {
              const status = stockStatus(item);
              const current = Number(item.currentStock ?? 0);
              const threshold = Number(item.reorderThreshold ?? 0);
              const scaleMax = Math.max(threshold * 2, current, 1);
              return (
                <li key={item._id} className="rounded-xl border border-(--bd) bg-(--bgs) px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-(--tp)">{item.name}</span>
                        <StatusBadge config={stockConfig} status={status} size="sm" />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-(--tm)">
                        {current} {item.unit || ""}
                        {threshold > 0 ? ` · min ${threshold}` : ""}
                      </p>
                      <ProgressBar value={current} max={scaleMax} tone={status === "out" ? "danger" : status === "low" ? "warning" : "ok"} />
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="sm" variant="outline" className="rounded-lg" leftIcon={<LuPackagePlus size={12} />} onClick={() => setRefillFor(item)}>
                        {t("kitchen.refill")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isRound
                        ariaLabel={t("shell.edit")}
                        onClick={() =>
                          setForm({
                            ...EMPTY,
                            ...item,
                            currentStock: item.currentStock ?? "",
                            reorderThreshold: item.reorderThreshold ?? "",
                          })
                        }
                      >
                        <LuPencil size={13} />
                      </Button>
                      <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.delete")} isLoading={busy === item._id} onClick={() => remove(item)}>
                        <LuTrash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <Modal
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        header={form?._id ? t("kitchen.editItem") : t("kitchen.addItem")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setForm(null)} isDisabled={busy === "save"}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" isLoading={busy === "save"} isDisabled={busy === "save"} onClick={saveItem}>
              {t("shell.save")}
            </Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <Input size="lg" label={t("kitchen.name")} isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input size="md" label={t("kitchen.unit")} value={form.unit || ""} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              <Input size="md" label={t("kitchen.currentQty")} inputMode="decimal" value={form.currentStock ?? ""} onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))} />
              <Input size="md" label={t("kitchen.reorderThreshold")} inputMode="decimal" value={form.reorderThreshold ?? ""} onChange={(e) => setForm((f) => ({ ...f, reorderThreshold: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(refillFor)}
        onClose={() => setRefillFor(null)}
        header={t("kitchen.refillTitle", { name: refillFor?.name || "" })}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setRefillFor(null)} isDisabled={busy === "refill"}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" isLoading={busy === "refill"} isDisabled={busy === "refill" || !refillAmount} onClick={refill}>
              {t("kitchen.refill")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            size="lg"
            label={t("kitchen.quantity", { unit: refillFor?.unit || t("kitchen.unitFallback") })}
            inputMode="decimal"
            isRequired
            value={refillAmount}
            onChange={(e) => setRefillAmount(e.target.value)}
          />
          <Input size="lg" label={t("kitchen.costOptional")} inputMode="decimal" value={refillCost} onChange={(e) => setRefillCost(e.target.value)} />
          {refillCost.trim() && !parse(refillCost, { allowZero: true }).ok && (
            <p className="text-xs font-semibold text-(--danger)" role="alert">
              {errorText(parse(refillCost, { allowZero: true }).reason)}
            </p>
          )}
          {refillFor?.lastRefill && (
            <p className="text-[11px] text-(--tm)">
              {t("kitchen.lastRefill")}: {formatDay(String(refillFor.lastRefill).slice(0, 10), lang)}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
