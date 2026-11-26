import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import { audit } from '../models/AuditEvent.js';
import { computeVariance, actualSpendByCategory } from '../services/budgetRules.js';

// Budgets (S5.2) — planned per-category monthly ceilings with live variance.
// Variance always recomputes from approved, non-reversal expenses so it can never
// disagree with the ledger.

const monthStart = (month) => new Date(`${month}-01T00:00:00.000Z`);
const monthEnd = (month) => {
    const d = monthStart(month);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d;
};

const loadSpend = async ({ groupId, month }) => {
    const expenses = await Expense.find({
        groupId, status: 'approved', isReversal: { $ne: true },
        $or: [{ costPeriod: month }, { costPeriod: { $in: [null, undefined] }, date: { $gte: monthStart(month), $lt: monthEnd(month) } }],
    }).select('amount lines categoryId costPeriod date').lean();
    return actualSpendByCategory(expenses);
};

/** GET /api/budgets/groups/:groupId?month=YYYY-MM */
export const listBudgets = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { month } = req.validated.query;
        const [budgets, spent, categories] = await Promise.all([
            Budget.find({ groupId, month }).sort({ categoryId: 1 }).lean(),
            loadSpend({ groupId, month }),
            ExpenseCategory.find({ groupId, isArchived: false }).select('name icon kind splitMode').lean(),
        ]);
        const catMap = new Map(categories.map(c => [String(c._id), c]));
        const variance = computeVariance({ budgets, actualByCategory: spent });
        res.json({
            groupId, month,
            budgets: variance.lines.map(l => ({ ...l, category: l.categoryId ? catMap.get(String(l.categoryId)) || null : null })),
            plannedTotalPoisha: variance.plannedTotalPoisha,
            actualTotalPoisha: variance.actualTotalPoisha,
            remainingTotalPoisha: variance.remainingTotalPoisha,
            usedPctTotal: variance.usedPctTotal,
            overBudget: variance.overBudget,
        });
    } catch (err) { next(err); }
};

/** POST /api/budgets/groups/:groupId — upsert one category (or the month total) */
export const upsertBudget = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { month, categoryId = null, amountPoisha, note = '' } = req.body;

        if (categoryId) {
            const exists = await ExpenseCategory.exists({ _id: categoryId, groupId });
            if (!exists) return res.status(422).json({ msg: 'categoryId does not belong to this group' });
        }

        const budget = await Budget.findOneAndUpdate(
            { groupId, month, categoryId: categoryId || null },
            { $set: { amountPoisha, note, updatedBy: req.user.id }, $setOnInsert: { createdBy: req.user.id } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        await audit({
            groupId, actorId: req.user.id, action: 'budget.upserted',
            targetType: 'budget', targetId: budget._id,
            after: { month, categoryId: budget.categoryId, amountPoisha },
        });
        res.status(201).json({ msg: 'Budget saved', budget });
    } catch (err) { next(err); }
};

/** DELETE /api/budgets/groups/:groupId/:budgetId */
export const deleteBudget = async (req, res, next) => {
    try {
        const { groupId, budgetId } = req.params;
        const budget = await Budget.findOneAndDelete({ _id: budgetId, groupId }).lean();
        if (!budget) return res.status(404).json({ msg: 'Budget not found' });
        await audit({ groupId, actorId: req.user.id, action: 'budget.deleted', targetType: 'budget', targetId: budgetId, before: { amountPoisha: budget.amountPoisha } });
        res.json({ msg: 'Budget removed' });
    } catch (err) { next(err); }
};

/** GET /api/budgets/groups/:groupId/variance?month=YYYY-MM */
export const budgetVariance = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { month } = req.validated.query;
        const [budgets, spent] = await Promise.all([
            Budget.find({ groupId, month }).lean(),
            loadSpend({ groupId, month }),
        ]);
        res.json({ groupId, month, ...computeVariance({ budgets, actualByCategory: spent }) });
    } catch (err) { next(err); }
};
