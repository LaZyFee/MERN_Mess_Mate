import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import { expenseEntrySchema, expenseUpdateSchema, idParamSchema, monthParamSchema, expenseFilterQuerySchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const monthOf = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

            const expenses = await Expense.find(filter)
                .populate('userId', 'username')
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
            .populate('userId', 'username')
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
