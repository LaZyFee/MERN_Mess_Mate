import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import {
    kitchenItemCreateSchema, kitchenItemUpdateSchema, kitchenRefillSchema,
    kitchenItemIdParam, featureGroupParam,
} from '../validation/featureSchemas.js';
import {
    listKitchenItems, createKitchenItem, updateKitchenItem, recordRefill, deleteKitchenItem,
} from '../controllers/kitchenInventoryController.js';

const router = express.Router();
router.use(auth);

router.get('/groups/:groupId', validate(featureGroupParam, 'params'), requireGroupRoleV2('member'), listKitchenItems);
router.post('/groups/:groupId', validate(featureGroupParam, 'params'), validate(kitchenItemCreateSchema), requireGroupRoleV2('member'), createKitchenItem);
router.patch('/groups/:groupId/:itemId', validate(featureGroupParam, 'params'), validate(kitchenItemIdParam, 'params'), validate(kitchenItemUpdateSchema), requireGroupRoleV2('member'), updateKitchenItem);
router.post('/groups/:groupId/:itemId/refill', validate(featureGroupParam, 'params'), validate(kitchenItemIdParam, 'params'), validate(kitchenRefillSchema), requireGroupRoleV2('member'), recordRefill);
router.delete('/groups/:groupId/:itemId', validate(featureGroupParam, 'params'), validate(kitchenItemIdParam, 'params'), requireGroupRoleV2('member'), deleteKitchenItem);

export default router;
