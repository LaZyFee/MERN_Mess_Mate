import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Membership from '../models/Membership.js';
import { allocateExpense } from '../services/allocationService.js';
import { postJournal, reverseJournal } from '../services/ledgerService.js';
import Journal from '../models/Journal.js';
import { ensureOpen, bumpRevision } from '../services/periodService.js';
import { audit } from '../models/AuditEvent.js';
import { withTransaction } from '../utils/transaction.js';
import { checkDuplicateExpense } from '../services/duplicateDetection.js';
import { paginateQuery } from '../utils/pagination.js';
import {
    expenseEntrySchema,
    expenseUpdateSchema,
    idParamSchema,
    expenseFilterQuerySchema,
} from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import { MEMBER_VISIBLE_FIELDS } from '../middleware/privacy.js';

const monthOf = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const poishaOrNull = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'string' ? Number(v) : v;
    if (!Number.isSafeInteger(n) || n < 1) {
        throw Object.assign(new Error('Amounts must be integer poisha (e.g. 123450 for ৳1,234.50)'), { status: 400 });
    }
    return n;
};

// Shared: build a Mongo filter from validated query params (month OR from/to range)
const buildFilter = (groupId, q = {}) => {
    const filter = { groupId };
    if (q.month) {
        filter.month = q.month;
    } else if (q.from || q.to) {
        filter.date = {};
        if (q.from) filter.date.$gte = q.from;
        if (q.to) filter.date.$lte = q.to;
    }
    if (q.userId) filter.userId = q.userId;
    if (q.categoryId) filter.categoryId = q.categoryId;
    if (q.category) filter.category = q.category;
    return filter;
};

// ============================================================
// ledger workflow (draft → submit → approve → reject → reverse)
// Mounted under /api/groups/:groupId/expenses
// ============================================================

/** POST /api/groups/:groupId/expenses — create draft */
export const createExpense = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const {
            supplierName = '', description = '', date, costPeriod,
            serviceStart = null, serviceEnd = null,
            lines = [], isPayable = false, receiptReference = '',
        } = req.body;

        if (!Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ msg: 'At least one line item is required' });
        }
        for (const l of lines) {
            poishaOrNull(l.amount);
            if (l.splitMode === 'fixed_amounts' && !(l.fixedAmounts || []).length) {
                return res.status(422).json({ msg: 'fixed_amounts lines require fixedAmounts[]' });
            }
        }
        const total = lines.reduce((s, l) => s + Number(l.amount), 0);
        if (total <= 0) return res.status(422).json({ msg: 'Expense total must be positive' });

        const periodMonth = costPeriod || monthOf(date);
        await ensureOpen({ groupId, month: periodMonth });

        const expense = await Expense.create({
            groupId,
            createdBy: req.user.id,
            status: 'draft',
            supplierName,
            description,
            date: new Date(date),
            serviceStart: serviceStart ? new Date(serviceStart) : null,
            serviceEnd: serviceEnd ? new Date(serviceEnd) : null,
            costPeriod: periodMonth,
            month: periodMonth, // legacy field kept in sync
            amount: total,
            lines,
            isPayable,
            paidTotal: 0,
            receiptReference,
            categoryId: lines[0].categoryId, // legacy back-compat
        });

        await audit({ groupId, actorId: req.user.id, action: 'expense.created', targetType: 'expense', targetId: expense._id, after: { total, status: 'draft' } });

        // Duplicate warning check (Doc §6, §16)
        const duplicateCheck = await checkDuplicateExpense({
            groupId,
            supplierName,
            amount: total,
            date: new Date(date),
            receiptReference,
            excludeExpenseId: expense._id,
        });

        res.status(201).json({
            msg: 'Expense draft created',
            expense,
            duplicateWarnings: duplicateCheck.hasWarnings ? duplicateCheck.warnings : undefined,
        });
    } catch (err) {
        if (err.status === 409 || err.status === 400) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/groups/:groupId/expenses/:expenseId/submit */
export const submitExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.expenseId, groupId: req.params.groupId });
        if (!expense) return res.status(404).json({ msg: 'Expense not found' });
        if (expense.status !== 'draft') return res.status(409).json({ msg: `Cannot submit from state: ${expense.status}` });

        expense.status = 'submitted';
        expense.submittedAt = new Date();
        expense.revision += 1;
        await expense.save();

        await audit({ groupId: expense.groupId, actorId: req.user.id, action: 'expense.submitted', targetType: 'expense', targetId: expense._id });

        const duplicateCheck = await checkDuplicateExpense({
            groupId: expense.groupId,
            supplierName: expense.supplierName,
            amount: expense.amount,
            date: expense.date,
            receiptReference: expense.receiptReference,
            excludeExpenseId: expense._id,
        });

        res.json({
            msg: 'Expense submitted for approval',
            expense,
            duplicateWarnings: duplicateCheck.hasWarnings ? duplicateCheck.warnings : undefined,
        });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/expenses/:expenseId/approve — treasurer/manager; posts the journal */
export const approveExpense = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const result = await withTransaction(async (session) => {
            const expense = await Expense.findOne({ _id: req.params.expenseId, groupId }).session(session);
            if (!expense) throw Object.assign(new Error('Expense not found'), { status: 404 });
            if (expense.status !== 'submitted') throw Object.assign(new Error(`Cannot approve from state: ${expense.status}`), { status: 409 });

            await ensureOpen({ groupId, month: expense.costPeriod, session });

            // self-approval flag: if approver owns a paying/beneficiary line
            const memberships = await Membership.find({ groupId }).session(session).lean();
            const active = memberships.filter(m => !m.endDate || new Date(m.endDate) > new Date());
            const own = active.find(m => m.user && String(m.user) === req.user.id);
            const selfApproval = Boolean(own) && req.body?.reason ? false : Boolean(own);
            if (selfApproval && !(req.body?.reason)) {
                // self-approval allowed only with an explicit reason (single-reviewer disclosure)
                expense.approvedBy = req.user.id;
            }

            // allocate lines exactly
            const allocations = await allocateExpense({
                groupId, expense, memberships: active, userId: req.user.id,
            });

            // post journal: debit cost clearing / credit payer(s) or supplier payable
            const lines = [];
            const payers = expense.payers?.length
                ? expense.payers
                : [{ memberId: own?._id || null, amount: expense.amount, fundAccountId: null }];

            for (const payer of payers) {
                lines.push({
                    accountType: 'member',
                    memberId: payer.memberId,
                    direction: 'debit', // member gave money → their control account is debited (they are owed)
                    amount: Number(payer.amount),
                    memo: `Paid ${expense.supplierName || 'supplier'}`,
                });
            }
            const payersTotal = payers.reduce((s, p) => s + Number(p.amount), 0);
            if (payersTotal !== expense.amount) {
                throw Object.assign(new Error(`Payer amounts (${payersTotal}) must equal expense total (${expense.amount})`), { status: 422 });
            }
            for (const alloc of allocations) {
                lines.push({
                    accountType: 'clearing',
                    clearingName: alloc.poolKind === 'meal_units' ? 'food_clearing' : 'other_clearing',
                    direction: 'credit',
                    amount: alloc.total,
                    memo: `Allocated ${alloc.poolKind}`,
                });
            }

            const journal = await postJournal({
                groupId,
                sourceType: 'expense',
                sourceId: expense._id,
                sourceRevision: expense.revision,
                costPeriod: expense.costPeriod,
                lines,
                postedBy: req.user.id,
                memo: `Expense: ${expense.description || expense.supplierName || 'approved'}`,
                session,
            });

            expense.status = 'approved';
            expense.approvedBy = req.user.id;
            expense.approvedAt = new Date();
            expense.revision += 1;
            await expense.save({ session });

            await bumpRevision({ groupId, month: expense.costPeriod, session });
            await audit({ groupId, actorId: req.user.id, action: 'expense.approved', targetType: 'expense', targetId: expense._id, reason: req.body?.reason || '' });

            return { expense, journalId: journal._id, selfApproved: selfApproval };
        });

        res.json({ msg: 'Expense approved and posted', ...result });
    } catch (err) {
        if (err.status === 409 || err.status === 422 || err.status === 404) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/groups/:groupId/expenses/:expenseId/reject */
export const rejectExpense = async (req, res, next) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.expenseId, groupId: req.params.groupId });
        if (!expense) return res.status(404).json({ msg: 'Expense not found' });
        if (expense.status !== 'submitted') return res.status(409).json({ msg: `Cannot reject from state: ${expense.status}` });

        expense.status = 'rejected';
        expense.rejectedBy = req.user.id;
        expense.rejectionReason = req.body?.reason || '';
        expense.revision += 1;
        await expense.save();

        await audit({ groupId: expense.groupId, actorId: req.user.id, action: 'expense.rejected', targetType: 'expense', targetId: expense._id, reason: expense.rejectionReason });
        res.json({ msg: 'Expense rejected', expense });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/expenses/:expenseId/reverse — approved → reversal row + mirror journal */
export const reverseExpense = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const result = await withTransaction(async (session) => {
            const expense = await Expense.findOne({ _id: req.params.expenseId, groupId }).session(session);
            if (!expense) throw Object.assign(new Error('Expense not found'), { status: 404 });
            if (expense.status !== 'approved') throw Object.assign(new Error('Only approved expenses can be reversed'), { status: 409 });
            if (!req.body?.reason) throw Object.assign(new Error('Reversal requires a reason'), { status: 422 });

            const original = await Journal.findOne({ sourceType: 'expense', sourceId: expense._id, postingKind: 'original' }).session(session);
            if (original) await reverseJournal({ journal: original, reason: req.body.reason, postedBy: req.user.id, session });

            const reversal = await Expense.create([{
                groupId,
                createdBy: req.user.id,
                status: 'reversed',
                isReversal: true,
                reversedExpenseId: expense._id,
                description: `Reversal: ${expense.description || ''}`,
                date: new Date(),
                costPeriod: expense.costPeriod,
                month: expense.costPeriod,
                amount: expense.amount,
                lines: expense.lines,
                categoryId: expense.categoryId,
                supplierName: expense.supplierName,
                reversalReason: req.body.reason,
            }], { session });

            expense.status = 'reversed';
            expense.reversedBy = req.user.id;
            expense.reversalReason = req.body.reason;
            expense.revision += 1;
            await expense.save({ session });

            await bumpRevision({ groupId, month: expense.costPeriod, session });
            await audit({ groupId, actorId: req.user.id, action: 'expense.reversed', targetType: 'expense', targetId: expense._id, reason: req.body.reason });

            return { reversalId: reversal[0]._id };
        });

        res.json({ msg: 'Expense reversed (mirrored journal posted)', ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

/** GET /api/groups/:groupId/expenses?status=&costPeriod=&payable=1&cursor=&limit= */
export const listExpenses = async (req, res, next) => {
    try {
        const filter = { groupId: req.params.groupId, isReversal: { $ne: true } };
        if (req.validated?.query?.status) filter.status = req.validated.query.status;
        if (req.validated?.query?.costPeriod) filter.costPeriod = req.validated.query.costPeriod;
        if (req.validated?.query?.payable === true || req.validated?.query?.payable === 'true') filter.isPayable = true;

        const { cursor, limit } = req.query;
        if (cursor || limit) {
            const page = await paginateQuery({
                model: Expense,
                filter,
                cursor,
                limit,
                sortField: '_id',
                sortOrder: -1,
            });
            return res.json({ expenses: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore });
        }

        const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
        res.json({ expenses });
    } catch (err) { next(err); }
};

// ============================================================
// Legacy /api/expenses entry API
// ============================================================

// POST /api/expenses/:groupId
// Body: { date?, amount, description?, categoryId, category? }
// categoryId is required and must belong to this group; its name is copied
// into `category` as a display label (server-derived, never trusted from client).
export const addExpense = [
    validate(expenseEntrySchema),
    async (req, res, next) => {
        try {
            const { amount, description, categoryId } = req.body;
            const date = req.body.date || new Date();

            const cat = await ExpenseCategory.findOne({ _id: categoryId, groupId: req.params.groupId });
            if (!cat) return res.status(400).json({ msg: 'Invalid categoryId for this group' });

            const expense = await Expense.create({
                groupId: req.params.groupId,
                userId: req.user.id,
                date,
                amount,
                description,
                categoryId,
                category: cat.name, // server-derived label
                month: monthOf(date),
            });

            res.status(201).json(expense);

            // Realtime: notify everyone in the group room
            req.app.get('io')?.to(`group:${req.params.groupId}`).emit('expense-updated', {
                groupId: req.params.groupId, expenseId: expense._id, userId: expense.userId,
            });
        } catch (err) {
            next(err);
        }
    },
];

// PUT /api/expenses/entry/:id — payer can edit
export const updateExpense = [
    validate(idParamSchema, 'params'),
    validate(expenseUpdateSchema),
    async (req, res, next) => {
        try {
            const expense = await Expense.findOne({ _id: req.params.id, userId: req.user.id });
            if (!expense) return res.status(404).json({ msg: 'Expense not found' });

            const updates = { ...req.body };
            if (updates.categoryId) {
                const cat = await ExpenseCategory.findOne({ _id: updates.categoryId, groupId: expense.groupId });
                if (!cat) return res.status(400).json({ msg: 'Invalid categoryId for this group' });
                updates.category = cat.name; // keep display label in sync
            }
            if (updates.date) updates.month = monthOf(updates.date);

            Object.assign(expense, updates);
            await expense.save();
            res.json(expense);
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/expenses/:groupId?month=YYYY-MM | ?from=&to=  |  &userId=&categoryId=&category=
export const getExpenses = [
    validate(expenseFilterQuerySchema, 'query'),
    async (req, res, next) => {
        try {
            const filter = buildFilter(req.params.groupId, req.validated?.query || {});
            // Ex-member history cutoff (privacy guard)
            if (req.historyFrom || req.historyTo) {
                filter.date = {
                    ...(filter.date || {}),
                    ...(req.historyFrom ? { $gte: req.historyFrom } : {}),
                    ...(req.historyTo ? { $lte: req.historyTo } : {}),
                };
            }

            const expenses = await Expense.find(filter)
                .populate('userId', MEMBER_VISIBLE_FIELDS)
                .populate('categoryId', 'name icon splitMode')
                .sort({ date: 1 })
                .lean();

            res.json(expenses);
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/expenses/:groupId/:month — legacy month path
export const getExpensesByMonth = async (req, res, next) => {
    try {
        const expenses = await Expense.find({ groupId: req.params.groupId, month: req.params.month })
            .populate('userId', MEMBER_VISIBLE_FIELDS)
            .populate('categoryId', 'name icon splitMode')
            .sort({ date: 1 })
            .lean();
        res.json(expenses);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/expenses/entry/:id — payer or group admin
export const deleteExpense = [
    validate(idParamSchema, 'params'),
    async (req, res, next) => {
        try {
            const expense = await Expense.findById(req.params.id);
            if (!expense) return res.status(404).json({ msg: 'Expense not found' });

            if (!expense.userId.equals(req.user.id) && !req.canEditOthers) {
                return res.status(403).json({ msg: 'Not allowed to delete this expense' });
            }

            await expense.deleteOne();
            res.json({ msg: 'Expense deleted' });
        } catch (err) {
            next(err);
        }
    },
];
