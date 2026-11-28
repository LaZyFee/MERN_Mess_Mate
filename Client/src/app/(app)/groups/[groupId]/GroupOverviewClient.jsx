"use client";

import Link from "next/link";
import { LuArrowRight, LuBanknote, LuReceipt, LuUsers, LuWallet } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMonth } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import BoardWidget from "./BoardWidget";
import BazarForecastCard from "./BazarForecastCard";

function MoneyStat({ icon: Icon, label, value, hint }) {
  return (
    <Card padding="sm" variant="outlined" className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--pale) text-(--p)">
          <Icon size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
          <p className="truncate text-base font-extrabold tabular-nums text-(--tp)">{value}</p>
          {hint && <p className="truncate text-[11px] text-(--tm)">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function GroupOverviewClient({ initialDash, groupId, initialBoard = null }) {
  const t = useT();
  const { lang, fmt, n } = useMoney();
  const dash = initialDash || {};
  const month = dash.month;
  const period = dash.period || {};
  const expenses = dash.expenses || {};
  const money = dash.money || {};
  const funds = dash.funds || {};
  const settlement = dash.settlement;

  return (
    <div className="min-w-0 space-y-3 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">
            {month ? formatMonth(month, lang) : t("overview.currentMonth")}
          </p>
          <p className="truncate text-sm text-(--ts)">
            {t("overview.activeMembers", { count: n(dash.activeMembersCount ?? 0) })}
            {" · "}
            {t("overview.revision", { n: n(period.revision ?? 0) })}
          </p>
        </div>
        <StatusBadge type="period" status={period.state || "open"} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyStat
          icon={LuReceipt}
          label={t("overview.approvedExpenses")}
          value={fmt(expenses.approved?.totalPoisha)}
          hint={t("overview.approvedCount", { count: n(expenses.approved?.count ?? 0) })}
        />
        <MoneyStat
          icon={LuBanknote}
          label={t("overview.contributions")}
          value={fmt(money.totalContributionsPoisha)}
          hint={
            money.pendingTransactions?.count
              ? t("overview.pendingCount", { count: n(money.pendingTransactions.count) })
              : t("overview.allConfirmed")
          }
        />
        <MoneyStat
          icon={LuWallet}
          label={t("overview.fundAssets")}
          value={fmt(funds.totalAssetsPoisha)}
          hint={t("overview.fundAccounts", { count: n(funds.accounts?.length ?? 0) })}
        />
        <MoneyStat
          icon={LuUsers}
          label={t("overview.payables")}
          value={fmt(expenses.payablesOutstanding?.totalPoisha)}
          hint={t("overview.payablesCount", { count: n(expenses.payablesOutstanding?.count ?? 0) })}
        />
        <MoneyStat
          icon={LuReceipt}
          label={t("overview.awaitingApproval")}
          value={fmt(expenses.submitted?.totalPoisha)}
          hint={t("overview.awaitingDetail", {
            submitted: n(expenses.submitted?.count ?? 0),
            draft: n(expenses.draft?.count ?? 0),
          })}
        />
        <MoneyStat
          icon={LuWallet}
          label={t("overview.mealRate")}
          value={settlement?.mealRatePoisha != null ? fmt(settlement.mealRatePoisha) : "—"}
          hint={t("overview.mealsCount", { count: n(settlement?.totalMeals ?? 0) })}
        />
      </div>

      <BoardWidget groupId={groupId} initialBoard={initialBoard} />

      <BazarForecastCard groupId={groupId} />

      <Card padding="md" className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-(--tp)">
            {settlement?.isFinalized
              ? t("overview.statementVersion", { n: n(settlement.version) })
              : t("overview.draftSettlement")}
          </h2>
          <Link
            href={`/groups/${groupId}/statements`}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-(--p) hover:bg-(--pale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
          >
            {t("overview.statementsLink")} <LuArrowRight size={13} />
          </Link>
        </div>
        {(settlement?.items || []).length === 0 ? (
          <p className="mt-2 text-xs text-(--tm)">{t("overview.noCharges")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-(--bd)">
            {settlement.items.slice(0, 6).map((item) => (
              <li key={item.membershipId} className="flex min-h-11 items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate text-xs font-semibold text-(--tp)">{item.displayName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-(--ts)">{fmt(item.closingCreditPoisha)}</span>
                  <StatusBadge type="statement_item" status={item.status || "settled"} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <Button
            href={`/groups/${groupId}/expenses`}
            size="md"
            variant="secondary"
            isFullWidth
            leftIcon={<LuReceipt size={14} />}
          >
            {t("overview.expenses")}
          </Button>
          <Button
            href={`/groups/${groupId}/money`}
            size="md"
            variant="outline"
            isFullWidth
            leftIcon={<LuBanknote size={14} />}
          >
            {t("overview.money")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
