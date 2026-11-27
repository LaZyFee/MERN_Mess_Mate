"use client";

/**
 * T9.9 — Kitchen inventory: staple stock levels, add/update items and refills.
 *
 * Contract (server `KitchenItem`): { name, unit, currentStock, reorderThreshold,
 * averageConsumptionPerDay }. Refills take `costPoisha` (integer poisha → Taka in UI).
 */
import { useCallback, useEffect, useState } from "react";
import { LuPackage, LuPlus, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { inventoryApi } from "@/lib/api/routines";
import { formatDay } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { onRealtime } from "@/components/realtime/RealtimeProvider";

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

export default function KitchenInventoryPanel({ groupId, initialItems = [] }) {
  const t = useT();
  const { parse, errorText, lang } = useMoney();
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems || []);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null); // EMPTY | item being edited
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
      reorderThreshold: form.reorderThreshold === "" || form.reorderThreshold == null ? undefined : Number(form.reorderThreshold),
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
    <Card
      padding="md"
      header={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
            <LuPackage size={15} className="text-(--p)" /> {t("kitchen.title")}
            {lowCount > 0 && <Badge variant="warning" size="sm">{t("kitchen.lowCount", { count: lowCount })}</Badge>}
          </h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button size="sm" leftIcon={<LuPlus size={13} />} onClick={() => setForm({ ...EMPTY })}>{t("shell.add")}</Button>
          </div>
        </div>
      }
    >
      {loading && items.length === 0 ? (
        <Skeleton variant="rect" height={64} />
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-(--tm)">{t("kitchen.empty")}</p>
      ) : (
        <ul className="list-none space-y-1">
          {items.map((item) => {
            const status = stockStatus(item);
            return (
              <li key={item._id} className="flex min-h-11 flex-wrap items-center gap-2 rounded-md bg-(--bgm) px-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-(--tp)">{item.name}</span>
                  <span className="block text-[11px] text-(--tm)">
                    {item.currentStock ?? 0} {item.unit || ""}
                  </span>
                </span>
                <StatusBadge config={stockConfig} status={status} />
                <Button size="sm" variant="outline" onClick={() => setRefillFor(item)}>{t("kitchen.refill")}</Button>
                <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.edit")} onClick={() => setForm({ ...EMPTY, ...item, currentStock: item.currentStock ?? "", reorderThreshold: item.reorderThreshold ?? "" })}>
                  {t("shell.edit")}
                </Button>
                <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.delete")} isLoading={busy === item._id} onClick={() => remove(item)}>
                  <LuTrash2 size={13} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        header={form?._id ? t("kitchen.editItem") : t("kitchen.addItem")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)} isDisabled={busy === "save"}>{t("shell.cancel")}</Button>
            <Button isLoading={busy === "save"} isDisabled={busy === "save"} onClick={saveItem}>{t("shell.save")}</Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <Input size="lg" label={t("kitchen.name")} isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input size="lg" label={t("kitchen.unit")} value={form.unit || ""} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              <Input size="lg" label={t("kitchen.currentQty")} inputMode="decimal" value={form.currentStock ?? ""} onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))} />
              <Input size="lg" label={t("kitchen.reorderThreshold")} inputMode="decimal" value={form.reorderThreshold ?? ""} onChange={(e) => setForm((f) => ({ ...f, reorderThreshold: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(refillFor)}
        onClose={() => setRefillFor(null)}
        header={t("kitchen.refillTitle", { name: refillFor?.name || "" })}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefillFor(null)} isDisabled={busy === "refill"}>{t("shell.cancel")}</Button>
            <Button isLoading={busy === "refill"} isDisabled={busy === "refill" || !refillAmount} onClick={refill}>{t("kitchen.refill")}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input size="lg" label={t("kitchen.quantity", { unit: refillFor?.unit || t("kitchen.unitFallback") })} inputMode="decimal" isRequired value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} />
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
    </Card>
  );
}
