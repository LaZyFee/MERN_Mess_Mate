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

// Build an aggregation pipeline matching the requested window
const matchWindow = (groupId, q) => {
    // aggregations do NOT auto-cast strings to ObjectId like queries do
    const match = { groupId: new mongoose.Types.ObjectId(groupId) };
    if (q.userId) match.userId = new mongoose.Types.ObjectId(q.userId);

    if (q.month) {
        match.month = q.month;
    } else if (q.granularity === 'month' && q.year) {
        match.month = { $regex: `^${q.year}-` };
    } else if (q.granularity === 'year' && q.year) {
        match.month = { $regex: `^${q.year}-` };
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
        const mealAgg = await Meal.aggregate([
            { $match: match },
            {
                $group: {
                    _id: q.month ? '$date' : '$month', // daily buckets for single-month, monthly otherwise
                    totalMeals: { $sum: '$totalMeals' },
                    entries: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // ---- Expenses aggregation (per period + per category) ----
        const expenseAgg = await Expense.aggregate([
            { $match: match },
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
            { $match: match },
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
            total: Math.round(c.total * 100) / 100,
            count: c.count,
        }));

        // If q.month, bucket by day-of-month; label appropriately
        const normalizeBucket = (agg, isMeal) =>
            agg.map(a => ({
                bucket: q.month
                    ? new Date(a._id).getDate()                // day number
                    : a._id,                                    // "2026-03" or year bucket
                meals: isMeal ? a.totalMeals : undefined,
                amount: !isMeal ? Math.round(a.total * 100) / 100 : undefined,
                entries: a.entries ?? a.count,
            }));

        const mealsSeries = normalizeBucket(mealAgg, true);
        const expenseSeries = normalizeBucket(expenseAgg, false);

        // ---- Summary stats ----
        const totalMeals = mealAgg.reduce((s, a) => s + a.totalMeals, 0);
        const totalExpenses = expenseAgg.reduce((s, a) => s + a.total, 0);
        const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

        // finalized snapshots, useful for year-over-year comparison
        const summaryMatch = q.month
            ? { groupId, month: q.month }
            : { groupId, month: { $regex: match.month?.$regex || '^' } };
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
                totalMeals,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                mealRate: Math.round(mealRate * 100) / 100,
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
