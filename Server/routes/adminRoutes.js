import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { z } from 'zod';
import {
    requirePlatformAdmin,
    getOverview, getTraffic, listAuditEvents,
    adminListUsers, adminGetUser, adminUpdateUser,
    adminListGroups, adminGetGroup, adminDeleteGroup,
} from '../controllers/adminController.js';
import { objectId } from '../validation/schemas.js';

// PLATFORM ADMIN CONTROL PLANE — deliberately unlinked from any user-facing
// route or response. Guard answers 404 (not 403) so non-admins cannot even
// confirm these endpoints exist.

const router = express.Router();

router.use(auth, requirePlatformAdmin);

// ---- Traffic & platform health ----
router.get('/overview', getOverview);
router.get('/traffic', getTraffic);
router.get('/audit', listAuditEvents);

// ---- Global user directory ----
router.get('/users', adminListUsers);
router.get('/users/:userId', validate(z.object({ userId: objectId }), 'params'), adminGetUser);
router.patch('/users/:userId', validate(z.object({ userId: objectId }), 'params'), adminUpdateUser);

// ---- Global group directory ----
router.get('/groups', adminListGroups);
router.get('/groups/:groupId', validate(z.object({ groupId: objectId }), 'params'), adminGetGroup);
router.delete('/groups/:groupId', validate(z.object({ groupId: objectId }), 'params'), adminDeleteGroup);

export default router;
