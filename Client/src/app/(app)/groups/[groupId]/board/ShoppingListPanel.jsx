"use client";

/**
 * T9.8 — Shared bazar (shopping) list with a one-tap conversion to an expense
 * draft. History of converted lists is shown underneath.
 */
import { useCallback, useEffect, useState } from "react";
import { LuListChecks, LuPlus, LuReceipt, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { shoppingApi } from "@/lib/api/routines";
import { dhakaToday, formatPoisha, parseTaka } from "@/lib/utils/format";
import { onRealtime } from "@/components/realtime/RealtimeProvider";

function itemsOf(list) {
  return list?.items || [];
}

export default function ShoppingListPanel({ groupId, initialList = null, initialHistory = [], categories = [], canConvert = false }) {
  const { showToast } = useToast();
  const [list, setList] = useState(initialList);
  const [history, setHistory] = useState(initialHistory || []);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(null);
  const [converting, setConverting] = useState(false);
  const [convertForm, setConvertForm] = useState({ categoryId: "", date: dhakaToday(), supplierName: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, historyData] = await Promise.all([
        shoppingApi.list(groupId),
        shoppingApi.history(groupId).catch(() => null),
      ]);
      setList(listData?.list || null);
      setHistory(historyData?.lists || historyData?.history || []);
    } catch (ex) {
      showToast({ status: "error", title: "Could not load shopping list", description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    return onRealtime((event) => {
      if (event === "shoppingList-updated") load();
    });
  }, [load]);

  const addItem = async () => {
    if (!name.trim()) return;
    setBusy("add");
    try {
      await shoppingApi.addItem(groupId, {
        name: name.trim(),
        quantity: quantity.trim() || undefined,
        estimatedPoisha: budget ? parseTaka(budget) : undefined,
      });
      setName("");
      setQuantity("");
      setBudget("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not add item", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (item) => {
    setBusy(item._id);
    try {
      await shoppingApi.updateItem(groupId, item._id, { checked: !item.checked });
      setList((prev) => ({
        ...prev,
        items: itemsOf(prev).map((row) => (row._id === item._id ? { ...row, checked: !row.checked } : row)),
      }));
    } catch (ex) {
      showToast({ status: "error", title: "Could not update item", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (item) => {
    setBusy(item._id);
    try {
      await shoppingApi.deleteItem(groupId, item._id);
      setList((prev) => ({ ...prev, items: itemsOf(prev).filter((row) => row._id !== item._id) }));
    } catch (ex) {
      showToast({ status: "error", title: "Could not remove item", description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const convert = async () => {
    setConverting(true);
    try {
      const res = await shoppingApi.toExpense(groupId, {
        categoryId: convertForm.categoryId || undefined,
        date: convertForm.date,
        supplierName: convertForm.supplierName.trim() || undefined,
      });
      showToast({ status: "success", title: `Expense draft ${res?.expense?.status || "created"}` });
      setConvertForm({ categoryId: "", date: dhakaToday(), supplierName: "" });
      setBusy("convert");
      load();
    } catch (ex) {
      showToast({ status: "error", title: "Could not convert list", description: ex?.data?.msg || ex?.message });
    } finally {
      setConverting(false);
      setBusy(null);
    }
  };

  const items = itemsOf(list);
  const openCount = items.filter((item) => !item.checked).length;
  const estimate = items.reduce((sum, item) => sum + (item.estimatedPoisha || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <Card
        padding="md"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
              <LuListChecks size={15} className="text-(--p)" /> Bazar list
            </h2>
            <Button size="sm" variant="ghost" isRound ariaLabel="Refresh" isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
          </div>
        }
      >
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input size="lg" label="Item" value={name} onChange={(event) => setName(event.target.value)} placeholder="Rice" />
          <Input size="lg" label="Qty" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="5 kg" />
          <Input size="lg" label="Est. ৳" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="0" />
          <Button size="lg" leftIcon={<LuPlus size={14} />} isLoading={busy === "add"} isDisabled={!name.trim() || busy === "add"} onClick={addItem}>
            Add
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <Skeleton variant="rect" height={64} />
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-(--tm)">The list is empty. Add the first item above.</p>
        ) : (
          <ul className="list-none space-y-1">
            {items.map((item) => (
              <li key={item._id} className="flex min-h-11 items-center gap-2 rounded-md bg-(--bgm) px-2">
                <input
                  type="checkbox"
                  checked={Boolean(item.checked)}
                  onChange={() => toggle(item)}
                  aria-label={`Mark ${item.name} ${item.checked ? "not bought" : "bought"}`}
                  className="size-5 shrink-0 accent-(--p)"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${item.checked ? "text-(--tl) line-through" : "text-(--ts)"}`}>{item.name}</span>
                  <span className="block text-[11px] text-(--tm)">
                    {item.quantity || "—"}
                    {item.estimatedPoisha ? ` · ~${formatPoisha(item.estimatedPoisha)}` : ""}
                  </span>
                </span>
                <Button size="sm" variant="ghost" isRound ariaLabel="Remove" isLoading={busy === item._id} onClick={() => removeItem(item)}>
                  <LuTrash2 size={13} />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--bd) pt-2">
          <p className="text-[11px] text-(--tm)">{openCount} open · estimate {formatPoisha(estimate)}</p>
          {canConvert && items.length > 0 && (
            <Button size="sm" leftIcon={<LuReceipt size={13} />} onClick={() => setBusy("openConvert")}>
              Convert to expense
            </Button>
          )}
        </div>
      </Card>

      {history.length > 0 && (
        <Card padding="md" header={<h2 className="text-sm font-bold text-(--tp)">Recent lists</h2>}>
          <ul className="list-none space-y-1">
            {history.slice(0, 5).map((row) => (
              <li key={row._id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-(--ts)">{row.title || `${itemsOf(row).length} items`}</span>
                <span className="shrink-0 tabular-nums text-(--tm)">{formatPoisha(row.totalPoisha || 0)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        isOpen={busy === "openConvert"}
        onClose={() => setBusy(null)}
        header="Create expense draft"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBusy(null)} isDisabled={converting}>Cancel</Button>
            <Button isLoading={converting} isDisabled={converting} onClick={convert}>Create draft</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-(--tm)">The {openCount} open items ({formatPoisha(estimate)}) become a draft expense you can review and submit.</p>
          <Input size="lg" type="date" label="Date" value={convertForm.date} onChange={(event) => setConvertForm((f) => ({ ...f, date: event.target.value }))} />
          <Input size="lg" label="Supplier" value={convertForm.supplierName} onChange={(event) => setConvertForm((f) => ({ ...f, supplierName: event.target.value }))} />
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-(--tm)">Category</span>
            <select
              value={convertForm.categoryId}
              onChange={(event) => setConvertForm((f) => ({ ...f, categoryId: event.target.value }))}
              className="min-h-11 w-full rounded-lg border border-(--bd) bg-(--bgs) px-2 text-base text-(--ts)"
            >
              <option value="">Default bazar category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
