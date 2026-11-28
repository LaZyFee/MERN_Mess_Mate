"use client";

/**
 * Shared bazar (shopping) list with one-tap conversion to an expense draft.
 * Money typed as Taka, stored as integer poisha (`estimatedPricePoisha`).
 *
 * Mobile-first: the add row stacks; items are tappable rows with an inline
 * price field; the convert CTA is full-width.
 */
import { useCallback, useEffect, useState } from "react";
import { LuListChecks, LuPlus, LuReceipt, LuRefreshCw, LuTrash2, LuShoppingBasket } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { shoppingApi } from "@/lib/api/routines";
import { dhakaToday } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { onRealtime } from "@/components/realtime/RealtimeProvider";
import { EmptyState, MiniStat, SectionCard } from "../GroupUI";

function itemsOf(list) {
  return list?.items || [];
}

export default function ShoppingListPanel({ groupId, initialList = null, initialHistory = [], categories = [], canConvert = false }) {
  const t = useT();
  const { fmt, n, parse } = useMoney();
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
      showToast({ status: "error", title: t("board.shopping"), description: ex?.data?.msg || ex?.message });
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
        estimatedPricePoisha: parsed?.poisha,
      });
      setName("");
      setQuantity("");
      setPrice("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("board.shopping"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: t("board.shopping"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: t("board.shopping"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "error", title: t("board.shopping"), description: ex?.data?.msg || ex?.message });
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
      showToast({ status: "success", title: res?.expense?.status || t("exp.draftCreated") });
      setConvertForm({ categoryId: "", date: dhakaToday(), supplierName: "" });
      setBusy(null);
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("board.shopping"), description: ex?.data?.msg || ex?.message });
    } finally {
      setConverting(false);
    }
  };

  const items = itemsOf(list);
  const openCount = items.filter((item) => !item.checked).length;
  const estimate = items.reduce((sum, item) => sum + (Number(item.estimatedPricePoisha) || 0), 0);
  const categoryOptions = [
    { value: "", label: t("board.shopping") },
    ...categories.map((category) => ({ value: category._id, label: category.name })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <SectionCard
        icon={LuShoppingBasket}
        title={t("board.shopping")}
        subtitle={`${n(openCount)} · ${fmt(estimate)}`}
        actions={
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_82px_104px_auto] sm:items-end">
          <div className="col-span-2 sm:col-span-1">
            <Input size="md" label={t("board.item")} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("board.itemPlaceholder")} />
          </div>
          <Input size="md" label={t("board.qty")} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={t("board.qtyPlaceholder")} />
          <Input size="md" label={t("board.estTaka")} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" />
          <Button
            size="md"
            className="col-span-2 rounded-xl sm:col-span-1"
            leftIcon={<LuPlus size={14} />}
            isLoading={busy === "add"}
            isDisabled={!name.trim() || busy === "add"}
            onClick={addItem}
          >
            {t("shell.add")}
          </Button>
        </div>

        <div className="mt-3">
          {loading && items.length === 0 ? (
            <Skeleton variant="rect" height={64} className="rounded-xl" />
          ) : items.length === 0 ? (
            <EmptyState icon={LuListChecks} title={t("board.listEmpty") || t("shell.noResults")} body={t("board.shopping")} />
          ) : (
            <ul className="list-none space-y-1">
              {items.map((item) => (
                <li
                  key={item._id}
                  className={`flex min-h-12 flex-wrap items-center gap-2 rounded-xl border px-2 py-1.5 ${item.checked ? "border-(--bd) bg-(--bgm)" : "border-(--bd) bg-(--bgs)"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(item.checked)}
                    onChange={() => toggle(item)}
                    aria-label={t(item.checked ? "board.markNotBought" : "board.markBought", { name: item.name })}
                    className="size-5 shrink-0 accent-(--p)"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[13px] font-semibold ${item.checked ? "text-(--tl) line-through" : "text-(--ts)"}`}>
                      {item.name}
                    </span>
                    <span className="block truncate text-[11px] text-(--tm)">
                      {item.quantity || "—"}
                      {item.estimatedPricePoisha ? ` · ~${fmt(item.estimatedPricePoisha)}` : ""}
                    </span>
                  </span>
                  <div className="w-[86px] shrink-0">
                    <Input
                      size="sm"
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
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <MiniStat label={t("board.shopping")} value={n(openCount)} />
          <MiniStat label={t("board.estimated")} value={fmt(estimate)} tone="success" />
        </div>

        {canConvert && items.length > 0 && (
          <Button
            size="md"
            className="mt-2 rounded-xl"
            isFullWidth
            leftIcon={<LuReceipt size={14} />}
            onClick={() => setBusy("openConvert")}
          >
            {t("board.convertToExpense") || t("exp.newDraft")}
          </Button>
        )}
      </SectionCard>

      {history.length > 0 && (
        <SectionCard icon={LuListChecks} title={t("board.recentLists") || t("board.shopping")}>
          <ul className="list-none space-y-1">
            {history.slice(0, 5).map((row) => (
              <li key={row._id} className="flex min-h-9 items-center justify-between gap-2 rounded-lg bg-(--bgm) px-2.5 text-xs">
                <span className="truncate text-(--ts)">
                  {row.title || t("board.itemsCount", { count: itemsOf(row).length })}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-(--tm)">{fmt(row.totalPoisha || 0)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Modal
        isOpen={busy === "openConvert"}
        onClose={() => setBusy(null)}
        header={t("board.convertToExpense") || t("exp.newDraft")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" isFullWidth className="sm:!w-fit" onClick={() => setBusy(null)} isDisabled={converting}>
              {t("shell.cancel")}
            </Button>
            <Button isFullWidth className="sm:!w-fit" isLoading={converting} isDisabled={converting} onClick={convert}>
              {t("exp.newDraft")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="rounded-xl bg-(--bgm) px-3 py-2 text-xs text-(--tm)">
            {n(openCount)} · {fmt(estimate)}
          </p>
          <Input size="lg" type="date" label={t("exp.date")} value={convertForm.date} onChange={(event) => setConvertForm((f) => ({ ...f, date: event.target.value }))} />
          <Input size="lg" label={t("exp.supplier")} value={convertForm.supplierName} onChange={(event) => setConvertForm((f) => ({ ...f, supplierName: event.target.value }))} />
          <Select
            size="lg"
            label={t("exp.category")}
            options={categoryOptions}
            value={convertForm.categoryId}
            onChange={(event) => setConvertForm((f) => ({ ...f, categoryId: event.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
