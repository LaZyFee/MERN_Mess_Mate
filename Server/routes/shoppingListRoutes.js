import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import {
    getShoppingList, addItem, toggleItem, removeItem, toExpense, listHistory,
} from '../controllers/shoppingListController.js';
import { objectIdSchema } from '../validation/schemas.js';
import { z } from 'zod';

const itemSchema = z.object({
    name: z.string().trim().min(1).max(120),
    quantity: z.string().trim().max(40).optional().default(''),
    unit: z.string().trim().max(20).optional().default(''),
    estimatedPricePoisha: z.number().int().nonnegative().optional().default(0),
    note: z.string().trim().max(300).optional().default(''),
});

const itemCheckSchema = z.object({
    itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id'),
    checked: z.boolean(),
});

const toExpenseSchema = z.object({
    expenseDescription: z.string().trim().min(1).max(200).optional().default('Bazar (from shopping list)'),
    categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category id').optional(),
    paidBy: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id').optional(),
});

const groupIdParam = z.object({ groupId: objectIdSchema });
const itemIdParam = z.object({ itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id') });

const router = express.Router();
router.use(auth);

// Shopping list
router.get('/groups/:groupId', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), getShoppingList);
router.post('/groups/:groupId/items', validate(groupIdParam, 'params'), validate(itemSchema), requireGroupRoleV2('member'), addItem);
router.patch('/groups/:groupId/items/:itemId', validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(itemCheckSchema), requireGroupRoleV2('member'), toggleItem);
router.delete('/groups/:groupId/items/:itemId', validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), requireGroupRoleV2('member'), removeItem);
router.post('/groups/:groupId/to-expense', validate(groupIdParam, 'params'), validate(toExpenseSchema), requireGroupRoleV2('member'), toExpense);
router.get('/groups/:groupId/history', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listHistory);

export default router;