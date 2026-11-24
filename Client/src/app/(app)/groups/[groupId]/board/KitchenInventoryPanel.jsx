"use client";

/**
 * T9.9 — Kitchen inventory: staple stock levels, add/update items and refills.
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
import { formatPoisha, parseTaka } from "@/lib/utils/format";
import { onRealtime } from "@/components/realtime/RealtimeProvider";

const STOCK_CONFIG = {
  ok: { variant: "success", label: "In stock" },
  low: { variant: "warning", label: "Low" },
  out: { variant: "danger", label: "Out" },
};

function stockStatus(item) {
  const current = Number(item.currentQuantity ?? item.quantity ?? 0);
  const threshold = Number(item.lowThreshold ?? item.reorderLevel ?? 0);
  if (current <= 0) return "out";
  if (threshold && current <= threshold) return "low";
  return "ok";
}

const EMPTY = { name: "", unit: "kg", currentQuantity: "", lowThreshold: "", lastPricePoisha: "" };

export default function KitchenInventoryPanel({ groupId, initialItems = [] }) {
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems || []);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null); // EMPTY | item being edited
  const [refillFor, setRefillFor] = useState(null);
  const [refillAmount, setRefillAmount] = useState("");
  const [refillCost, setRefillCost] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.list(groupId);
      setItems(data?.items || (Array.isArray(data) ? data : []));
    } catch (ex) {
      showToast({ status: "error", title: "Could not load inventory", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    return onRealtime((event) => {
      if (event === "kitchenInventory-updated") load();
    });
  }, [load]);

  const saveItem = async () => {
    if (!form?.name?.trim()) {
      showToast({ status: "warning", title: "Item name is required" });
      return;
    }
    setBusy("save");
    const payload = {
      name: form.name.trim(),
      unit: form.unit || "kg",
      currentQuantity: form.currentQuantity === "" ? undefined : Number(form.currentQuantity),
      lowThreshold: form.lowThreshold === "" ? undefined : Number(form.lowThreshold),
      lastPricePoisha: form.lastPricePoisha === "" ? undefined : parseTaka(form.lastPricePoisha),
    };
    try {
      if (form._id) await inventoryApi.updateItem(groupId, form._id, payload);
      else await inventoryApi.addItem(groupId, payload);
      showToast({ status: "success", title: form._id ? "Item updated" : "Item added" });
      setForm(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not save item", description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: "Could not delete", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const refill = async () => {
    if (!refillFor || !refillAmount) return;
    setBusy("refill");
    try {
      await inventoryApi.refill(groupId, refillFor._id, {
        quantity: Number(refillAmount),
        ...(refillCost ? { costPoisha: parseTaka(refillCost) } : {}),
      });
      showToast({ status: "success", title: `${refillFor.name} refilled` });
      setRefillFor(null);
      setRefillAmount("");
      setRefillCost("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not refill", description: ex?.data?.msg || ex?.message });
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
            <LuPackage size={15} className="text-(--p)" /> Kitchen stock
            {lowCount > 0 && <Badge variant="warning" size="sm">{lowCount} low</Badge>}
          </h2>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
            <Button size="sm" leftIcon={<LuPlus size={13} />} onClick={() => setForm({ ...EMPTY })}>Add</Button>
          </div>
        </div>
      }
    >
      {loading && items.length === 0 ? (
        <Skeleton variant="rect" height={64} />
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-(--tm)">No staples tracked yet. Add rice, oil, lentils…</p>
      ) : (
        <ul className="list-none space-y-1">
          {items.map((item) => {
            const status = stockStatus(item);
            return (
              <li key={item._id} className="flex min-h-11 flex-wrap items-center gap-2 rounded-md bg-(--bgm) px-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-(--tp)">{item.name}</span>
                  <span className="block text-[11px] text-(--tm)">
                    {item.currentQuantity ?? item.quantity ?? 0} {item.unit || ""}
                    {item.lastPricePoisha ? ` · ${formatPoisha(item.lastPricePoisha)}` : ""}
                  </span>
                </span>
                <StatusBadge config={STOCK_CONFIG} status={status} />
                <Button size="sm" variant="outline" onClick={() => setRefillFor(item)}>Refill</Button>
                <Button size="sm" variant="ghost" isRound ariaLabel="Edit" onClick={() => setForm({ ...EMPTY, ...item, lastPricePoisha: item.lastPricePoisha ? String(item.lastPricePoisha / 100) : "" })}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" isRound ariaLabel="Delete" isLoading={busy === item._id} onClick={() => remove(item)}>
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
        header={form?._id ? "Edit stock item" : "Add stock item"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)} isDisabled={busy === "save"}>Cancel</Button>
            <Button isLoading={busy === "save"} isDisabled={busy === "save"} onClick={saveItem}>Save</Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <Input size="lg" label="Name" isRequired value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input size="lg" label="Unit" value={form.unit || ""} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              <Input size="lg" label="Current qty" inputMode="decimal" value={form.currentQuantity ?? ""} onChange={(e) => setForm((f) => ({ ...f, currentQuantity: e.target.value }))} />
              <Input size="lg" label="Low threshold" inputMode="decimal" value={form.lowThreshold ?? ""} onChange={(e) => setForm((f) => ({ ...f, lowThreshold: e.target.value }))} />
              <Input size="lg" label="Last price ৳" inputMode="decimal" value={form.lastPricePoisha ?? ""} onChange={(e) => setForm((f) => ({ ...f, lastPricePoisha: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(refillFor)}
        onClose={() => setRefillFor(null)}
        header={`Refill ${refillFor?.name || ""}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefillFor(null)} isDisabled={busy === "refill"}>Cancel</Button>
            <Button isLoading={busy === "refill"} isDisabled={busy === "refill" || !refillAmount} onClick={refill}>Refill</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input size="lg" label={`Quantity (${refillFor?.unit || "unit"})`} inputMode="decimal" isRequired value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} />
          <Input size="lg" label="Cost ৳ (optional)" inputMode="decimal" value={refillCost} onChange={(e) => setRefillCost(e.target.value)} />
        </div>
      </Modal>
    </Card>
  );
}
