"use client";

import Link from "next/link";
import { LuArrowRight, LuBanknote, LuReceipt, LuUsers, LuWallet } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMonth, formatPoisha } from "@/lib/utils/format";
import BoardWidget from "./BoardWidget";

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
  const dash = initialDash || {};
  const month = dash.month;
  const period = dash.period || {};
  const expenses = dash.expenses || {};
  const money = dash.money || {};
  const funds = dash.funds || {};
  const settlement = dash.settlement;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-(--tm)">
            {month ? formatMonth(month) : "Current month"}
          </p>
          <p className="truncate text-sm text-(--ts)">
            {dash.activeMembersCount ?? 0} active member(s) · revision {period.revision ?? 0}
          </p>
        </div>
        <StatusBadge type="period" status={period.state || "open"} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyStat
          icon={LuReceipt}
          label="Approved expenses"
          value={formatPoisha(expenses.approved?.totalPoisha)}
          hint={`${expenses.approved?.count ?? 0} approved`}
        />
        <MoneyStat
          icon={LuBanknote}
          label="Contributions"
          value={formatPoisha(money.totalContributionsPoisha)}
          hint={money.pendingTransactions?.count ? `${money.pendingTransactions.count} pending` : "All confirmed"}
        />
        <MoneyStat
          icon={LuWallet}
          label="Fund assets"
          value={formatPoisha(funds.totalAssetsPoisha)}
          hint={`${funds.accounts?.length ?? 0} fund account(s)`}
        />
        <MoneyStat
          icon={LuUsers}
          label="Payables outstanding"
          value={formatPoisha(expenses.payablesOutstanding?.totalPoisha)}
          hint={`${expenses.payablesOutstanding?.count ?? 0} supplier bill(s)`}
        />
        <MoneyStat
          icon={LuReceipt}
          label="Awaiting approval"
          value={formatPoisha(expenses.submitted?.totalPoisha)}
          hint={`${expenses.submitted?.count ?? 0} submitted · ${expenses.draft?.count ?? 0} draft`}
        />
        <MoneyStat
          icon={LuWallet}
          label="Meal rate"
          value={settlement?.mealRatePoisha != null ? formatPoisha(settlement.mealRatePoisha) : "—"}
          hint={`${settlement?.totalMeals ?? 0} meals`}
        />
      </div>

      <BoardWidget groupId={groupId} initialBoard={initialBoard} />

      <Card padding="md" className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-(--tp)">
            {settlement?.isFinalized ? `Statement v${settlement.version}` : "Draft settlement"}
          </h2>
          <Link
            href={`/groups/${groupId}/statements`}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-(--p) hover:bg-(--pale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
          >
            Statements <LuArrowRight size={13} />
          </Link>
        </div>
        {(settlement?.items || []).length === 0 ? (
          <p className="mt-2 text-xs text-(--tm)">No member charges computed for this month yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-(--bd)">
            {settlement.items.slice(0, 6).map((item) => (
              <li key={item.membershipId} className="flex min-h-11 items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate text-xs font-semibold text-(--tp)">{item.displayName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-(--ts)">{formatPoisha(item.closingCreditPoisha)}</span>
                  <StatusBadge type="statement_item" status={item.status || "settled"} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href={`/groups/${groupId}/expenses`} size="md" variant="secondary" leftIcon={<LuReceipt size={14} />}>
            Expenses
          </Button>
          <Button href={`/groups/${groupId}/money`} size="md" variant="outline" leftIcon={<LuBanknote size={14} />}>
            Money
          </Button>
        </div>
      </Card>
    </div>
  );
}
