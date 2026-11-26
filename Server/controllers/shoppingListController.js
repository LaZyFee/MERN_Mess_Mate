import ShoppingList from '../models/ShoppingList.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Membership from '../models/Membership.js';
import IdempotencyRecord from '../models/IdempotencyRecord.js';
import { audit } from '../models/AuditEvent.js';
import { notify } from '../services/inboxService.js';
import { objectIdSchema } from '../validation/schemas.js';
import {
    shoppingItemSchema as itemSchema, shoppingListCreateSchema as listCreateSchema,
    shoppingItemCheckSchema as itemCheckSchema, shoppingToExpenseSchema as toExpenseSchema,
} from '../validation/featureSchemas.js';
import { withTransaction } from '../utils/transaction.js';

const emitGroup = (req, event, payload) => {
    const io = req.app?.get('io');
    if (io && payload && payload.groupId) io.to(`group:${payload.groupId}`).emit(event, payload);
};

// GET /api/shopping-list/groups/:groupId — active/open list
export const getShoppingList = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        let list = await ShoppingList.findOne({ groupId, status: 'open' }).sort({ updatedAt: -1 }).lean();
        if (!list) {
            list = await ShoppingList.create({ groupId, title: 'Bazar List', createdBy: req.user.id });
            await audit({ groupId, actorId: req.user.id, action: 'shoppingList.created', targetType: 'shoppingList', targetId: list._id });
        }
        res.json({ list });
    } catch (err) { next(err); }
};

// POST /api/shopping-list/groups/:groupId/items — add item
export const addItem = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const parsed = itemSchema.parse(req.body);
        const membership = await Membership.findOne({ groupId, user: req.user.id }).lean();
        const list = await ShoppingList.findOne({ groupId, status: 'open' });
        if (!list) return res.status(404).json({ msg: 'No open shopping list' });

        list.items.push({
            ...parsed,
            addedBy: req.user.id,
            addedByName: membership?.displayName || req.user.username || 'Member',
        });
        await list.save();
        await audit({ groupId, actorId: req.user.id, action: 'shoppingList.itemAdded', targetType: 'shoppingList', targetId: list._id, after: { item: parsed.name } });
        emitGroup(req, 'shoppingList-updated', { groupId, listId: list._id });
        res.status(201).json({ list });
    } catch (err) { next(err); }
};

// PATCH /api/shopping-list/groups/:groupId/items/:itemId — check/uncheck item
export const toggleItem = async (req, res, next) => {
    try {
        const { groupId, itemId } = req.params;
        const { checked } = itemCheckSchema.parse(req.body);
        const list = await ShoppingList.findOne({ groupId, status: 'open' });
        if (!list) return res.status(404).json({ msg: 'No open shopping list' });

        const item = list.items.id(itemId);
        if (!item) return res.status(404).json({ msg: 'Item not found' });
        item.checked = checked;
        item.checkedBy = checked ? req.user.id : null;
        item.checkedAt = checked ? new Date() : null;
        await list.save();
        await audit({ groupId, actorId: req.user.id, action: 'shoppingList.itemToggled', targetType: 'shoppingList', targetId: list._id, after: { itemId, checked } });
        emitGroup(req, 'shoppingList-updated', { groupId, listId: list._id });
        res.json({ list });
    } catch (err) { next(err); }
};

// DELETE /api/shopping-list/groups/:groupId/items/:itemId
export const removeItem = async (req, res, next) => {
    try {
        const { groupId, itemId } = req.params;
        const list = await ShoppingList.findOne({ groupId, status: 'open' });
        if (!list) return res.status(404).json({ msg: 'No open shopping list' });
        list.items.pull(itemId);
        await list.save();
        await audit({ groupId, actorId: req.user.id, action: 'shoppingList.itemRemoved', targetType: 'shoppingList', targetId: list._id, after: { itemId } });
        emitGroup(req, 'shoppingList-updated', { groupId, listId: list._id });
        res.json({ msg: 'Item removed' });
    } catch (err) { next(err); }
};

// POST /api/shopping-list/groups/:groupId/to-expense — convert checked items to expense draft
export const toExpense = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { expenseDescription, categoryId, paidBy } = toExpenseSchema.parse(req.body);
        const idempotencyKey = req.header('Idempotency-Key');
        const sourceId = idempotencyKey || null;

        const result = await withTransaction(async (session) => {
            // Idempotency: check for existing record with this sourceId
            if (sourceId) {
                const existing = await IdempotencyRecord.findOne({
                    groupId, actorId: req.user.id, operation: 'shoppingList.toExpense', sourceId,
                }).session(session);
                if (existing) {
                    if (existing.resultBody) {
                        return { idempotentReplay: true, status: existing.resultType >= 400 ? existing.resultType : 200, body: existing.resultBody };
                    }
                    return { idempotentReplay: true, status: 409, body: { msg: 'Request with this key is still processing' } };
                }
                await IdempotencyRecord.create([{
                    groupId, actorId: req.user.id, operation: 'shoppingList.toExpense', sourceId,
                    key: sourceId,
                    requestHash: 'pending',
                    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
                }], { session });
            }

            const list = await ShoppingList.findOne({ groupId, status: 'open' }).session(session);
            if (!list) return { status: 404, body: { msg: 'No open shopping list' } };

            const checkedItems = list.items.filter(i => i.checked);
            if (checkedItems.length === 0) return { status: 422, body: { msg: 'No checked items to convert' } };

            let cat = null;
            if (categoryId) {
                cat = await ExpenseCategory.findOne({ _id: categoryId, groupId }).session(session).lean();
                if (!cat) return { status: 404, body: { msg: 'Category not found' } };
            }
            if (!cat) {
                cat = await ExpenseCategory.findOne({ groupId, name: /^Bazar/i }).session(session).lean();
            }
            if (!cat) {
                cat = await ExpenseCategory.findOne({ groupId, isFoodPool: true }).session(session).lean();
            }

            if (!cat || checkedItems.some(i => !Number.isSafeInteger(i.estimatedPricePoisha) || i.estimatedPricePoisha <= 0)) {
                return { status: 422, body: { msg: 'Select a category and price each checked item before conversion' } };
            }
            const totalPoisha = checkedItems.reduce((s, i) => s + (i.estimatedPricePoisha || 0), 0);

            const [expense] = await Expense.create([{
                groupId,
                createdBy: req.user.id,
                status: 'draft',
                description: expenseDescription,
                date: new Date(),
                costPeriod: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7),
                month: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7),
                amount: totalPoisha,
                lines: checkedItems.map(i => ({
                    description: i.name,
                    categoryId: cat ? cat._id : undefined,
                    amount: i.estimatedPricePoisha || 0,
                    splitMode: 'meal_units',
                })),
                isPayable: true,
                paidTotal: 0,
            }], { session });

            list.status = 'closed';
            list.expenseDraftId = expense._id;
            list.closedAt = new Date();
            list.closedBy = req.user.id;
            await list.save({ session });

            await audit({ groupId, actorId: req.user.id, action: 'shoppingList.convertedToExpense', targetType: 'shoppingList', targetId: list._id, after: { expenseId: expense._id } });

            // Update idempotency record with result
            if (sourceId) {
                await IdempotencyRecord.updateOne(
                    { groupId, actorId: req.user.id, operation: 'shoppingList.toExpense', sourceId },
                    { resultBody: { expense, list }, resultType: 201 },
                    { session }
                );
            }

            return { status: 201, body: { expense, list } };
        });

        if (result.idempotentReplay) {
            return res.status(result.status).json({ ...result.body, __idempotentReplay: true });
        }
        if (result.status !== 201) {
            return res.status(result.status).json(result.body);
        }

        emitGroup(req, 'shoppingList-updated', { groupId, listId: result.body.list._id, expenseId: result.body.expense._id });
        res.status(201).json(result.body);
    } catch (err) { next(err); }
};

// GET /api/shopping-list/groups/:groupId/history — past lists
export const listHistory = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const lists = await ShoppingList.find({ groupId }).sort({ createdAt: -1 }).limit(50).lean();
        res.json({ lists });
    } catch (err) { next(err); }
};

export const shoppingListSchemas = { itemSchema, listCreateSchema, itemCheckSchema, toExpenseSchema };