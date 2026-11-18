import Meal from '../models/Meal.js';
import Expense from '../models/Expense.js';
import MonthlySummary from '../models/MonthlySummary.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
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
