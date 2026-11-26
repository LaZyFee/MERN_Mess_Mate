import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { listAssets, createAsset, recordAssetRefund } from '../controllers/depositAssetController.js';
import { validate } from '../validation/validate.js';
import { groupIdParam, cursorListQuery } from '../validation/schemas.js';

const router = express.Router();
router.use(auth);

// ---------- Deposit / Asset routes (Doc §6, §16) ----------
router.get('/groups/:groupId', validate(groupIdParam, 'params'), validate(cursorListQuery, 'query'), requireGroupRoleV2('member'), listAssets);
router.post('/groups/:groupId', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), createAsset);
router.post('/groups/:groupId/:assetId/refund', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), recordAssetRefund);

export default router;

