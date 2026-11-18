import express from 'express';
import { addExpense, updateExpense, getExpensesByMonth, deleteExpense, getExpenses } from '../controllers/expenseController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole, allowSelfOrAdmin } from '../middleware/roles.js';
import { expenseEntrySchema, idParamSchema, monthParamSchema, objectIdParamSchema, expenseFilterQuerySchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const router = express.Router();
router.use(auth);

// POST /api/expenses/:groupId
router.post('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), addExpense);

// PUT /api/expenses/entry/:id — payer only
router.put('/entry/:id', validate(idParamSchema, 'params'), updateExpense);

// GET /api/expenses/:groupId?month=&from=&to=&userId=&categoryId=&category= — filtered
router.get('/:groupId', validate(expenseFilterQuerySchema, 'query'), requireGroupRole('member'), getExpenses);

// GET /api/expenses/:groupId/:month
router.get('/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('member'), getExpensesByMonth);

// DELETE /api/expenses/entry/:id — payer or group admin
router.delete('/entry/:id', validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin, deleteExpense);

export default router;
