"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LuFilter,
  LuPlus,
  LuReceipt,
  LuRefreshCw,
  LuFileSpreadsheet,
  LuX,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Tabs, { TabList, Tab, TabPanels, TabPanel } from "@/components/shared/Tabs";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { expensesApi } from "@/lib/api/expenses";
import { useT } from "@/lib/i18n/LangProvider";
import ExpenseCard from "./ExpenseCard";
import ExpenseDraftForm from "./ExpenseDraftForm";
import LegacyExpensePanel from "./LegacyExpensePanel";
import ExpenseImportWizard from "./ExpenseImportWizard";

const STATUS_VALUES = ["", "draft", "submitted", "approved", "rejected", "reversed"];
const TREASURER_ROLES = ["owner", "manager", "treasurer"];

export default function ExpensesClient({
  groupId,
  initialGroup,
  initialExpensePage,
  initialCategories = [],
  initialMemberships = [],
}) {
  const t = useT();
  const { showToast } = useToast();
  const storeRole = useGroupStore((s) => s.myRole);
  const userId = useAuthStore((s) => s.user?._id);
  const group = initialGroup;
  const myMembership = useMemo(
    () => (group?.memberships || []).find((m) => String(m.userId?._id || m.userId) === String(userId)),
    [group, userId],
  );
  const role = storeRole || group?.myRole || myMembership?.role || "member";
  const canTreasurer = TREASURER_ROLES.includes(role);

  const [tab, setTab] = useState("list");
  const [expenses, setExpenses] = useState(initialExpensePage?.expenses ?? []);
  const [nextCursor, setNextCursor] = useState(initialExpensePage?.nextCursor || null);
  const [hasMore, setHasMore] = useState(Boolean(initialExpensePage?.hasMore));
  const [status, setStatus] = useState("");
  const [costPeriod, setCostPeriod] = useState("");
  const [payable, setPayable] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const statusOptions = useMemo(
    () => STATUS_VALUES.map((value) => ({ value, label: value ? t(`exp.${value}`) : t("exp.allStatuses") })),
    [t],
  );
  const payableOptions = useMemo(
    () => [
      { value: "", label: t("exp.allExpenses") },
      { value: "true", label: t("exp.payableOnly") },
    ],
    [t],
  );

  const filters = useMemo(
    () => ({ status, costPeriod, payable: payable === "true" ? true : "", limit: 30 }),
    [status, costPeriod, payable],
  );
  const filtersActive = Boolean(status || costPeriod || payable);

  const load = useCallback(
    async (reset = true) => {
      setLoading(reset);
      setLoadingMore(!reset);
      try {
        const data = await expensesApi.list(
          groupId,
          reset ? filters : { ...filters, cursor: nextCursor },
        );
        const page = Array.isArray(data?.expenses) ? data.expenses : [];
        setExpenses((current) => (reset ? page : [...current, ...page]));
        setNextCursor(data?.nextCursor || null);
        setHasMore(Boolean(data?.hasMore));
      } catch (error) {
        showToast({
          status: "error",
          title: t("exp.couldNotLoad"),
          description: error?.data?.msg || error?.message,
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [groupId, filters, nextCursor, showToast, t],
  );

  const resetFilters = () => {
    setStatus("");
    setCostPeriod("");
    setPayable("");
    setNextCursor(null);
  };

  const afterCreate = () => {
    setTab("list");
    load(true);
  };

  return (
    <div className="min-w-0 space-y-4">
      <Tabs value={tab} onChange={setTab} variant="solid-rounded" size="lg" isFitted>
        <TabList className="overflow-x-auto">
          <Tab value="list">{t("exp.all")}</Tab>
          <Tab value="new">{t("exp.newDraft")}</Tab>
          {canTreasurer && <Tab value="advanced">{t("exp.advanced")}</Tab>}
        </TabList>

        <TabPanels className="mt-4">
          <TabPanel value="list">
            <div className="min-w-0 space-y-3">
              <Card padding="sm" variant="outlined">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Select
                    size="lg"
                    label={t("exp.status")}
                    options={statusOptions}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  />
                  <Input
                    size="lg"
                    type="month"
                    label={t("exp.costPeriod")}
                    value={costPeriod}
                    onChange={(event) => setCostPeriod(event.target.value)}
                  />
                  <Select
                    size="lg"
                    label={t("exp.payment")}
                    options={payableOptions}
                    value={payable}
                    onChange={(event) => setPayable(event.target.value)}
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="lg"
                    isFullWidth
                    leftIcon={<LuFilter size={15} />}
                    isLoading={loading}
                    onClick={() => load(true)}
                  >
                    {t("exp.applyFilters")}
                  </Button>
                  {filtersActive && (
                    <Button
                      variant="ghost"
                      size="lg"
                      leftIcon={<LuX size={15} />}
                      onClick={() => {
                        resetFilters();
                      }}
                    >
                      {t("exp.clear")}
                    </Button>
                  )}
                </div>
              </Card>

              {loading && expenses.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((key) => (
                    <Skeleton key={key} variant="rect" height={84} />
                  ))}
                </div>
              ) : expenses.length === 0 ? (
                <Card variant="outlined">
                  <div className="flex flex-col items-center py-8 text-center">
                    <LuReceipt size={28} className="mb-3 text-(--tm)" />
                    <p className="font-semibold text-(--tp)">{t("exp.none")}</p>
                    <p className="mt-1 text-sm text-(--tm)">
                      {filtersActive ? t("exp.noneFiltered") : t("exp.noneEmpty")}
                    </p>
                    {!filtersActive && (
                      <Button size="md" className="mt-4" leftIcon={<LuPlus size={15} />} onClick={() => setTab("new")}>
                        {t("exp.newDraft")}
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <ExpenseCard
                      key={expense._id}
                      groupId={groupId}
                      expense={expense}
                      canTreasurer={canTreasurer}
                      onChanged={() => load(true)}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<LuRefreshCw size={14} />}
                  isLoading={loading}
                  onClick={() => load(true)}
                >
                  {t("exp.refresh")}
                </Button>
                <div className="flex items-center gap-2">
                  {canTreasurer && (
                    <Button variant="outline" size="sm" leftIcon={<LuFileSpreadsheet size={13} />} onClick={() => setImportOpen(true)}>
                      {t("exp.import")}
                    </Button>
                  )}
                  {hasMore && (
                    <Button
                      variant="outline"
                      size="md"
                      isLoading={loadingMore}
                      onClick={() => load(false)}
                    >
                      {t("shell.loadMore")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel value="new">
            <Card padding="md">
              <h2 className="mb-3 text-base font-bold text-(--tp)">{t("exp.draftForm")}</h2>
              <ExpenseDraftForm
                groupId={groupId}
                categories={initialCategories}
                memberships={initialMemberships}
                myMembershipId={myMembership?._id || ""}
                onCreated={afterCreate}
              />
            </Card>
          </TabPanel>

          {canTreasurer && (
            <TabPanel value="advanced">
              <LegacyExpensePanel
                groupId={groupId}
                categories={initialCategories}
                onChanged={() => load(true)}
              />
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      <ExpenseImportWizard
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        groupId={groupId}
        onImported={() => load(true)}
      />
    </div>
  );
}
