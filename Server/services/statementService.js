import Statement from '../models/Statement.js';
import Period from '../models/Period.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import Membership from '../models/Membership.js';
import PolicyVersion from '../models/PolicyVersion.js';
import MessGroup from '../models/MessGroup.js';
import GuestMeal from '../models/GuestMeal.js';
import Meal from '../models/Meal.js';
import NotificationOutbox from '../models/NotificationOutbox.js';
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
export const buildStatementDraft = async ({ groupId, month, session }) => {
    const memberships = await membershipsInMonth({ groupId, month, session });
    const expenses = await Expense.find({
        groupId, status: 'approved', costPeriod: month, isReversal: { $ne: true },
    }).session(session).lean();
    const transactions = await MoneyTransaction.find({
        groupId, status: 'confirmed',
        $or: [{ paidAt: { $gte: new Date(`${month}-01`), $lt: new Date(new Date(`${month}-01T00:00:00Z`).setUTCMonth(new Date(`${month}-01T00:00:00Z`).getUTCMonth() + 1)) } }],
    }).populate('fromMember toMember', 'displayName').session(session).lean();

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);

    // ---- batch preloads (S4.5): one query per input set instead of N+1 ----
    const group = await MessGroup.findById(groupId).session(session).lean();
    const policy = await PolicyVersion.findOne({ groupId, effectiveFrom: { $lte: month } }).sort({ effectiveFrom: -1, version: -1 }).session(session).lean();
    const categories = await ExpenseCategory.find({
        _id: { $in: [...new Set(expenses.flatMap(e => (e.lines || []).map(l => l.categoryId).concat(e.categoryId || [])))] },
    }).session(session).lean();
    const categoryById = new Map(categories.map(c => [String(c._id), c]));

    // one query for every prior current statement below this month
    const priorStatements = await Statement.find({
        groupId, state: 'current', month: { $lt: month },
    }).sort({ month: -1, version: -1 }).session(session).lean();
    const openingByMember = new Map();
    for (const stmt of priorStatements) {
        for (const item of stmt.items || []) {
            const key = String(item.membershipId);
            if (!openingByMember.has(key)) openingByMember.set(key, item.closingCredit || 0); // latest month first
        }
    }

    // allocate all approved expenses (categories + meal units are shared across expenses)
    let mealExpenses = 0;
    let otherExpenses = 0;
    const perMember = new Map(); // membershipId -> { mealCost, otherCost }
    const ensure = (id, name) => {
        const key = String(id);
        if (!perMember.has(key)) perMember.set(key, { mealCost: 0, otherCost: 0, displayName: name });
        return perMember.get(key);
    };
    for (const m of memberships) ensure(m._id, m.displayName);

    const allocationCtx = { categoryById, skipRefCheck: true };
    for (const expense of expenses) {
        const allocations = await allocateExpense({
            groupId, expense,
            memberships,
            userId: expense.approvedBy,
            persist: false,
            session,
            ctx: allocationCtx,
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

    // Validate all expected member/slot records. Missing records are unknown,
    // never an implicit zero, and must be resolved before a statement can close.
    const mealDocs = await Meal.find({ groupId, date: { $gte: start, $lt: end } }).session(session).lean();
    const mealByKey = new Map(mealDocs.map(m => [`${m.userId}:${m.date.toISOString().slice(0, 10)}`, m]));
    const enabledSlots = group?.mealSlots?.length ? group.mealSlots : ['breakfast', 'lunch', 'dinner'];
    const slotNames = ['breakfast', 'lunch', 'snacks', 'dinner'];
    for (const membership of memberships) {
        if (!membership.user) continue;
        for (let day = new Date(start); day < end; day.setUTCDate(day.getUTCDate() + 1)) {
            if (day < new Date(membership.startDate) || (membership.endDate && day >= new Date(membership.endDate))) continue;
            const meal = mealByKey.get(`${membership.user}:${day.toISOString().slice(0, 10)}`);
            for (const slot of enabledSlots) {
                if (!meal || !meal[slot] || meal[slot].state === 'unknown') {
                    throw Object.assign(new Error(`Unresolved ${slot} meal for ${membership.displayName} on ${day.toISOString().slice(0, 10)}`), { status: 422 });
                }
            }
        }
    }
    const policyClosure = policy; // policy preloaded above
    const unitsByUser = new Map();
    let universalGuestUnits = 0;
    const addUnits = (key, slot, portionSubunits) => {
        const weightedSubunits = Math.round(portionSubunits * ((policy?.mealWeights?.[slot] ?? group?.mealWeights?.[slot] ?? 1000) / 1000));
        const units = weightedSubunits / 1000;
        if (key) unitsByUser.set(key, (unitsByUser.get(key) || 0) + units);
        return units;
    };
    for (const meal of mealDocs) for (const slot of enabledSlots) {
        if (meal[slot]?.state === 'consumed') addUnits(String(meal.userId), slot, meal[slot].portionSubunits || 0);
    }
    const guests = await GuestMeal.find({ groupId, localDate: { $gte: `${month}-01`, $lt: end.toISOString().slice(0, 10) }, status: 'active' }).session(session).lean();
    for (const guest of guests) {
        const units = addUnits(guest.poolMode === 'individual' ? String(guest.hostUserId) : null, guest.slot, guest.portionSubunits);
        if (guest.poolMode === 'universal') universalGuestUnits += units;
    }

    const openingCredits = new Map();
    for (const m of memberships) {
        // opening = closing of the latest prior statement for this membership
        // (priorStatements was preloaded above, newest month first)
        openingCredits.set(String(m._id), openingByMember.get(String(m._id)) || 0);
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
    const totalMeals = sumPoisha(items.map(i => Math.round(i.mealUnits * 1000))) + Math.round(universalGuestUnits * 1000);
    const mealRate = mealExpenses > 0 && totalMeals > 0 ? Math.round((mealExpenses * 1000) / totalMeals) : null;

    return {
        memberships, items, mealExpenses, otherExpenses, totalExpenses,
        // mealUnits are FRACTIONAL (weighted portions, e.g. 1.25 units), so these
        // must NOT go through sumPoisha() — it rejects non-integers and would make
        // finalization throw 500 on any month with half portions.
        totalUnits: items.reduce((sum, i) => sum + i.mealUnits, 0) + universalGuestUnits,
        universalGuestUnits,
        mealRate, transactions,
    };
};

/**
 * Persist a finalized Statement (versioned). If a current statement exists for
 * the month, a new version supersedes it (never overwrite).
 */
export const finalizeStatement = async ({ groupId, month, expectedRevision, userId, reason = '' }) => {
    return await withTransaction(async (session) => {
        const period = await getOrCreatePeriod({ groupId, month, userId, session });
        const guarded = await finalizeGuard({ groupId, month, expectedRevision, session });
        if (guarded.state === 'finalized' && !reason) {
            throw Object.assign(new Error('Period already finalized; use the correction process'), { status: 409 });
        }

        const draft = await buildStatementDraft({ groupId, month, session });
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

        await markFinalized({
            periodId: period._id,
            statementId: statement._id,
            userId,
            // compare-and-set on the revision observed by finalizeGuard (S4.5)
            expectedRevision: typeof guarded.revisionObserved === 'number' ? guarded.revisionObserved : undefined,
            session,
        });

        // Write outbox rows inside the same transaction (dedupeKey per statement+member)
        const outboxRows = draft.memberships.map(m => ({
            groupId,
            statementId: statement._id,
            membershipId: m._id,
            userId: m.user,
            channel: 'in_app',
            purpose: 'statement',
            dedupeKey: `stmt:${groupId}:${month}:${m._id}`,
            recipientEmail: '',
            recipientWa: '',
            payload: { statementId: String(statement._id), month, displayName: m.displayName },
            state: 'pending',
        }));
        if (outboxRows.length) {
            await NotificationOutbox.insertMany(outboxRows, { session });
        }

        return statement;
    });
};
