import express from 'express';
import {
    createGroup, sendJoinRequest, approveRequest, addMember, getAllGroups,
    getGroupById, addEntry, getEntries, calculate, excelExport,
    getJoinCode, regenerateCode, joinByCode, addExtra, removeExtra, getExtras,
    removeMember, inviteByEmail, pdfExport,
    getFeatureFlags, updateFeatureFlags, getGroupAuditLog,
} from '../controllers/messGroupController.js';
import { upsertPaymentNote, getPaymentNote, getAllPaymentNotes } from '../controllers/paymentNoteController.js';
import { createCategory, getCategories, updateCategory, deleteCategory, seedCategoriesEndpoint } from '../controllers/expenseCategoryController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole, allowSelfOrAdmin } from '../middleware/roles.js';
import {
    objectIdParamSchema, groupAndUserParamSchema, monthParamSchema,
    objectIdAndExtraParamSchema, objectIdAndIdParamSchema, inviteSchema,
} from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import { deprecate } from '../middleware/deprecate.js';

const router = express.Router();

// All routes require a valid JWT
router.use(auth);

// --- Any authenticated user ---
router.post('/create', createGroup);
router.post('/join-by-code', joinByCode);

// Join request by groupId (kept for back-compat with the browse/join flow)
router.post('/join-request/:groupId', validate(objectIdParamSchema, 'params'), sendJoinRequest);

// --- Admin only ---
router.post(
    '/approve/:groupId/:userId',
    validate(groupAndUserParamSchema, 'params'),
    requireGroupRole('admin'),
    approveRequest
);
router.post(
    '/add-member/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('admin'),
    addMember
);
router.get('/code/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), getJoinCode);
router.post('/regenerate-code/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), regenerateCode);
router.post('/extras/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), addExtra);
router.delete(
    '/extras/:groupId/:extraId',
    validate(objectIdAndExtraParamSchema, 'params'),
    requireGroupRole('admin'),
    removeExtra
);
router.post(
    '/invite/:groupId',
    validate(objectIdParamSchema, 'params'),
    validate(inviteSchema),
    requireGroupRole('admin'),
    inviteByEmail
);

// --- Member or admin ---
router.post(
    '/add-entry/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('member'),
    allowSelfOrAdmin,
    addEntry
);
router.get('/my-groups', getAllGroups);
router.get('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), getGroupById);
// Legacy entry/calculate endpoints — superseded by /api/meals & /api/expenses
router.get('/entries/:groupId', deprecate({ successor: '/api/meals, /api/expenses' }), validate(objectIdParamSchema, 'params'), requireGroupRole('member'), getEntries);
router.get('/calculate/:groupId', deprecate({ successor: '/api/summary' }), validate(objectIdParamSchema, 'params'), requireGroupRole('member'), calculate);
router.get('/export/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), excelExport);
router.get('/pdf/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), pdfExport);
router.get('/extras/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), getExtras);

// Remove member: self (leave) or admin (kick)
router.delete(
    '/remove-member/:groupId/:userId',
    validate(groupAndUserParamSchema, 'params'),
    requireGroupRole('member'),
    removeMember
);

// ---------- Payment notes (admin writes/edits, member views own) ----------
router.put(
    '/payment-note/:groupId/:userId/:month',
    requireGroupRole('admin'),
    upsertPaymentNote
);
router.get(
    '/payment-note/:groupId/:userId/:month',
    getPaymentNote // self-checks admin-or-owner inside
);
router.get(
    '/payment-notes/:groupId/:month',
    requireGroupRole('admin'),
    getAllPaymentNotes
);

// ---------- Expense categories (admin manages, members list) ----------
router.post(
    '/categories/:groupId/seed',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('admin'),
    seedCategoriesEndpoint
);
router.post(
    '/categories/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('admin'),
    createCategory
);
router.get(
    '/categories/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('member'),
    getCategories
);
router.put(
    '/categories/:groupId/:categoryId',
    validate(objectIdAndIdParamSchema, 'params'),
    requireGroupRole('admin'),
    updateCategory
);
router.delete(
    '/categories/:groupId/:categoryId',
    validate(objectIdAndIdParamSchema, 'params'),
    requireGroupRole('admin'),
    deleteCategory
);

// ---------- Per-group feature flags ---------- (todo item 12)
router.get(
    '/feature-flags/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('member'),
    getFeatureFlags
);
router.patch(
    '/feature-flags/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('admin'),
    updateFeatureFlags
);

// ---------- Owner-visible audit log ---------- (todo item 13)
router.get(
    '/audit-log/:groupId',
    validate(objectIdParamSchema, 'params'),
    requireGroupRole('member'),
    getGroupAuditLog
);

export default router;
