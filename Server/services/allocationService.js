import Allocation from '../models/Allocation.js';
import Meal from '../models/Meal.js';
import { allocateByWeights, allocateEqual, sumPoisha } from '../utils/money.js';
import { isEligibleOn, eligibleDaysIn } from './membershipService.js';

// Allocation engine — exact integer-poisha allocation of an approved expense
// line across beneficiaries under one of the split modes. Deterministic
// largest-remainder rounding; total of charges always equals the line total.

/**
 * Compute weight integers per beneficiary for a line + mode.
 * Returns { memberships, weights, mode } or throws 422 when a denominator is zero.
 */
const buildWeights = async ({ groupId, line, category, memberships, serviceFrom, serviceTo }) => {
    const mode = line?.splitMode || category?.splitMode || 'equal_all';
    const benIds = line?.beneficiaries?.length ? line.beneficiaries : (category?.defaultBeneficiaries || []);

    const inPool = benIds.length
        ? memberships.filter(m => benIds.some(b => String(b) === String(m._id)))
        : memberships; // default: all active members in the period

    if (inPool.length === 0) {
        throw Object.assign(new Error('No eligible beneficiaries for this expense line'), { status: 422 });
    }

    switch (mode) {
        case 'meal_units': case 'meal': {
            const meals = await Meal.find({
                groupId,
                userId: { $in: inPool.map(m => m.user).filter(Boolean) },
                date: { $gte: serviceFrom, $lt: serviceTo },
            }).lean();
            const perUser = new Map();
            for (const meal of meals) {
                const w = (meal.lunch || 0) + (meal.dinner || 0); // legacy two-slot units
                perUser.set(String(meal.userId), (perUser.get(String(meal.userId)) || 0) + w);
            }
            // meal consumption belongs to users; map to memberships (fallback 0)
            const weights = inPool.map(m => (m.user ? (perUser.get(String(m.user)) || 0) : 0));
            const total = weights.reduce((a, b) => a + b, 0);
            if (total <= 0) {
                throw Object.assign(
                    new Error('Positive food cost with zero meal units — resolve with an explicit alternative allocation before closing'),
                    { status: 422 }
                );
            }
            return { memberships: inPool, weights, mode: 'meal_units' };
        }
        case 'equal_all': case 'equal': case 'equal_selected': {
            return { memberships: inPool, weights: inPool.map(() => 1), mode: 'equal_all' };
        }
        case 'member_days': {
            const weights = inPool.map(m => eligibleDaysIn(m, serviceFrom, serviceTo));
            const total = weights.reduce((a, b) => a + b, 0);
            if (total <= 0) throw Object.assign(new Error('Zero eligible member-days for this line'), { status: 422 });
            return { memberships: inPool, weights, mode };
        }
        case 'fixed_amounts': {
            const fixed = line?.fixedAmounts || [];
            if (!fixed.length) throw Object.assign(new Error('fixed_amounts requires explicit per-member amounts'), { status: 422 });
            const ms = [];
            const amounts = [];
            for (const f of fixed) {
                const m = inPool.find(x => String(x._id) === String(f.membershipId));
                if (!m) continue;
                ms.push(m);
                amounts.push(Number(f.amount));
            }
            const lineTotal = amounts.reduce((a, b) => a + b, 0);
            return { memberships: ms, weights: amounts, mode, exactTotal: lineTotal };
        }
        case 'weighted': {
            const ws = line?.weights?.length ? line.weights : [];
            if (!ws.length) throw Object.assign(new Error('weighted split requires per-member weights'), { status: 422 });
            const ms = [];
            const weights = [];
            for (const w of ws) {
                const m = inPool.find(x => String(x._id) === String(w.membershipId));
                if (!m) continue;
                ms.push(m);
                weights.push(Math.max(1, Number(w.weight)));
            }
            return { memberships: ms, weights, mode };
        }
        case 'usage': {
            const us = line?.usageQuantities || [];
            if (!us.length) throw Object.assign(new Error('usage split requires meter quantities'), { status: 422 });
            const ms = [];
            const weights = [];
            for (const u of us) {
                const m = inPool.find(x => String(x._id) === String(u.membershipId));
                if (!m) continue;
                ms.push(m);
                weights.push(Math.max(0, Number(u.quantity)));
            }
            const total = weights.reduce((a, b) => a + b, 0);
            if (total <= 0) throw Object.assign(new Error('Zero usage quantities for this line'), { status: 422 });
            return { memberships: ms, weights, mode };
        }
        case 'personal': {
            if (inPool.length !== 1) {
                throw Object.assign(new Error('personal split requires exactly one beneficiary'), { status: 422 });
            }
            return { memberships: inPool, weights: [1], mode };
        }
        default:
            throw Object.assign(new Error(`Unknown split mode: ${mode}`), { status: 422 });
    }
};

/**
 * Allocate one expense line. Returns the created Allocation doc.
 */
export const allocateLine = async ({
    groupId, expense, line = null, lineTotal, category, memberships,
    serviceFrom, serviceTo, userId, reversalOf = null,
}) => {
    const { memberships: pool, weights, mode, exactTotal } = await buildWeights({
        groupId, line, category, memberships, serviceFrom, serviceTo,
    });

    if (exactTotal !== undefined && exactTotal !== lineTotal) {
        throw Object.assign(
            new Error(`Fixed allocations (${exactTotal}) must equal the line total (${lineTotal})`),
            { status: 422 }
        );
    }

    const charges = allocateByWeights(lineTotal, weights);

    return Allocation.create({
        groupId,
        expenseId: expense._id,
        lineId: line ? line._id : null,
        poolKind: mode,
        total: lineTotal,
        entries: pool.map((m, i) => ({ membershipId: m._id, weight: weights[i], charge: charges[i] })),
        reversalOf,
        createdBy: userId,
    });
};

/** Allocate every line of an approved expense (or the legacy aggregate amount). */
export const allocateExpense = async ({ groupId, expense, memberships, userId }) => {
    const serviceFrom = expense.serviceStart || new Date(expense.date);
    const serviceTo = expense.serviceEnd || new Date(new Date(expense.date).getTime() + 86400000);

    const allocations = [];
    if (expense.lines?.length) {
        for (const line of expense.lines) {
            const category = await import('../models/ExpenseCategory.js').then(m => m.default.findById(line.categoryId).lean());
            allocations.push(await allocateLine({
                groupId, expense, line, lineTotal: line.amount, category,
                memberships, serviceFrom, serviceTo, userId,
            }));
        }
    } else {
        const category = expense.categoryId
            ? await import('../models/ExpenseCategory.js').then(m => m.default.findById(expense.categoryId).lean())
            : null;
        allocations.push(await allocateLine({
            groupId, expense, line: null, lineTotal: expense.amount, category,
            memberships, serviceFrom, serviceTo, userId,
        }));
    }

    const allocated = sumPoisha(allocations.map(a => a.total));
    if (allocated !== expense.amount) {
        throw Object.assign(new Error(`Allocation total ${allocated} != expense total ${expense.amount}`), { status: 422 });
    }
    return allocations;
};

/** Sum a member's allocations for a month from Allocation docs (poisha). */
export const sumAllocationsFor = (allocations, membershipId) => {
    let total = 0;
    for (const a of allocations) {
        for (const e of a.entries) {
            if (String(e.membershipId) === String(membershipId)) total += e.charge;
        }
    }
    return total;
};
