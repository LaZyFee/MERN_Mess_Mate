import express from 'express';
import { getStats, getV2Dashboard } from '../controllers/statsController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole, requireGroupRoleV2 } from '../middleware/roles.js';
import { objectIdParamSchema, groupIdParam } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const router = express.Router();
router.use(auth);

// GET /api/stats/groups/:groupId/dashboard?month=YYYY-MM — Doc §11 V2 unified dashboard
router.get('/groups/:groupId/dashboard', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), getV2Dashboard);

// GET /api/stats/:groupId?granularity=month|year&year=YYYY&month=YYYY-MM&userId=
router.get('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), getStats);

export default router;
