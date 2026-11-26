import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { z } from 'zod';
import {
    requirePlatformAdmin,
    getOverview, getTraffic, listAuditEvents,
    adminListUsers, adminGetUser, adminUpdateUser,
    adminListGroups, adminGetGroup, adminDeleteGroup, getHealth,
} from '../controllers/adminController.js';
import { listJobStatuses } from '../controllers/jobController.js';
import { adminUserIdParam, adminGroupIdParam } from '../validation/featureSchemas.js';
import { requireAdminAMR } from '../middleware/amrGate.js';

// PLATFORM ADMIN CONTROL PLANE — deliberately unlinked from any user-facing
// route or response. Guard answers 404 (not 403) so non-admins cannot even
// confirm these endpoints exist. 2FA (amr: otp) is required for all admin routes.

const router = express.Router();

router.use(auth, requirePlatformAdmin, requireAdminAMR);

// ---- Traffic & platform health ----
router.get('/overview', getOverview);
router.get('/traffic', getTraffic);
router.get('/audit', listAuditEvents);
router.get('/health', getHealth); // operational exception view (S3.4)

// ---- Global user directory ----
router.get('/users', adminListUsers);
router.get('/users/:userId', validate(adminUserIdParam, 'params'), adminGetUser);
router.patch('/users/:userId', validate(adminUserIdParam, 'params'), adminUpdateUser);

// ---- Background jobs (B0.2, hidden) ----
router.get('/jobs', listJobStatuses);

// ---- Global group directory ----
router.get('/groups', adminListGroups);
router.get('/groups/:groupId', validate(adminGroupIdParam, 'params'), adminGetGroup);
router.delete('/groups/:groupId', validate(adminGroupIdParam, 'params'), adminDeleteGroup);

export default router;
