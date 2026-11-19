import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { getSessions, revokeOne, revokeAll } from '../controllers/sessionController.js';
import { familyIdParam, revokeAllSchema } from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Sessions ----------
router.get('/users/sessions', getSessions);
router.delete('/users/sessions/:familyId', validate(familyIdParam, 'params'), revokeOne);
router.delete('/users/sessions', validate(revokeAllSchema), revokeAll);

export default router;