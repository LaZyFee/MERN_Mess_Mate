import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { idempotent } from '../middleware/idempotency.js';
import {
    listMemberships, createMembership, updateMembership, departMembership, listActive, listForMonth,
} from '../controllers/membershipController.js';
import {
    groupIdParam, monthParam, createMembershipSchema, updateMembershipSchema, departSchema, cursorListQuery,
} from '../validation/schemas.js';

const router = express.Router();

// All membership routes require authentication
router.use(auth);

// ---------- Memberships ----------
router.get('/groups/:groupId/memberships', validate(groupIdParam, 'params'), validate(cursorListQuery, 'query'), requireGroupRoleV2('member'), listMemberships);
router.get('/groups/:groupId/memberships/active', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listActive);
router.get('/groups/:groupId/memberships/month/:month', validate(monthParam, 'params'), requireGroupRoleV2('member'), listForMonth);
router.post('/groups/:groupId/memberships', validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(createMembershipSchema), idempotent('membership.create'), createMembership);
router.patch('/groups/:groupId/memberships/:membershipId', validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(updateMembershipSchema), updateMembership);
router.post('/groups/:groupId/memberships/:membershipId/depart', validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(departSchema), departMembership);

export default router;
