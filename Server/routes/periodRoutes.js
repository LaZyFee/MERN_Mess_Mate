import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import {
    listPeriods, getPeriod, previewStatement, startReview, reopenPeriod, closeChecklist, recordCorrection,
} from '../controllers/periodController.js';
import { groupIdParam, monthParam, correctionSchema } from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Periods ----------
router.get('/groups/:groupId/periods', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listPeriods);
router.get('/groups/:groupId/periods/:month', validate(monthParam, 'params'), requireGroupRoleV2('member'), getPeriod);
router.get('/groups/:groupId/periods/:month/preview', validate(monthParam, 'params'), requireGroupRoleV2('member'), previewStatement);
router.get('/groups/:groupId/periods/:month/checklist', validate(monthParam, 'params'), requireGroupRoleV2('treasurer'), closeChecklist);
router.post('/groups/:groupId/periods/:month/begin-review', validate(monthParam, 'params'), requireGroupRoleV2('manager'), startReview);
router.post('/groups/:groupId/periods/:month/return-to-open', validate(monthParam, 'params'), requireGroupRoleV2('manager'), reopenPeriod);
router.post('/groups/:groupId/periods/:month/correct', validate(monthParam, 'params'), requireGroupRoleV2('manager'), validate(correctionSchema), recordCorrection);

export default router;