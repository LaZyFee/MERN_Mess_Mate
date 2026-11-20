import MonthlySummary from '../models/MonthlySummary.js';
import Meal from '../models/Meal.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import { monthParamSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import { buildWaSummaryLinks, sendWaDirect } from '../utils/whatsapp.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Core monthly computation with category-wise splitting.
 *
 * Meal costs:      totalMealExpenses / totalMeals × member's meals
 * Category costs:  per ExpenseCategory:
 *   - splitMode 'equal' → categoryTotal / activeMemberCount  (rent, bills…)
 *   - splitMode 'meal'  → categoryTotal / totalMeals × memberMeals
 *
 * Response per member: mealCost + categoryCosts[] + totalDue.
 * Example: mealRate 10 × 60 meals = 600; categories total 250 split equally
 * among 5 members = 50 → perPerson = 650, shown as 600 meal + 50 others.
 */
const computeSummary = async (group, month) => {
    const [meals, expenses, categories] = await Promise.all([
        Meal.find({ groupId: group._id, month }),
        Expense.find({ groupId: group._id, month }).select('userId amount categoryId category'),
        ExpenseCategory.find({ groupId: group._id, isArchived: false }),
    ]);

    // ---- member meal totals (only members with any data count for equal split) ----
    const memberMeals = new Map(); // userId -> meals
    let totalMeals = 0;
    for (const m of meals) {
        const key = String(m.userId);
        memberMeals.set(key, (memberMeals.get(key) || 0) + m.totalMeals);
        totalMeals += m.totalMeals;
    }

    // ---- split expenses by their group-managed ExpenseCategory ----
    let mealExpensesTotal = 0;              // feeds mealRate (groceries / splitMode 'meal' categories)
    const categoryTotals = new Map();       // categoryId -> { name, icon, splitMode, total }
    for (const c of categories) categoryTotals.set(String(c._id), {
        categoryId: c._id, name: c.name, icon: c.icon, splitMode: c.splitMode, total: 0,
    });

    // Expenses whose category doc was deleted (or legacy docs without categoryId)
    // fall back to the meal rate so no money is lost from the calculation.
    let orphanTotal = 0;

    for (const e of expenses) {
        const cat = e.categoryId ? categoryTotals.get(String(e.categoryId)) : null;
        if (!cat) {
            orphanTotal += e.amount;
            continue;
        }
        if (cat.splitMode === 'meal') {
            mealExpensesTotal += e.amount;
            cat.total += e.amount;
        } else {
            cat.total += e.amount;
        }
    }
    mealExpensesTotal += orphanTotal;

    const totalMealExpenses = mealExpensesTotal;
    const mealRate = totalMeals > 0 ? totalMealExpenses / totalMeals : 0;

    // fixed grand total = fixed categories + legacy fixed + group.extras
    const extrasList = (group.extras || []).map(x => ({ name: x.name, amount: x.amount }));
    const extrasTotal = extrasList.reduce((s, x) => s + (x.amount || 0), 0);

    // ---- build per-member breakdown ----
    const userSummaries = group.members.map((m) => {
        const key = String(m.user);
        const mealsEaten = memberMeals.get(key) || 0;
        const mealCost = mealsEaten * mealRate;

        const categoryCosts = [];

        // group-managed fixed categories (equal among ALL members)
        for (const cat of categoryTotals.values()) {
            if (cat.splitMode !== 'equal') continue;
            const share = round2(cat.total / group.members.length);
            if (share > 0 || cat.total > 0) {
                categoryCosts.push({
                    categoryId: cat.categoryId, name: cat.name, icon: cat.icon,
                    splitMode: 'equal', categoryTotal: round2(cat.total), memberShare: share,
                });
            }
        }

        // group extras (equal among members)
        if (extrasTotal > 0) {
            categoryCosts.push({
                categoryId: null, name: 'Extras', icon: '📦', splitMode: 'equal',
                categoryTotal: round2(extrasTotal), memberShare: round2(extrasTotal / group.members.length),
            });
        }

        const otherCost = categoryCosts.reduce((s, c) => s + c.memberShare, 0);
        const totalDue = round2(mealCost + otherCost);
        const paid = round2(0); // payments tracked via Expense the member paid
        const balance = round2(paid - totalDue);

        return {
            userId: m.user,
            totalMeals: mealsEaten,
            mealExpenses: 0, // what this member personally paid for meals (fill from expenses)
            mealCost: round2(mealCost),
            categoryCosts,
            otherCost: round2(otherCost),
            totalDue,
            balance,
            status: Math.abs(balance) < 0.01 ? 'settled' : balance > 0 ? 'receives' : 'owes',
        };
    });

    // what each member personally paid (all expenses) — for "pay amount"
    const paidByMember = new Map();
    for (const e of expenses) {
        const key = String(e.userId);
        paidByMember.set(key, (paidByMember.get(key) || 0) + e.amount);
    }
    for (const u of userSummaries) {
        u.mealExpenses = round2(paidByMember.get(String(u.userId)) || 0);
        u.balance = round2(u.mealExpenses - u.totalDue);
        u.status = Math.abs(u.balance) < 0.01 ? 'settled' : u.balance > 0 ? 'receives' : 'owes';
    }

    // Totals: meal-mode category totals are part of mealExpensesTotal already
    const fixedTotal =
        [...categoryTotals.values()].filter(c => c.splitMode === 'equal').reduce((s, c) => s + c.total, 0)
        + extrasTotal;

    return {
        groupId: group._id,
        month,
        totalMeals,
        totalMealExpenses: round2(totalMealExpenses),
        mealRate: round2(mealRate),
        fixedExpensesTotal: round2(fixedTotal),
        totalExpenses: round2(totalMealExpenses + fixedTotal),
        categoryBreakdown: [
            ...[...categoryTotals.values()]
                .filter(c => c.splitMode === 'equal')
                .map(c => ({ categoryId: c.categoryId, name: c.name, icon: c.icon, total: round2(c.total), splitMode: 'equal' })),
            ...(extrasTotal > 0 ? [{ name: 'Extras', icon: '📦', total: round2(extrasTotal), splitMode: 'equal' }] : []),
        ],
        extras: extrasList,
        userSummaries,
        isFinalized: false,
    };
};

// GET /api/summary/whatsapp/:groupId/:month — admin gets wa.me deep links per member
// (zero-config default). If WHATSAPP_TOKEN is configured, also sends directly.
export const whatsappSummary = [
    validate(monthParamSchema, 'params'),
    async (req, res, next) => {
        try {
            const group = req.group;
            const month = req.params.month;

            const existing = await MonthlySummary.findOne({ groupId: group._id, month });
            const summary = existing?.isFinalized
                ? existing
                : await computeSummary(group, month);

            const links = await buildWaSummaryLinks({ group, summary });

            // If Cloud API configured, send directly (best effort)
            let sent = 0;
            if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
                for (const item of links) {
                    if (item.waLink) {
                        const ok = await sendWaDirect(
                            item.message && item.waLink.match(/wa\.me\/(\d+)/)?.[1],
                            item.message
                        ).catch(() => false);
                        if (ok) sent++;
                    }
                }
            }

            res.json({
                msg: process.env.WHATSAPP_TOKEN
                    ? `Sent ${sent}/${links.filter(l => l.waLink).length} via WhatsApp Cloud API`
                    : 'Open these links to send each member their summary',
                month,
                recipients: links,
            });
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/summary/:groupId/:month
export const getSummary = [
    validate(monthParamSchema, 'params'),
    async (req, res, next) => {
        try {
            const group = req.group;
            const month = req.params.month;

            const existing = await MonthlySummary.findOne({ groupId: group._id, month });
            if (existing?.isFinalized) {
                return res.json({ ...existing.toObject(), frozen: true });
            }

            const summary = await computeSummary(group, month);
            res.json({ ...summary, isFinalized: existing?.isFinalized || false, frozen: false });
        } catch (err) {
            next(err);
        }
    },
];

// POST /api/summary/finalize/:groupId/:month — admin freezes the month
export const finalizeSummary = [
    validate(monthParamSchema, 'params'),
    async (req, res, next) => {
        try {
            const group = req.group;
            const month = req.params.month;

            // Legacy summaries are read-only compatibility artifacts. Finalizing
            // through this endpoint would overwrite history; use versioned V2 statements.
            const existing = await MonthlySummary.findOne({ groupId: group._id, month });
            if (existing?.isFinalized) {
                return res.status(409).json({ msg: 'Legacy summary is immutable; use /api/statements for a versioned correction' });
            }
            return res.status(410).json({ msg: 'Legacy summary finalization is retired; finalize through /api/statements' });
        } catch (err) {
            next(err);
        }
    },
];
