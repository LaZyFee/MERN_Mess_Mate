import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { idempotent } from '../middleware/idempotency.js';
import {
    createReconciliation, listReconciliations, resolveReconciliation, accountingEquation,
    listReconciliationSuggestions,
} from '../controllers/reconciliationController.js';
import {
    groupIdParam, reconciliationSchema, listReconciliationQuery, resolveReconciliationSchema, recIdParam,
    suggestionQuery,
} from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Reconciliations ----------
router.get('/groups/:groupId/reconciliations', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listReconciliationQuery, 'query'), listReconciliations);
router.get('/groups/:groupId/reconciliations/equation', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), accountingEquation);
router.get('/groups/:groupId/reconciliations/suggestions', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(suggestionQuery, 'query'), listReconciliationSuggestions);
router.post('/groups/:groupId/reconciliations', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reconciliationSchema), idempotent('reconciliation.create'), createReconciliation);
router.post('/groups/:groupId/reconciliations/:recId/resolve', validate(recIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(resolveReconciliationSchema), resolveReconciliation);

export default router;