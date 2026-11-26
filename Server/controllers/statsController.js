import Meal from '../models/Meal.js';
import Expense from '../models/Expense.js';
import MonthlySummary from '../models/MonthlySummary.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Period from '../models/Period.js';
import Statement from '../models/Statement.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import FundAccount from '../models/FundAccount.js';
import Membership from '../models/Membership.js';
import { buildStatementDraft } from '../services/statementService.js';
import { getFundBalance } from '../services/ledgerService.js';
import { membershipsInMonth } from '../services/membershipService.js';
import { sumPoisha } from '../utils/money.js';
import { statsQuerySchema } from '../validation/schemas.js';
import mongoose from 'mongoose';

/**
 * GET /api/stats/:groupId?granularity=month|year&year=YYYY&month=YYYY-MM&userId=
 *
 * granularity=month + year=2026  → 12 buckets (Jan..Dec 2026) — line/bar charts
 * granularity=month + month=...  → single-month deep detail (daily buckets)
 * granularity=year               → one bucket per year — multi-year trend
 *
 * Every response also carries per-category totals so the UI can draw
 * stacked bars / pie charts of where money went.
 */

// Build an aggregation pipeline matching the requested window.
// NOTE: aggregation $match does NOT auto-cast strings → ObjectIds, so ids are
// cast explicitly here.
const matchWindow = (groupId, q) => {
    const match = { groupId: new mongoose.Types.ObjectId(groupId) };
    if (q.userId) match.userId = new mongoose.Types.ObjectId(q.userId);

    if (q.month) {
        match.month = q.month;
    } else if (q.year) {
        // granularity=month → 12 monthly buckets inside the year
        // granularity=year  → all buckets for the year, collapsed client-side
        // Index-friendly range on the `YYYY-MM` string (S4.6) — a plain range keeps
        // the (groupId, month) index usable instead of a collection scan.
        match.month = { $gte: `${q.year}-01`, $lte: `${q.year}-12` };
    }
    return match;
};

export const getStats = async (req, res, next) => {
    try {
        const parsed = statsQuerySchema.safeParse({ ...req.params, ...req.query });
        if (!parsed.success) {
            return res.status(400).json({
                msg: 'Validation failed',
                errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
            });
        }
        const q = parsed.data;
        const groupId = parsed.data.groupId;

        const match = matchWindow(groupId, q);

        // ---- Meals aggregation ----
        // Group by month (or day for a single-month drill-down) and sum portions.
        // `totalMealSubunits` is the integer-thousandths total; `totalMeals` is
        // the UI-friendly decimal (1.25 = one and a quarter portions).
        const mealAgg = await Meal.aggregate([
            { $match: match },
            {
                $group: {
                    _id: q.month ? '$date' : '$month', // daily buckets for single-month, monthly otherwise
                    totalMealSubunits: {
                        $sum: {
                            $add: [
                                { $cond: [{ $eq: ['$breakfast.state', 'consumed'] }, { $ifNull: ['$breakfast.portionSubunits', 0] }, 0] },
                                { $cond: [{ $eq: ['$lunch.state', 'consumed'] }, { $ifNull: ['$lunch.portionSubunits', 0] }, 0] },
                                { $cond: [{ $eq: ['$snacks.state', 'consumed'] }, { $ifNull: ['$snacks.portionSubunits', 0] }, 0] },
                                { $cond: [{ $eq: ['$dinner.state', 'consumed'] }, { $ifNull: ['$dinner.portionSubunits', 0] }, 0] },
                            ],
                        },
                    },
                    entries: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // ---- Expenses aggregation (per period + per category) ----
        // Only approved, non-reversal expenses are real spend. Drafts and
        // submitted rows are work-in-progress; rejected rows are void.
        const expenseMatch = { ...match, status: 'approved', isReversal: { $ne: true } };
        const expenseAgg = await Expense.aggregate([
            { $match: expenseMatch },
            {
                $group: {
                    _id: q.month ? '$date' : '$month',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // category-wise totals (needs a separate group stage)
        const categoryAgg = await Expense.aggregate([
            { $match: expenseMatch },
            {
                $group: {
                    _id: '$categoryId',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { total: -1 } },
        ]);

        // hydrate category names (categories come from the ExpenseCategory collection)
        const catIds = categoryAgg.filter(c => c._id).map(c => c._id);
        const cats = catIds.length
            ? await ExpenseCategory.find({ _id: { $in: catIds } }).select('name icon').lean()
            : [];
        const catMap = new Map(cats.map(c => [String(c._id), c]));

        const categoryBreakdown = categoryAgg.map(c => ({
            categoryId: c._id,
            name: c._id ? (catMap.get(String(c._id))?.name || 'Unknown') : 'Uncategorized',
            icon: c._id ? (catMap.get(String(c._id))?.icon || '') : '',
            totalPoisha: c.total,           // canonical
            total: c.total / 100,           // legacy taka value (kept for old clients)
            count: c.count,
        }));

        // If q.month, bucket by day-of-month; label appropriately
        const normalizeBucket = (agg, isMeal) =>
            agg.map(a => ({
                bucket: q.month
                    ? new Date(a._id).getDate()                // day number
                    : a._id,                                    // "2026-03" or year bucket
                meals: isMeal ? Number(((a.totalMealSubunits || 0) / 1000).toFixed(3)) : undefined,
                mealSubunits: isMeal ? a.totalMealSubunits : undefined,
                amount: !isMeal ? a.total / 100 : undefined,
                amountPoisha: !isMeal ? a.total : undefined,
                entries: a.entries ?? a.count,
            }));

        const mealsSeries = normalizeBucket(mealAgg, true);
        const expenseSeries = normalizeBucket(expenseAgg, false);

        // ---- Summary stats ----
        const totalMealSubunits = mealAgg.reduce((s, a) => s + (a.totalMealSubunits || 0), 0);
        const totalMeals = totalMealSubunits / 1000;
        const totalExpensePoisha = expenseAgg.reduce((s, a) => s + a.total, 0);
        // mealRate is poisha per meal unit (integer); 0 when there are no meals
        const mealRatePoisha = totalMeals > 0 ? Math.round(totalExpensePoisha / totalMeals) : 0;

        // finalized snapshots, useful for year-over-year comparison
        const summaryMatch = q.month
            ? { groupId, month: q.month }
            : (match.month ? { groupId, month: match.month } : { groupId });
        const finalized = await MonthlySummary.find(summaryMatch)
            .select('month totalMeals totalExpenses mealRate isFinalized')
            .sort({ month: 1 })
            .lean();

        res.json({
            groupId,
            granularity: q.month ? 'day' : q.granularity,
            year: q.year || null,
            month: q.month || null,
            userId: q.userId || null,
            totals: {
                totalMeals,                         // decimal meal units (1.25)
                totalMealSubunits,                  // integer thousandths (1250)
                totalExpensesPoisha: totalExpensePoisha,
                totalExpensesTaka: totalExpensePoisha / 100,
                mealRatePoisha,                     // poisha per meal unit
                mealRateTaka: mealRatePoisha / 100,
            },
            mealsSeries,
            expenseSeries,
            categoryBreakdown,
            finalizedMonths: finalized,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/stats/groups/:groupId/dashboard?month=YYYY-MM (Doc §11)
 *
 * Unified V2 dashboard separating draft, approved, finalized,
 * and current settlement figures.
 */
export const getV2Dashboard = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const month = req.query.month || currentMonth;

        // 1. Period state & revision
        const period = await Period.findOne({ groupId, month }).lean();
        const periodState = period?.state || 'open';
        const revision = period?.revision || 0;

        // 2. Memberships in month
        const activeMemberships = await membershipsInMonth({ groupId, month });

        // 3. Expenses Breakdown (draft, submitted, approved, rejected)
        const allExpenses = await Expense.find({ groupId, costPeriod: month }).lean();
        const drafts = allExpenses.filter(e => e.status === 'draft');
        const submitted = allExpenses.filter(e => e.status === 'submitted');
        const approved = allExpenses.filter(e => e.status === 'approved' && !e.isReversal);
        const rejected = allExpenses.filter(e => e.status === 'rejected');
        const payables = approved.filter(e => e.isPayable);

        const draftTotal = sumPoisha(drafts.map(e => e.amount));
        const submittedTotal = sumPoisha(submitted.map(e => e.amount));
        const approvedTotal = sumPoisha(approved.map(e => e.amount));
        const outstandingPayables = sumPoisha(payables.map(e => Math.max(0, e.amount - (e.paidTotal || 0))));

        // 4. Money Transactions
        const transactions = await MoneyTransaction.find({
            groupId,
            $or: [
                { paidAt: { $gte: new Date(`${month}-01`), $lt: new Date(new Date(`${month}-01T00:00:00Z`).setUTCMonth(new Date(`${month}-01T00:00:00Z`).getUTCMonth() + 1)) } },
                { status: 'submitted' },
            ],
        }).lean();

        const confirmedTx = transactions.filter(t => t.status === 'confirmed');
        const pendingTx = transactions.filter(t => t.status === 'submitted');
        const totalContributions = sumPoisha(confirmedTx.filter(t => t.kind === 'contribution').map(t => t.amount));
        const totalPersonalSupplierPayments = sumPoisha(confirmedTx.filter(t => t.kind === 'supplier_payment' && t.fromMember).map(t => t.amount));
        const pendingMoneyTotal = sumPoisha(pendingTx.map(t => t.amount));

        // 5. Fund Accounts & Common Fund Balance
        const funds = await FundAccount.find({ groupId, isArchived: false }).lean();
        const fundBalances = [];
        let totalFundAssets = 0;
        for (const f of funds) {
            const bal = await getFundBalance({ groupId, accountId: f._id });
            totalFundAssets += bal;
            fundBalances.push({
                accountId: f._id,
                name: f.name,
                kind: f.kind,
                maskedIdentifier: f.maskedIdentifier,
                balancePoisha: bal,
                balanceTaka: (bal / 100).toFixed(2),
            });
        }

        // 6. Statement & Settlement Status
        let settlement = null;
        if (periodState === 'finalized') {
            const statement = await Statement.findOne({ groupId, month, state: 'current' }).lean();
            if (statement) {
                settlement = {
                    isFinalized: true,
                    version: statement.version,
                    finalizedAt: statement.finalizedAt,
                    totalMeals: statement.totalMeals,
                    mealRatePoisha: statement.mealRate,
                    mealRateTaka: statement.mealRate != null ? (statement.mealRate / 100).toFixed(2) : null,
                    totalExpensesPoisha: statement.totalExpenses,
                    totalExpensesTaka: (statement.totalExpenses / 100).toFixed(2),
                    items: statement.items.map(i => ({
                        membershipId: i.membershipId,
                        displayName: i.displayName,
                        mealUnits: i.mealUnits,
                        totalChargePoisha: i.totalCharge,
                        closingCreditPoisha: i.closingCredit,
                        closingCreditTaka: (i.closingCredit / 100).toFixed(2),
                        status: i.status,
                    })),
                };
            }
        }

        // If open or review (or finalized without statement row), provide draft preview figures
        if (!settlement) {
            try {
                const draft = await buildStatementDraft({ groupId, month });
                settlement = {
                    isFinalized: false,
                    version: 'draft',
                    totalMeals: draft.totalUnits,
                    mealRatePoisha: draft.mealRate,
                    mealRateTaka: draft.mealRate != null ? (draft.mealRate / 100).toFixed(2) : null,
                    totalExpensesPoisha: draft.totalExpenses,
                    totalExpensesTaka: (draft.totalExpenses / 100).toFixed(2),
                    items: draft.items.map(i => ({
                        membershipId: i.membershipId,
                        displayName: i.displayName,
                        mealUnits: i.mealUnits,
                        totalChargePoisha: i.totalCharge,
                        closingCreditPoisha: i.closingCredit,
                        closingCreditTaka: (i.closingCredit / 100).toFixed(2),
                        status: i.status,
                    })),
                };
            } catch {
                settlement = { isFinalized: false, version: 'draft', items: [] };
            }
        }

        res.json({
            groupId,
            month,
            period: {
                state: periodState,
                revision,
                reviewStartedAt: period?.reviewStartedAt || null,
                finalizedAt: period?.finalizedAt || null,
            },
            activeMembersCount: activeMemberships.length,
            expenses: {
                draft: { count: drafts.length, totalPoisha: draftTotal, totalTaka: (draftTotal / 100).toFixed(2) },
                submitted: { count: submitted.length, totalPoisha: submittedTotal, totalTaka: (submittedTotal / 100).toFixed(2) },
                approved: { count: approved.length, totalPoisha: approvedTotal, totalTaka: (approvedTotal / 100).toFixed(2) },
                rejected: { count: rejected.length },
                payablesOutstanding: { count: payables.length, totalPoisha: outstandingPayables, totalTaka: (outstandingPayables / 100).toFixed(2) },
            },
            money: {
                totalContributionsPoisha: totalContributions,
                totalContributionsTaka: (totalContributions / 100).toFixed(2),
                personalSupplierPaymentsPoisha: totalPersonalSupplierPayments,
                pendingTransactions: { count: pendingTx.length, totalPoisha: pendingMoneyTotal, totalTaka: (pendingMoneyTotal / 100).toFixed(2) },
            },
            funds: {
                totalAssetsPoisha: totalFundAssets,
                totalAssetsTaka: (totalFundAssets / 100).toFixed(2),
                accounts: fundBalances,
            },
            settlement,
        });
    } catch (err) {
        next(err);
    }
};
