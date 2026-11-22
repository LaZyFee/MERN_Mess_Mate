import express from 'express';
import { getSummary, finalizeSummary, whatsappSummary } from '../controllers/summaryController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole } from '../middleware/roles.js';
import { monthParamSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import { deprecate } from '../middleware/deprecate.js';

const router = express.Router();
router.use(auth);

// GET /api/summary/:groupId/:month — live or frozen summary (legacy shape; prefer /api/statements)
router.get('/:groupId/:month', deprecate({ successor: '/api/statements' }), validate(monthParamSchema, 'params'), requireGroupRole('member'), getSummary);

// POST /api/summary/finalize/:groupId/:month — admin only, freezes the month
router.post('/finalize/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('admin'), finalizeSummary);

// GET /api/summary/whatsapp/:groupId/:month — admin: wa.me links (or direct send if Cloud API configured)
router.get('/whatsapp/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('admin'), whatsappSummary);

export default router;
