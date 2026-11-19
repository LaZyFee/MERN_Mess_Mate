import Statement from '../models/Statement.js';
import Period from '../models/Period.js';
import Expense from '../models/Expense.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import Membership from '../models/Membership.js';
import PolicyVersion from '../models/PolicyVersion.js';
import { membershipsInMonth } from './membershipService.js';
import { allocateExpense, sumAllocationsFor } from './allocationService.js';
import { getOrCreatePeriod, finalizeGuard, markFinalized } from './periodService.js';
import { sumPoisha } from '../utils/money.js';
import { withTransaction } from '../utils/transaction.js';
import crypto from 'crypto';

// Statement service — builds the immutable month-end snapshot with versioning
// and supersession, including carry-forward opening balances.

/**
 * Compute the live statement draft for a month (does not persist).
 */
export const buildStatementDraft = async ({ groupId, month }) => {
    const memberships = await membershipsInMonth({ groupId, month });
    const expenses = await Expense.find({
        groupId, status: 'approved', costPeriod: month, isReversal: { $ne: true },
    }).lean();
    const transactions = await MoneyTransaction.find({
        groupId, status: 'confirmed',
        $or: [{ paidAt: { $gte: new Date(`${month}-01`), $lt: new Date(new Date(`${month}-01T00:00:00Z`).setUTCMonth(new Date(`${month}-01T00:00:00Z`).getUTCMonth() + 1)) } }],
    }).populate('fromMember toMember', 'displayName').lean();

    // allocate all approved expenses
    let mealExpenses = 0;
    let otherExpenses = 0;
    const perMember = new Map(); // membershipId -> { mealCost, otherCost }
    const ensure = (id, name) => {
        const key = String(id);
        if (!perMember.has(key)) perMember.set(key, { mealCost: 0, otherCost: 0, displayName: name });
        return perMember.get(key);
    };
    for (const m of memberships) ensure(m._id, m.displayName);

    for (const expense of expenses) {
        const allocations = await allocateExpense({
            groupId, expense,
            memberships,
            userId: expense.approvedBy,
        });
        for (const alloc of allocations) {
            const isFood = alloc.poolKind === 'meal_units';
            if (isFood) mealExpenses += alloc.total; else otherExpenses += alloc.total;
            for (const e of alloc.entries) {
                const bucket = ensure(e.membershipId, 'Member');
                if (isFood) bucket.mealCost += e.charge;
                else bucket.otherCost += e.charge;
            }
        }
    }

    // confirmed money movements per member
    const totalUnits = 0; // computed per-member below from meals
    const mealDocs = await (await import('../models/Meal.js')).default.find({
        groupId,
        date: { $gte: new Date(`${month}-01`), $lt: new Date(new Date(`${month}-01T00:00:00Z`).setUTCMonth(new Date(`${month}-01T00:00:00Z`).getUTCMonth() + 1)) },
    }).lean();
    const unitsByUser = new Map();
    for (const meal of mealDocs) {
        unitsByUser.set(String(meal.userId), (unitsByUser.get(String(meal.userId)) || 0) + (meal.lunch || 0) + (meal.dinner || 0));
    }

    const openingCredits = new Map();
    for (const m of memberships) {
        // opening = closing of the latest prior statement for this membership
        const prior = await Statement.findOne({
            groupId,
            state: 'current',
            month: { $lt: month },
            'items.membershipId': m._id,
        }).sort({ month: -1, version: -1 }).lean();
        const priorItem = prior?.items?.find(i => String(i.membershipId) === String(m._id));
        openingCredits.set(String(m._id), priorItem?.closingCredit || 0);
    }

    const items = memberships.map(m => {
        const key = String(m._id);
        const b = perMember.get(key) || { mealCost: 0, otherCost: 0 };
        const contributions = sumPoisha(transactions.filter(t => t.kind === 'contribution' && t.fromMember && String(t.fromMember._id) === key).map(t => t.amount));
        const personalPayments = sumPoisha(transactions.filter(t => t.kind === 'supplier_payment' && t.fromMember && String(t.fromMember._id) === key).map(t => t.amount));
        const payoutsReceived = sumPoisha(transactions.filter(t => t.kind === 'payout' && t.toMember && String(t.toMember._id) === key).map(t => t.amount));
        const settlementsPaid = sumPoisha(transactions.filter(t => t.kind === 'member_settlement' && t.fromMember && String(t.fromMember._id) === key).map(t => t.amount));
        const settlementsReceived = sumPoisha(transactions.filter(t => t.kind === 'member_settlement' && t.toMember && String(t.toMember._id) === key).map(t => t.amount));

        const openingCredit = openingCredits.get(key) || 0;
        const totalCharge = b.mealCost + b.otherCost;
        const closingCredit = openingCredit
            + contributions + personalPayments + settlementsPaid
            - settlementsReceived - payoutsReceived
            - totalCharge;

        return {
            membershipId: m._id,
            displayName: m.displayName,
            mealUnits: m.user ? (unitsByUser.get(String(m.user)) || 0) : 0,
            mealCost: b.mealCost,
            otherCost: b.otherCost,
            totalCharge,
            contributions,
            personalPayments,
            settlementsPaid,
            settlementsReceived,
            payoutsReceived,
            openingCredit,
            closingCredit,
            status: closingCredit > 0 ? 'receives' : closingCredit < 0 ? 'owes' : 'settled',
        };
    });

    const totalExpenses = mealExpenses + otherExpenses;
    const totalMeals = sumPoisha(items.map(i => Math.round(i.mealUnits * 1000))); // keep integer domain
    const mealRate = mealExpenses > 0 && totalMeals > 0 ? Math.round((mealExpenses / totalMeals) * 1000) : null;

    return {
        memberships, items, mealExpenses, otherExpenses, totalExpenses,
        totalUnits: sumPoisha(items.map(i => i.mealUnits)),
        mealRate, transactions,
    };
};

/**
 * Persist a finalized Statement (versioned). If a current statement exists for
 * the month, a new version supersedes it (never overwrite).
 */
export const finalizeStatement = async ({ groupId, month, expectedRevision, userId, reason = '' }) => {
    return await withTransaction(async (session) => {
        const period = await getOrCreatePeriod({ groupId, month, userId });
        const guarded = await finalizeGuard({ groupId, month, expectedRevision });
        if (guarded.state === 'finalized' && !reason) {
            throw Object.assign(new Error('Period already finalized; use the correction process'), { status: 409 });
        }

        const draft = await buildStatementDraft({ groupId, month });
        if (draft.items.length === 0) {
            throw Object.assign(new Error('No active memberships in this month — nothing to finalize'), { status: 422 });
        }

        // versioning: next version, supersede old
        const latest = await Statement.findOne({ groupId, month }).sort({ version: -1 }).session(session);
        const version = (latest?.version || 0) + 1;

        const policy = await PolicyVersion.findOne({ groupId }).sort({ effectiveFrom: -1, version: -1 }).session(session).lean();

        const [statement] = await Statement.create([{
            groupId,
            month,
            version,
            state: 'current',
            supersedes: latest?._id || null,
            totalMeals: draft.totalUnits,
            mealExpenses: draft.mealExpenses,
            otherExpenses: draft.otherExpenses,
            totalExpenses: draft.totalExpenses,
            mealRate: draft.mealRate,
            policySnapshot: policy || {},
            membershipSnapshot: draft.memberships.map(m => ({
                membershipId: m._id, userId: m.user, displayName: m.displayName,
                role: m.role, startDate: m.startDate, endDate: m.endDate,
            })),
            items: draft.items,
            sourceHash: crypto.createHash('sha256')
                .update(JSON.stringify({ month, items: draft.items, totalExpenses: draft.totalExpenses }))
                .digest('hex'),
            finalizedBy: userId,
            finalizedAt: new Date(),
            reason,
        }], { session });

        if (latest) {
            await Statement.findByIdAndUpdate(latest._id, { state: 'superseded', supersededBy: statement._id }, { session });
        }

        await markFinalized({ periodId: period._id, statementId: statement._id, userId });
        return statement;
    });
};
