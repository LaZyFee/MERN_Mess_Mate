import express from 'express';
import { getStats } from '../controllers/statsController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole } from '../middleware/roles.js';
import { objectIdParamSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const router = express.Router();
router.use(auth);

// GET /api/stats/:groupId?granularity=month|year&year=YYYY&month=YYYY-MM&userId=
router.get('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), getStats);

export default router;
