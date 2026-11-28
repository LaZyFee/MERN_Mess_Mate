"use client";

/**
 * Group overview — the "is everything fine?" screen.
 * Mobile-first: brand hero with the two numbers that matter (meal rate +
 * settlement), then a compact 2-up stat grid, live board, forecast and the
 * settlement preview.
 */
import Link from "next/link";
import {
  LuArrowRight,
  LuBanknote,
  LuReceipt,
  LuUsers,
  LuWallet,
  LuCircleAlert,
  LuUtensilsCrossed,
  LuFileText,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Skeleton from "@/components/shared/Skeleton";
import { formatMonth } from "@/lib/utils/format";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import BoardWidget from "./BoardWidget";
import BazarForecastCard from "./BazarForecastCard";

function StatTile({ icon: Icon, label, value, hint, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "bg-(--warning-bg) text-(--warning)"
      : tone === "danger"
        ? "bg-(--danger-bg) text-(--danger)"
        : "bg-(--pale) text-(--p)";
  return (
    <div className="min-w-0 rounded-2xl border border-(--bd) bg-(--bgs) p-3">
      <div className="flex items-center gap-1.5">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full ${toneClass}`}>
          <Icon size={13} />
        </span>
        <p className="truncate text-[10.5px] font-bold uppercase tracking-wide text-(--tm)">{label}</p>
      </div>
      <p className="mt-1.5 truncate text-[17px] font-extrabold leading-tight tabular-nums text-(--tp)">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-(--tm)">{hint}</p>}
    </div>
  );
}

function HeroQuickLink({ href, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-(--brand-fg)/10 px-3 text-[12px] font-semibold text-(--brand-fg) no-underline ring-1 ring-(--brand-fg)/15 transition-colors hover:bg-(--brand-fg)/20"
    >
      <Icon size={13} /> {label}
    </Link>
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

  const awaiting = (expenses.submitted?.count ?? 0) + (expenses.draft?.count ?? 0);
  const payables = expenses.payablesOutstanding?.totalPoisha ?? 0;
  const items = settlement?.items || [];
  const highlighted = items.slice(0, 6);

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-(--brand-bg) px-4 py-5 text-(--brand-fg) ring-1 ring-(--brand-on)/15 sm:px-6 sm:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-16 -z-10 size-52 rounded-full bg-(--brand-on) opacity-20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-12 -z-10 size-44 rounded-full bg-(--brand-on) opacity-10 blur-3xl"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-(--brand-on)">
              {month ? formatMonth(month, lang) : t("overview.currentMonth")}
            </p>
            <p className="mt-1 text-[11.5px] text-(--brand-mute)">
              {t("overview.activeMembers", { count: n(dash.activeMembersCount ?? 0) })}
              <span className="mx-1 opacity-40">·</span>
              {t("overview.revision", { n: n(period.revision ?? 0) })}
            </p>
          </div>
          <div className="shrink-0 [&_span]:!bg-(--brand-fg)/12 [&_span]:!text-(--brand-fg) [&_span]:ring-1 [&_span]:ring-(--brand-fg)/20">
            <StatusBadge type="period" status={period.state || "open"} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-(--brand-mute)">
              {t("overview.mealRate")}
            </p>
            <p className="mt-0.5 truncate text-[26px] font-black leading-none tracking-tight tabular-nums text-(--brand-on) sm:text-3xl">
              {settlement?.mealRatePoisha != null ? fmt(settlement.mealRatePoisha) : "—"}
            </p>
            <p className="mt-1 truncate text-[11px] text-(--brand-mute)">
              {t("overview.mealsCount", { count: n(settlement?.totalMeals ?? 0) })}
            </p>
          </div>
          <div className="min-w-0 border-l border-(--brand-fg)/10 pl-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-(--brand-mute)">
              {t("overview.approvedExpenses")}
            </p>
            <p className="mt-0.5 truncate text-[26px] font-black leading-none tracking-tight tabular-nums text-(--brand-fg) sm:text-3xl">
              {fmt(expenses.approved?.totalPoisha)}
            </p>
            <p className="mt-1 truncate text-[11px] text-(--brand-mute)">
              {t("overview.approvedCount", { count: n(expenses.approved?.count ?? 0) })}
            </p>
          </div>
        </div>

        {awaiting > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-(--brand-fg)/8 px-3 py-2 ring-1 ring-(--brand-on)/20">
            <LuCircleAlert size={14} className="shrink-0 text-(--brand-on)" />
            <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-(--brand-fg)">
              {t("overview.awaitingApproval")} ·{" "}
              {t("overview.awaitingDetail", {
                submitted: n(expenses.submitted?.count ?? 0),
                draft: n(expenses.draft?.count ?? 0),
              })}
            </p>
            <Link
              href={`/groups/${groupId}/expenses`}
              className="shrink-0 text-[11.5px] font-bold text-(--brand-on) no-underline"
            >
              {t("overview.expenses")}
            </Link>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <HeroQuickLink href={`/groups/${groupId}/meals`} icon={LuUtensilsCrossed} label={t("shell.meals")} />
          <HeroQuickLink href={`/groups/${groupId}/expenses`} icon={LuReceipt} label={t("overview.expenses")} />
          <HeroQuickLink href={`/groups/${groupId}/money`} icon={LuBanknote} label={t("overview.money")} />
        </div>
      </section>

      {/* ── Stat grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatTile
          icon={LuBanknote}
          label={t("overview.contributions")}
          value={fmt(money.totalContributionsPoisha)}
          hint={
            money.pendingTransactions?.count
              ? t("overview.pendingCount", { count: n(money.pendingTransactions.count) })
              : t("overview.allConfirmed")
          }
        />
        <StatTile
          icon={LuWallet}
          label={t("overview.fundAssets")}
          value={fmt(funds.totalAssetsPoisha)}
          hint={t("overview.fundAccounts", { count: n(funds.accounts?.length ?? 0) })}
        />
        <StatTile
          icon={LuUsers}
          label={t("overview.payables")}
          value={fmt(payables)}
          hint={t("overview.payablesCount", { count: n(expenses.payablesOutstanding?.count ?? 0) })}
          tone={payables > 0 ? "warning" : "default"}
        />
        <StatTile
          icon={LuReceipt}
          label={t("overview.awaitingApproval")}
          value={n(awaiting)}
          hint={t("overview.awaitingDetail", {
            submitted: n(expenses.submitted?.count ?? 0),
            draft: n(expenses.draft?.count ?? 0),
          })}
          tone={awaiting > 0 ? "warning" : "default"}
        />
      </div>

      {/* ── Live board ───────────────────────────────────────── */}
      <BoardWidget groupId={groupId} initialBoard={initialBoard} />

      <BazarForecastCard groupId={groupId} />

      {/* ── Settlement preview ───────────────────────────────── */}
      <Card padding="md" className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-(--tp)">
            <LuFileText size={15} className="shrink-0 text-(--p)" />
            <span className="truncate">
              {settlement?.isFinalized
                ? t("overview.statementVersion", { n: n(settlement.version) })
                : t("overview.draftSettlement")}
            </span>
          </h2>
          <Link
            href={`/groups/${groupId}/statements`}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-(--p) no-underline hover:bg-(--pale) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--p)"
          >
            {t("overview.statementsLink")} <LuArrowRight size={13} />
          </Link>
        </div>

        {highlighted.length === 0 ? (
          <p className="mt-3 rounded-xl bg-(--bgm) px-3 py-3 text-xs text-(--tm)">{t("overview.noCharges")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-(--bd)">
            {highlighted.map((item) => (
              <li key={item.membershipId} className="flex min-h-11 items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate text-xs font-semibold text-(--tp)">{item.displayName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums text-(--ts)">{fmt(item.closingCreditPoisha)}</span>
                  <StatusBadge type="statement_item" status={item.status || "settled"} />
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            href={`/groups/${groupId}/expenses`}
            size="md"
            variant="secondary"
            isFullWidth
            leftIcon={<LuReceipt size={14} />}
            className="rounded-xl"
          >
            {t("overview.expenses")}
          </Button>
          <Button
            href={`/groups/${groupId}/money`}
            size="md"
            variant="outline"
            isFullWidth
            leftIcon={<LuBanknote size={14} />}
            className="rounded-xl"
          >
            {t("overview.money")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Loading placeholder used by `app/(app)/groups/[groupId]/loading.jsx`. */
export function GroupOverviewSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton variant="rect" height={196} className="rounded-3xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} variant="rect" height={82} className="rounded-2xl" />
        ))}
      </div>
      <Skeleton variant="rect" height={180} className="rounded-2xl" />
    </div>
  );
}
