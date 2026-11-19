import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { listPolicies, publishPolicy } from '../controllers/policyController.js';
import { groupIdParam, publishPolicySchema } from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Policies ----------
router.get('/groups/:groupId/policies', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listPolicies);
router.post('/groups/:groupId/policies', validate(groupIdParam, 'params'), requireGroupRoleV2('owner'), validate(publishPolicySchema), publishPolicy);

export default router;