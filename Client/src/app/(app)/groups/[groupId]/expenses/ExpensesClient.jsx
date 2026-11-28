"use client";

/**
 * Expenses tab — the ledger of spending.
 *
 * Mobile-first layout:
 *  - segmented control (List / New draft / Advanced)
 *  - compact filter sheet (status + payment) that collapses into a chip
 *  - one-tap import from spreadsheet
 *  - cards expand in place; destructive actions ask for a reason in a modal
 */
import { useCallback, useMemo, useState } from "react";
import {
    LuReceipt,
    LuPlus,
    LuRefreshCw,
    LuFileSpreadsheet,
    LuSlidersHorizontal,
    LuListFilter,
    LuX,
    LuChevronDown,
    LuChevronUp,
} from "react-icons/lu";
import Button from "@/components/shared/Button";
import Select from "@/components/shared/Select";
import Checkbox from "@/components/shared/Checkbox";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { expensesApi } from "@/lib/api/expenses";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";
import { useGroupStore } from "@/lib/store/groupStore";
import { SegmentedControl, SectionCard, EmptyState } from "../GroupUI";
import ExpenseCard from "./ExpenseCard";
import ExpenseDraftForm from "./ExpenseDraftForm";
import ExpenseImportWizard from "./ExpenseImportWizard";
import LegacyExpensePanel from "./LegacyExpensePanel";
import { memberKey } from "./expenseHelpers";

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
    const { fmt, n } = useMoney();
    const { showToast } = useToast();
    const role = useGroupStore((s) => s.myRole) || initialGroup?.myRole;
    const canTreasurer = TREASURER_ROLES.includes(role);

    const [tab, setTab] = useState("list");
    const [expenses, setExpenses] = useState(
        initialExpensePage?.expenses ?? initialExpensePage?.items ?? [],
    );
    const [nextCursor, setNextCursor] = useState(initialExpensePage?.nextCursor || null);
    const [status, setStatus] = useState("");
    const [payableOnly, setPayableOnly] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const myMembership = useMemo(
        () => initialMemberships.find((m) => m.isMe || m.isSelf) || initialMemberships[0],
        [initialMemberships],
    );
    const myMembershipId = myMembership ? memberKey(myMembership) : "";

    const statusOptions = useMemo(
        () =>
            STATUS_VALUES.map((value) => ({
                value,
                label: value ? t(`exp.${value}`) : t("exp.allStatuses"),
            })),
        [t],
    );

    const load = useCallback(
        async (reset = true, overrides = {}) => {
            const nextStatus = overrides.status ?? status;
            const nextPayable = overrides.payableOnly ?? payableOnly;
            const query = {
                status: nextStatus || undefined,
                payable: nextPayable ? "true" : undefined,
                limit: 30,
                ...(reset || !nextCursor ? {} : { cursor: nextCursor }),
            };
            if (reset) setLoading(true);
            else setLoadingMore(true);
            try {
                const data = await expensesApi.list(groupId, query);
                const page = Array.isArray(data?.expenses) ? data.expenses : data?.items || [];
                setExpenses((current) => (reset ? page : [...current, ...page]));
                setNextCursor(data?.nextCursor || null);
            } catch (ex) {
                showToast({ status: "error", title: t("exp.couldNotLoad"), description: ex?.data?.msg || ex?.message });
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [groupId, status, payableOnly, nextCursor, showToast, t],
    );

    const applyFilters = (patch = {}) => {
        const nextStatus = patch.status ?? status;
        const nextPayable = patch.payableOnly ?? payableOnly;
        setStatus(nextStatus);
        setPayableOnly(nextPayable);
        setNextCursor(null);
        load(true, { status: nextStatus, payableOnly: nextPayable });
    };

    const clearFilters = () => applyFilters({ status: "", payableOnly: false });

    const totals = useMemo(() => {
        const count = expenses.length;
        const sum = expenses.reduce((acc, row) => acc + Number(row.amount || 0), 0);
        const awaiting = expenses.filter((row) => row.status === "submitted").length;
        return { count, sum, awaiting };
    }, [expenses]);

    const activeFilterCount = (status ? 1 : 0) + (payableOnly ? 1 : 0);

    return (
        <div className="min-w-0 space-y-3">
            <SegmentedControl
                ariaLabel={t("overview.expenses")}
                value={tab}
                onChange={setTab}
                options={[
                    { value: "list", label: t("exp.allExpenses"), icon: LuReceipt },
                    { value: "new", label: t("exp.newDraft"), icon: LuPlus },
                    { value: "advanced", label: t("exp.advanced"), icon: LuSlidersHorizontal },
                ]}
            />

            {tab === "list" && (
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
                            <LuListFilter size={14} />
                            {t("exp.status")}
                            {activeFilterCount > 0 && (
                                <span className="grid size-4 place-items-center rounded-full bg-(--p) text-[9px] font-bold text-(--bgs)">
                                    {activeFilterCount}
                                </span>
                            )}
                            {filtersOpen ? <LuChevronUp size={13} /> : <LuChevronDown size={13} />}
                        </button>
                        <Button
                            size="sm"
                            variant="ghost"
                            isRound
                            ariaLabel={t("exp.refresh")}
                            isLoading={loading}
                            onClick={() => {
                                setNextCursor(null);
                                load(true);
                            }}
                        >
                            <LuRefreshCw size={15} />
                        </Button>
                        {canTreasurer && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto rounded-full"
                                leftIcon={<LuFileSpreadsheet size={14} />}
                                onClick={() => setImportOpen(true)}
                            >
                                {t("exp.import")}
                            </Button>
                        )}
                    </div>

                    {filtersOpen && (
                        <div className="rounded-2xl border border-(--bd) bg-(--bgs) p-3">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Select
                                    size="lg"
                                    label={t("exp.status")}
                                    options={statusOptions}
                                    value={status}
                                    onChange={(event) => applyFilters({ status: event.target.value })}
                                />
                                <div className="flex items-end pb-1">
                                    <Checkbox
                                        label={t("exp.payableOnly")}
                                        isChecked={payableOnly}
                                        onChange={() => applyFilters({ payableOnly: !payableOnly })}
                                    />
                                </div>
                            </div>
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 rounded-full"
                                    leftIcon={<LuX size={13} />}
                                    onClick={clearFilters}
                                >
                                    {t("exp.clear")}
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-(--bgm) px-2.5 py-2">
                            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-(--tm)">
                                {t("overview.expenses")}
                            </p>
                            <p className="truncate text-sm font-extrabold tabular-nums text-(--tp)">{n(totals.count)}</p>
                        </div>
                        <div className="rounded-xl bg-(--bgm) px-2.5 py-2">
                            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-(--tm)">{t("exp.total")}</p>
                            <p className="truncate text-sm font-extrabold tabular-nums text-(--tp)">{fmt(totals.sum)}</p>
                        </div>
                        <div className="rounded-xl bg-(--warning-bg) px-2.5 py-2">
                            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-(--warning)">
                                {t("exp.submitted")}
                            </p>
                            <p className="truncate text-sm font-extrabold tabular-nums text-(--warning)">
                                {n(totals.awaiting)}
                            </p>
                        </div>
                    </div>

                    {loading && expenses.length === 0 ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((key) => (
                                <Skeleton key={key} variant="rect" height={92} className="rounded-2xl" />
                            ))}
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="rounded-2xl border border-(--bd) bg-(--bgs)">
                            <EmptyState
                                icon={LuReceipt}
                                title={t("exp.none")}
                                body={activeFilterCount ? t("exp.noneFiltered") : t("exp.noneEmpty")}
                                action={
                                    activeFilterCount ? (
                                        <Button variant="outline" size="md" onClick={clearFilters}>
                                            {t("exp.clear")}
                                        </Button>
                                    ) : (
                                        <Button size="md" leftIcon={<LuPlus size={15} />} onClick={() => setTab("new")}>
                                            {t("exp.newDraft")}
                                        </Button>
                                    )
                                }
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {expenses.map((expense) => (
                                <ExpenseCard
                                    key={expense._id}
                                    groupId={groupId}
                                    expense={expense}
                                    canTreasurer={canTreasurer}
                                    onChanged={() => {
                                        setNextCursor(null);
                                        load(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {nextCursor && (
                        <Button
                            variant="outline"
                            size="md"
                            isFullWidth
                            className="rounded-xl"
                            isLoading={loadingMore}
                            isDisabled={loadingMore}
                            onClick={() => load(false)}
                        >
                            {t("exp.loadMore")}
                        </Button>
                    )}
                </>
            )}

            {tab === "new" && (
                <SectionCard icon={LuPlus} title={t("exp.draftForm")} subtitle={t("exp.newDraft")}>
                    <ExpenseDraftForm
                        groupId={groupId}
                        categories={initialCategories}
                        memberships={initialMemberships}
                        myMembershipId={myMembershipId}
                        onCreated={() => {
                            setTab("list");
                            setNextCursor(null);
                            load(true);
                        }}
                    />
                </SectionCard>
            )}

            {tab === "advanced" && (
                <SectionCard icon={LuSlidersHorizontal} title={t("exp.advanced")} subtitle={t("exp.legacyTitle")}>
                    <LegacyExpensePanel
                        groupId={groupId}
                        categories={initialCategories}
                        onChanged={() => {
                            setNextCursor(null);
                            load(true);
                        }}
                    />
                </SectionCard>
            )}

            <ExpenseImportWizard
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                groupId={groupId}
                onImported={() => {
                    setNextCursor(null);
                    load(true);
                }}
            />
        </div>
    );
}

