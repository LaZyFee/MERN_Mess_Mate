import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { idempotent } from '../middleware/idempotency.js';
import { listRules, createRule, updateRule, generateDraft, generateAllDrafts } from '../controllers/recurringController.js';
import { groupIdParam, recurringSchema, generateSchema, ruleIdParam } from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Recurring ----------
router.get('/groups/:groupId/recurring', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listRules);
router.post('/groups/:groupId/recurring', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(recurringSchema), createRule);
router.post('/groups/:groupId/recurring/generate-all', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), generateAllDrafts);
router.put('/groups/:groupId/recurring/:ruleId', validate(ruleIdParam, 'params'), requireGroupRoleV2('treasurer'), updateRule);
router.post('/groups/:groupId/recurring/:ruleId/generate', validate(ruleIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(generateSchema), idempotent('recurring.generate'), generateDraft);

export default router;
