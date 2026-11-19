import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { receiptMulter } from '../middleware/receiptUpload.js';
import { uploadAttachment, downloadAttachment } from '../controllers/attachmentController.js';
import { validate } from '../validation/validate.js';
import { groupIdParam } from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// POST /api/attachments/groups/:groupId/upload (Doc §10, §15)
router.post(
    '/groups/:groupId/upload',
    validate(groupIdParam, 'params'),
    requireGroupRoleV2('member'),
    receiptMulter.single('file'),
    uploadAttachment
);

// GET /api/attachments/groups/:groupId/:attachmentId
router.get(
    '/groups/:groupId/:attachmentId',
    validate(groupIdParam, 'params'),
    requireGroupRoleV2('member'),
    downloadAttachment
);

export default router;

