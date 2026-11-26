import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import {
    getShoppingList, addItem, toggleItem, removeItem, toExpense, listHistory,
} from '../controllers/shoppingListController.js';
import {
    shoppingItemSchema, shoppingItemCheckSchema, shoppingToExpenseSchema,
    shoppingItemIdParam, featureGroupParam,
} from '../validation/featureSchemas.js';

const router = express.Router();
router.use(auth);

// Shopping list
router.get('/groups/:groupId', validate(featureGroupParam, 'params'), requireGroupRoleV2('member'), getShoppingList);
router.post('/groups/:groupId/items', validate(featureGroupParam, 'params'), validate(shoppingItemSchema), requireGroupRoleV2('member'), addItem);
router.patch('/groups/:groupId/items/:itemId', validate(featureGroupParam, 'params'), validate(shoppingItemIdParam, 'params'), validate(shoppingItemCheckSchema), requireGroupRoleV2('member'), toggleItem);
router.delete('/groups/:groupId/items/:itemId', validate(featureGroupParam, 'params'), validate(shoppingItemIdParam, 'params'), requireGroupRoleV2('member'), removeItem);
router.post('/groups/:groupId/to-expense', validate(featureGroupParam, 'params'), validate(shoppingToExpenseSchema), requireGroupRoleV2('member'), toExpense);
router.get('/groups/:groupId/history', validate(featureGroupParam, 'params'), requireGroupRoleV2('member'), listHistory);

export default router;
