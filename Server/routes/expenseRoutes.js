import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { resolveHistoryWindow } from '../middleware/privacy.js';
import { idempotent } from '../middleware/idempotency.js';
import { deprecate } from '../middleware/deprecate.js';
import {
    requireGroupRole, allowSelfOrAdmin, requireGroupRoleV2,
} from '../middleware/roles.js';
import {
    addExpense, updateExpense, getExpensesByMonth, deleteExpense, getExpenses,
    createExpense, submitExpense, approveExpense, rejectExpense, reverseExpense, listExpenses,
} from '../controllers/expenseController.js';
import {
    previewExpenseImport, applyExpenseImport,
} from '../controllers/expenseImportController.js';
import {
    expenseEntrySchema, idParamSchema, monthParamSchema, objectIdParamSchema, expenseFilterQuerySchema,
    groupIdParam, createExpenseSchema, expenseIdParam, reasonBody, listExpenseQuery, importApplySchema,
} from '../validation/schemas.js';


const expenseRouter = express.Router();
expenseRouter.use(auth);

// Import uploads: in-memory only, 5 MB cap, 10 imports / 15 min / IP.
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

// POST /api/expenses/:groupId
expenseRouter.post('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), addExpense);

// PUT /api/expenses/entry/:id — payer only
expenseRouter.put('/entry/:id', deprecate({ successor: '/api/expenses/groups/:groupId/expenses', sunsetDate: process.env.LEGACY_SUNSET_DATE }), validate(idParamSchema, 'params'), updateExpense);

// GET /api/expenses/:groupId?month=&from=&to=&userId=&categoryId=&category= — filtered (ex-members clamped)
expenseRouter.get('/:groupId', validate(expenseFilterQuerySchema, 'query'), requireGroupRole('member'), resolveHistoryWindow, getExpenses);

// GET /api/expenses/:groupId/:month
expenseRouter.get('/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('member'), getExpensesByMonth);

// DELETE /api/expenses/entry/:id — payer or group admin
expenseRouter.delete('/entry/:id', deprecate({ successor: '/api/expenses/groups/:groupId/expenses', sunsetDate: process.env.LEGACY_SUNSET_DATE }), validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin, deleteExpense);

// ---------- Expenses (workflow) ----------
expenseRouter.get('/groups/:groupId/expenses', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listExpenseQuery, 'query'), listExpenses);
expenseRouter.post('/groups/:groupId/expenses', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(createExpenseSchema), idempotent('expense.create'), createExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/submit', validate(expenseIdParam, 'params'), requireGroupRoleV2('member'), submitExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/approve', validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.approve'), approveExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/reject', validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), rejectExpense);
expenseRouter.post('/groups/:groupId/expenses/:expenseId/reverse', validate(expenseIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('expense.reverse'), reverseExpense);

// ---------- Excel/CSV import (S5.7): preview → dry-run diff → apply ----------
expenseRouter.post('/groups/:groupId/expenses/import/preview', importLimiter, validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), importUpload.single('file'), previewExpenseImport);
expenseRouter.post('/groups/:groupId/expenses/import/apply', importLimiter, validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(importApplySchema), importUpload.single('file'), idempotent('expense.import'), applyExpenseImport);

export default expenseRouter;
export { expenseRouter };
