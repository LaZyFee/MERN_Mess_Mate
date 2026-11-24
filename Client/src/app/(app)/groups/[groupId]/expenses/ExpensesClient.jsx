"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LuFilter,
  LuReceipt,
  LuRefreshCw,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Toast from "@/components/shared/Toast";
import { expensesApi } from "@/lib/api/expenses";
import { formatPoisha, formatMonth } from "@/lib/utils/format";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "reversed", label: "Reversed" },
];

const PAYABLE_OPTIONS = [
  { value: "", label: "All expenses" },
  { value: "true", label: "Payable only" },
];

function civilDate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ExpensesClient({
  groupId,
  initialExpensePage,
}) {
  const [expenses, setExpenses] = useState(initialExpensePage?.expenses ?? []);
  const [nextCursor, setNextCursor] = useState(initialExpensePage?.nextCursor || null);
  const [hasMore, setHasMore] = useState(Boolean(initialExpensePage?.hasMore));
  const [status, setStatus] = useState("");
  const [costPeriod, setCostPeriod] = useState("");
  const [payable, setPayable] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState(null);

  const filters = useMemo(
    () => ({
      status,
      costPeriod,
      payable: payable === "true" ? true : "",
      limit: 30,
    }),
    [status, costPeriod, payable],
  );

  const load = useCallback(async (reset = true) => {
    setLoading(reset);
    setLoadingMore(!reset);
    try {
      const data = await expensesApi.list(
        groupId,
        reset ? filters : { ...filters, cursor: nextCursor },
      );
      const pageExpenses = Array.isArray(data?.expenses) ? data.expenses : [];
      setExpenses((current) => reset ? pageExpenses : [...current, ...pageExpenses]);
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
    } catch (error) {
      setToast({
        type: "error",
        message: error?.message || "Could not load expenses",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, groupId, nextCursor]);

  const applyFilters = () => load(true);

  return (
    <div className="min-w-0 space-y-4">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <Card
        header={
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LuReceipt size={20} className="text-(--p)" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-(--tm)">Workflow</p>
                <h1 className="text-lg font-bold text-(--tp)">Expenses</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="lg"
              isRound
              ariaLabel="Refresh expenses"
              isLoading={loading}
              onClick={() => load(true)}
            >
              <LuRefreshCw size={18} />
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Status"
            size="lg"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(event) => setStatus(event.target.value)}
          />
          <Input
            label="Cost period"
            size="lg"
            type="month"
            value={costPeriod}
            onChange={(event) => setCostPeriod(event.target.value)}
          />
          <Select
            label="Payment"
            size="lg"
            value={payable}
            options={PAYABLE_OPTIONS}
            onChange={(event) => setPayable(event.target.value)}
          />
        </div>
        <div className="mt-3">
          <Button
            variant="secondary"
            size="lg"
            isFullWidth
            leftIcon={<LuFilter size={16} />}
            onClick={applyFilters}
          >
            Apply filters
          </Button>
        </div>
      </Card>

      {loading && expenses.length === 0 ? (
        <Card variant="outlined">
          <p className="text-sm text-(--tm)">Loading expenses…</p>
        </Card>
      ) : expenses.length === 0 ? (
        <Card variant="outlined">
          <div className="flex flex-col items-center py-8 text-center">
            <LuReceipt size={28} className="mb-3 text-(--tm)" />
            <p className="font-semibold text-(--tp)">No expenses found</p>
            <p className="mt-1 text-sm text-(--tm)">Try changing the filters.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense._id} variant="outlined" padding="sm">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="expense" status={expense.status} />
                    {expense.isPayable && (
                      <span className="rounded-full bg-(--warning-bg) px-2 py-1 text-[10px] font-bold text-(--warning)">
                        Payable
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 truncate font-bold text-(--tp)">
                    {expense.description || expense.supplierName || "Expense"}
                  </h2>
                  <p className="mt-1 text-xs text-(--tm)">
                    {civilDate(expense.date)}
                    {expense.costPeriod ? ` · ${formatMonth(expense.costPeriod)}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-right text-base font-bold tabular-nums text-(--tp)">
                  {formatPoisha(expense.amount)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          size="lg"
          isFullWidth
          isLoading={loadingMore}
          onClick={() => load(false)}
        >
          Load more
        </Button>
      )}
    </div>
  );
}
