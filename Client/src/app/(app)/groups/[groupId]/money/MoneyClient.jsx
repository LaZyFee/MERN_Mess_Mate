"use client";

import { useCallback, useMemo, useState } from "react";
import { LuBanknote, LuList, LuPlus, LuWallet } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import Tabs, { TabList, Tab, TabPanels, TabPanel } from "@/components/shared/Tabs";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { moneyApi } from "@/lib/api/money";
import { useT } from "@/lib/i18n/LangProvider";
import TransactionForm from "./TransactionForm";
import TransactionCard from "./TransactionCard";
import FundsPanel from "./FundsPanel";
import MyBalanceCard from "./MyBalanceCard";

const STATUS_VALUES = ["", "submitted", "confirmed", "rejected", "reversed"];
const KIND_VALUES = ["", "contribution", "payout", "supplier_payment", "member_settlement", "transfer", "fee"];

const TREASURER_ROLES = ["owner", "manager", "treasurer"];

export default function MoneyClient({
  groupId,
  initialGroup,
  initialMemberships = [],
  initialPage,
  initialFunds = [],
  initialBalance,
  myMembershipId,
}) {
  const t = useT();
  const { showToast } = useToast();
  const role = useGroupStore((s) => s.myRole) || initialGroup?.myRole || "member";
  const userId = useAuthStore((s) => s.user?._id);
  const canTreasurer = TREASURER_ROLES.includes(role);

  const membershipId = useMemo(() => {
    if (myMembershipId) return myMembershipId;
    const mine = initialMemberships.find((m) => String(m.userId?._id || m.userId) === String(userId));
    return mine?._id || null;
  }, [initialMemberships, myMembershipId, userId]);

  const [tab, setTab] = useState("list");
  const [transactions, setTransactions] = useState(initialPage?.transactions ?? []);
  const [nextCursor, setNextCursor] = useState(initialPage?.nextCursor || null);
  const [hasMore, setHasMore] = useState(Boolean(initialPage?.hasMore));
  const [funds, setFunds] = useState(initialFunds);
  const [balance, setBalance] = useState(initialBalance);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const statusOptions = useMemo(
    () => STATUS_VALUES.map((value) => ({ value, label: value ? t(`status.${value}`) : t("exp.allStatuses") })),
    [t],
  );
  const kindOptions = useMemo(
    () => KIND_VALUES.map((value) => ({ value, label: value ? t(`money.kind.${value}`) : t("money.allKinds") })),
    [t],
  );

  const filters = useMemo(() => ({ status, kind, limit: 25 }), [status, kind]);

  const refresh = useCallback(async (reset = true) => {
    setLoading(reset);
    setLoadingMore(!reset);
    try {
      const data = await moneyApi.list(groupId, reset ? filters : { ...filters, cursor: nextCursor });
      const page = Array.isArray(data?.transactions) ? data.transactions : [];
      setTransactions((current) => (reset ? page : [...current, ...page]));
      setNextCursor(data?.nextCursor || null);
      setHasMore(Boolean(data?.hasMore));
      if (reset) {
        const fundData = await moneyApi.funds(groupId).catch(() => null);
        if (fundData) setFunds(fundData.funds || []);
        if (membershipId) {
          const balanceData = await moneyApi.memberBalance(groupId, membershipId).catch(() => null);
          if (balanceData) setBalance(balanceData);
        }
      }
    } catch (error) {
      showToast({ status: "error", title: t("money.couldNotLoadTransactions"), description: error?.message });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, groupId, membershipId, nextCursor, showToast, t]);

  const afterChange = () => refresh(true);

  return (
    <div className="min-w-0 space-y-4">
      {membershipId && balance && <MyBalanceCard balance={balance} />}

      <Tabs value={tab} onChange={setTab} variant="solid-rounded" size="lg" isFitted>
        <TabList className="overflow-x-auto">
          <Tab value="list">{t("money.transactions")}</Tab>
          <Tab value="new">{t("money.new")}</Tab>
          <Tab value="funds">{t("money.funds")}</Tab>
        </TabList>

        <TabPanels className="mt-4">
          <TabPanel value="list">
            <div className="min-w-0 space-y-3">
              <Card padding="sm" variant="outlined">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select
                    size="lg"
                    label={t("exp.status")}
                    options={statusOptions}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <Select
                    size="lg"
                    label={t("money.kind")}
                    options={kindOptions}
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  />
                </div>
                <Button
                  size="md"
                  variant="secondary"
                  isFullWidth
                  className="mt-2"
                  leftIcon={<LuList size={14} />}
                  isLoading={loading}
                  onClick={() => refresh(true)}
                >
                  {t("exp.applyFilters")}
                </Button>
              </Card>

              {loading && transactions.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((key) => (
                    <Skeleton key={key} variant="rect" height={72} />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <Card variant="outlined">
                  <div className="flex flex-col items-center py-8 text-center">
                    <LuBanknote size={28} className="mb-3 text-(--tm)" />
                    <p className="font-semibold text-(--tp)">{t("money.noTransactions")}</p>
                    <p className="mt-1 text-sm text-(--tm)">{t("money.noTransactionsHint")}</p>
                    <Button size="md" className="mt-4" leftIcon={<LuPlus size={15} />} onClick={() => setTab("new")}>
                      {t("money.new")}
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <TransactionCard
                      key={tx._id}
                      groupId={groupId}
                      tx={tx}
                      canTreasurer={canTreasurer}
                      onChanged={afterChange}
                    />
                  ))}
                </div>
              )}

              {hasMore && (
                <Button variant="outline" size="md" isFullWidth isLoading={loadingMore} onClick={() => refresh(false)}>
                  {t("shell.loadMore")}
                </Button>
              )}
            </div>
          </TabPanel>

          <TabPanel value="new">
            <Card padding="md">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-(--tp)">
                <LuWallet size={17} className="text-(--p)" /> {t("money.submit")}
              </h2>
              <TransactionForm
                groupId={groupId}
                memberships={initialMemberships}
                funds={funds}
                onCreated={() => {
                  setTab("list");
                  afterChange();
                }}
              />
            </Card>
          </TabPanel>

          <TabPanel value="funds">
            <FundsPanel
              groupId={groupId}
              funds={funds}
              memberships={initialMemberships}
              role={role}
              onChanged={afterChange}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
