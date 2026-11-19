import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { idempotent } from '../middleware/idempotency.js';
import {
    requireGroupRole, allowSelfOrAdmin, requireGroupRoleV2,
} from '../middleware/roles.js';
import {
    addExpense, updateExpense, getExpensesByMonth, deleteExpense, getExpenses,
    createExpense, submitExpense, approveExpense, rejectExpense, reverseExpense, listExpenses,
} from '../controllers/expenseController.js';
import {
    expenseEntrySchema, idParamSchema, monthParamSchema, objectIdParamSchema, expenseFilterQuerySchema,
    groupIdParam, createExpenseSchema, expenseIdParam, reasonBody, listExpenseQuery,
} from '../validation/schemas.js';


const expenseRouter = express.Router();
expenseRouter.use(auth);

// POST /api/expenses/:groupId
expenseRouter.post('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), addExpense);

// PUT /api/expenses/entry/:id — payer only
expenseRouter.put('/entry/:id', validate(idParamSchema, 'params'), updateExpense);

// GET /api/expenses/:groupId?month=&from=&to=&userId=&categoryId=&category= — filtered
expenseRouter.get('/:groupId', validate(expenseFilterQuerySchema, 'query'), requireGroupRole('member'), getExpenses);

// GET /api/expenses/:groupId/:month
expenseRouter.get('/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('member'), getExpensesByMonth);

// DELETE /api/expenses/entry/:id — payer or group admin
expenseRouter.delete('/entry/:id', validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin, deleteExpense);

// ---------- Expenses (workflow) ----------
expenseRouter.get('/groups/:groupId/expenses', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listExpenseQuery, 'query'), listExpenses);
expenseRouter.post('/groups/:groupId/expenses', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(createExpenseSchema), idempotent('expense.create'), createExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/submit', validate(expenseIdParam, 'params'), requireGroupRoleV2('member'), submitExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/approve', validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.approve'), approveExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/reject', validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), rejectExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/reverse', validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.reverse'), reverseExpense);

export default expenseRouter;
export { expenseRouter };
