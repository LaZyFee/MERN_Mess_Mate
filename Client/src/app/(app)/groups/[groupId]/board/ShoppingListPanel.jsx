"use client";

/**
 * T9.8 — Shared bazar (shopping) list with a one-tap conversion to an expense
 * draft. History of converted lists is shown underneath.
 *
 * Money: users type Taka; the API field is `estimatedPricePoisha` (integer poisha).
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
import { dhakaToday } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { onRealtime } from "@/components/realtime/RealtimeProvider";

function itemsOf(list) {
  return list?.items || [];
}

export default function ShoppingListPanel({ groupId, initialList = null, initialHistory = [], categories = [], canConvert = false }) {
  const t = useT();
  const { fmt, parse } = useMoney();
  const { showToast } = useToast();
  const [list, setList] = useState(initialList);
  const [history, setHistory] = useState(initialHistory || []);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
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
      showToast({ status: "error", title: t("board.couldNotLoadShopping"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

  useEffect(() => {
    return onRealtime((event) => {
      if (event === "shoppingList-updated") load();
    });
  }, [load]);

  const addItem = async () => {
    if (!name.trim()) return;
    const parsed = price.trim() ? parse(price) : null;
    if (parsed && !parsed.ok) {
      showToast({ status: "warning", title: t(`money.err.${parsed.reason}`) });
      return;
    }
    setBusy("add");
    try {
      await shoppingApi.addItem(groupId, {
        name: name.trim(),
        quantity: quantity.trim() || undefined,
        estimatedPricePoisha: parsed?.poisha, // Taka → integer poisha
      });
      setName("");
      setQuantity("");
      setPrice("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("board.couldNotAddItem"), description: ex?.data?.msg || ex?.message });
    } finally {
      setBusy(null);
    }
  };

  const updatePrice = async (item, value) => {
    const parsed = parse(value);
    if (!parsed.ok) {
      showToast({ status: "warning", title: t(`money.err.${parsed.reason}`) });
      return;
    }
    setBusy(item._id);
    try {
      await shoppingApi.updateItem(groupId, item._id, { estimatedPricePoisha: parsed.poisha });
      setList((prev) => ({
        ...prev,
        items: itemsOf(prev).map((row) => (row._id === item._id ? { ...row, estimatedPricePoisha: parsed.poisha } : row)),
      }));
    } catch (ex) {
      showToast({ status: "error", title: t("board.couldNotUpdateItem"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: t("board.couldNotUpdateItem"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: t("board.couldNotRemoveItem"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "success", title: t("board.expenseDraftCreated", { status: res?.expense?.status || "" }) });
      setConvertForm({ categoryId: "", date: dhakaToday(), supplierName: "" });
      setBusy("convert");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("board.couldNotConvert"), description: ex?.data?.msg || ex?.message });
    } finally {
      setConverting(false);
      setBusy(null);
    }
  };

  const items = itemsOf(list);
  const openCount = items.filter((item) => !item.checked).length;
  // Sum of integer-poisha estimates — no float maths.
  const estimate = items.reduce((sum, item) => sum + (Number(item.estimatedPricePoisha) || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <Card
        padding="md"
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-(--tp)">
              <LuListChecks size={15} className="text-(--p)" /> {t("board.shopping")}
            </h2>
            <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
              <LuRefreshCw size={14} />
            </Button>
          </div>
        }
      >
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input size="lg" label={t("board.item")} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("board.itemPlaceholder")} />
          <Input size="lg" label={t("board.qty")} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={t("board.qtyPlaceholder")} />
          <Input size="lg" label={t("board.estTaka")} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
          <Button size="lg" leftIcon={<LuPlus size={14} />} isLoading={busy === "add"} isDisabled={!name.trim() || busy === "add"} onClick={addItem}>
            {t("shell.add")}
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <Skeleton variant="rect" height={64} />
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-(--tm)">{t("board.listEmpty")}</p>
        ) : (
          <ul className="list-none space-y-1">
            {items.map((item) => (
              <li key={item._id} className="flex min-h-11 flex-wrap items-center gap-2 rounded-md bg-(--bgm) px-2">
                <input
                  type="checkbox"
                  checked={Boolean(item.checked)}
                  onChange={() => toggle(item)}
                  aria-label={t(item.checked ? "board.markNotBought" : "board.markBought", { name: item.name })}
                  className="size-5 shrink-0 accent-(--p)"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${item.checked ? "text-(--tl) line-through" : "text-(--ts)"}`}>{item.name}</span>
                  <span className="block text-[11px] text-(--tm)">
                    {item.quantity || "—"}
                    {item.estimatedPricePoisha ? ` · ~${fmt(item.estimatedPricePoisha)}` : ""}
                  </span>
                </span>
                <div className="w-24 shrink-0">
                  <Input
                    size="md"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    aria-label={t("board.priceFor", { name: item.name })}
                    placeholder="0.00"
                    defaultValue={item.estimatedPricePoisha ? String(item.estimatedPricePoisha / 100) : ""}
                    onBlur={(event) => {
                      const value = event.target.value;
                      if (value.trim()) updatePrice(item, value);
                    }}
                  />
                </div>
                <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.delete")} isLoading={busy === item._id} onClick={() => removeItem(item)}>
                  <LuTrash2 size={13} />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--bd) pt-2">
          <p className="text-[11px] text-(--tm)">{t("board.listSummary", { open: openCount, estimate: fmt(estimate) })}</p>
          {canConvert && items.length > 0 && (
            <Button size="sm" leftIcon={<LuReceipt size={13} />} onClick={() => setBusy("openConvert")}>
              {t("board.convertToExpense")}
            </Button>
          )}
        </div>
      </Card>

      {history.length > 0 && (
        <Card padding="md" header={<h2 className="text-sm font-bold text-(--tp)">{t("board.recentLists")}</h2>}>
          <ul className="list-none space-y-1">
            {history.slice(0, 5).map((row) => (
              <li key={row._id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-(--ts)">{row.title || t("board.itemsCount", { count: itemsOf(row).length })}</span>
                <span className="shrink-0 tabular-nums text-(--tm)">{fmt(row.totalPoisha || 0)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        isOpen={busy === "openConvert"}
        onClose={() => setBusy(null)}
        header={t("board.createExpenseDraft")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBusy(null)} isDisabled={converting}>{t("shell.cancel")}</Button>
            <Button isLoading={converting} isDisabled={converting} onClick={convert}>{t("board.createDraft")}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-(--tm)">{t("board.convertSummary", { open: openCount, estimate: fmt(estimate) })}</p>
          <Input size="lg" type="date" label={t("exp.date")} value={convertForm.date} onChange={(event) => setConvertForm((f) => ({ ...f, date: event.target.value }))} />
          <Input size="lg" label={t("exp.supplier")} value={convertForm.supplierName} onChange={(event) => setConvertForm((f) => ({ ...f, supplierName: event.target.value }))} />
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-(--tm)">{t("exp.category")}</span>
            <select
              value={convertForm.categoryId}
              onChange={(event) => setConvertForm((f) => ({ ...f, categoryId: event.target.value }))}
              className="min-h-11 w-full rounded-lg border border-(--bd) bg-(--bgs) px-2 text-base text-(--ts)"
            >
              <option value="">{t("board.defaultBazarCategory")}</option>
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
