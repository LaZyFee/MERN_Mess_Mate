import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import { groupIdParam } from '../validation/schemas.js';
import { budgetUpsertSchema, budgetMonthQuery, budgetIdParam } from '../validation/budgetSchemas.js';
import { listBudgets, upsertBudget, deleteBudget, budgetVariance } from '../controllers/budgetController.js';

// Monthly budgets (S5.2) — everyone may read the plan; money-handlers edit it.

const router = express.Router();
router.use(auth);

router.get('/groups/:groupId', validate(groupIdParam, 'params'), validate(budgetMonthQuery, 'query'), requireGroupRoleV2('member'), listBudgets);
router.get('/groups/:groupId/variance', validate(groupIdParam, 'params'), validate(budgetMonthQuery, 'query'), requireGroupRoleV2('member'), budgetVariance);
router.post('/groups/:groupId', validate(groupIdParam, 'params'), validate(budgetUpsertSchema), requireGroupRoleV2('treasurer'), upsertBudget);
router.delete('/groups/:groupId/:budgetId', validate(budgetIdParam, 'params'), requireGroupRoleV2('treasurer'), deleteBudget);

export default router;
