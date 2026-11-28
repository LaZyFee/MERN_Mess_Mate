"use client";

/**
 * Money tab — balance, ledger list, new transaction, fund accounts.
 * Mobile-first: segmented views instead of a tab bar + panels, filter sheet that
 * collapses, and an empty state with a direct CTA.
 */
import { useCallback, useMemo, useState } from "react";
import { LuBanknote, LuList, LuPlus, LuWallet, LuFilter, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { moneyApi } from "@/lib/api/money";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { SegmentedControl, SectionCard, EmptyState } from "../GroupUI";
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
  const { fmt, n } = useMoney();
  const { showToast } = useToast();
  const role = useGroupStore((s) => s.myRole) || initialGroup?.myRole || "member";
  const userId = useAuthStore((s) => s.user?._id);
  const canTreasurer = TREASURER_ROLES.includes(role);

  const membershipId = useMemo(() => {
    if (myMembershipId) return myMembershipId;
    const mine = initialMemberships.find((m) => String(m.userId?._id || m.userId) === String(userId));
    return mine?._id || null;
  }, [initialMemberships, myMembershipId, userId]);

  const [view, setView] = useState("list");
  const [transactions, setTransactions] = useState(initialPage?.transactions ?? []);
  const [nextCursor, setNextCursor] = useState(initialPage?.nextCursor || null);
  const [hasMore, setHasMore] = useState(Boolean(initialPage?.hasMore));
  const [funds, setFunds] = useState(initialFunds);
  const [balance, setBalance] = useState(initialBalance);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const refresh = useCallback(
    async (reset = true, overrides = {}) => {
      const nextStatus = overrides.status ?? status;
      const nextKind = overrides.kind ?? kind;
      const query = {
        status: nextStatus || undefined,
        kind: nextKind || undefined,
        limit: 25,
        ...(reset || !nextCursor ? {} : { cursor: nextCursor }),
      };
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const data = await moneyApi.list(groupId, query);
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
    },
    [groupId, membershipId, nextCursor, showToast, t, status, kind],
  );

  const applyFilters = (patch = {}) => {
    const nextStatus = patch.status ?? status;
    const nextKind = patch.kind ?? kind;
    setStatus(nextStatus);
    setKind(nextKind);
    setNextCursor(null);
    refresh(true, { status: nextStatus, kind: nextKind });
  };

  const afterChange = () => {
    setNextCursor(null);
    refresh(true);
  };

  const fundTotal = useMemo(
    () => funds.reduce((sum, fund) => sum + Number(fund.balancePoisha || 0), 0),
    [funds],
  );
  const activeFilterCount = (status ? 1 : 0) + (kind ? 1 : 0);

  return (
    <div className="min-w-0 space-y-3">
      {membershipId && balance && <MyBalanceCard balance={balance} />}

      <SegmentedControl
        ariaLabel={t("money.transactions")}
        value={view}
        onChange={setView}
        options={[
          { value: "list", label: t("money.transactions"), icon: LuList },
          { value: "new", label: t("money.new"), icon: LuPlus },
          { value: "funds", label: t("money.funds"), icon: LuWallet },
        ]}
      />

      {view === "list" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${filtersOpen || activeFilterCount
                  ? "border-(--p) bg-(--pale) text-(--p)"
                  : "border-(--bd) bg-(--bgs) text-(--ts)"
                }`}
            >
              <LuFilter size={14} />
              {t("exp.status")}
              {activeFilterCount > 0 && (
                <span className="grid size-4 place-items-center rounded-full bg-(--p) text-[9px] font-bold text-(--bgs)">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <Button
              size="sm"
              variant="ghost"
              isRound
              ariaLabel={t("shell.refresh")}
              isLoading={loading}
              onClick={() => {
                setNextCursor(null);
                refresh(true);
              }}
            >
              <LuRefreshCw size={15} />
            </Button>
            <p className="ml-auto text-[11px] font-semibold text-(--tm)">
              {n(transactions.length)} · {fmt(transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0))}
            </p>
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-(--bd) bg-(--bgs) p-3 sm:grid-cols-2">
              <Select
                size="md"
                label={t("exp.status")}
                options={statusOptions}
                value={status}
                onChange={(e) => applyFilters({ status: e.target.value })}
              />
              <Select
                size="md"
                label={t("money.kind")}
                options={kindOptions}
                value={kind}
                onChange={(e) => applyFilters({ kind: e.target.value })}
              />
            </div>
          )}

          {loading && transactions.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} variant="rect" height={80} className="rounded-2xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-2xl border border-(--bd) bg-(--bgs)">
              <EmptyState
                icon={LuBanknote}
                title={t("money.noTransactions")}
                body={t("money.noTransactionsHint")}
                action={
                  <Button size="md" leftIcon={<LuPlus size={15} />} onClick={() => setView("new")}>
                    {t("money.new")}
                  </Button>
                }
              />
            </div>
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
            <Button
              variant="outline"
              size="md"
              isFullWidth
              className="rounded-xl"
              isLoading={loadingMore}
              onClick={() => refresh(false)}
            >
              {t("shell.loadMore")}
            </Button>
          )}
        </>
      )}

      {view === "new" && (
        <SectionCard icon={LuWallet} title={t("money.submit")} subtitle={t("money.note")}>
          <TransactionForm
            groupId={groupId}
            memberships={initialMemberships}
            funds={funds}
            onCreated={() => {
              setView("list");
              afterChange();
            }}
          />
        </SectionCard>
      )}

      {view === "funds" && (
        <SectionCard
          icon={LuWallet}
          title={t("money.fundAccounts")}
          subtitle={`${t("money.totalBalance")} · ${fmt(fundTotal)}`}
        >
          <FundsPanel
            groupId={groupId}
            funds={funds}
            memberships={initialMemberships}
            role={role}
            onChanged={afterChange}
          />
        </SectionCard>
      )}
    </div>
  );
}
