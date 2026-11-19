import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import {
    openDispute, listDisputes, respondToDispute, resolveDispute,
} from '../controllers/disputeController.js';
import {
    groupIdParam, disputeSchema, disputeIdParam, disputeRespondSchema, disputeResolveSchema, disputeListQuery,
} from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Disputes ----------
router.get('/groups/:groupId/disputes', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeListQuery, 'query'), listDisputes);
router.post('/groups/:groupId/disputes', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeSchema), openDispute);
router.post('/groups/:groupId/disputes/:disputeId/respond', validate(disputeIdParam, 'params'), requireGroupRoleV2('member'), validate(disputeRespondSchema), respondToDispute);
router.post('/groups/:groupId/disputes/:disputeId/resolve', validate(disputeIdParam, 'params'), requireGroupRoleV2('manager'), validate(disputeResolveSchema), resolveDispute);

export default router;