import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import { z } from 'zod';
import { objectIdSchema } from '../validation/schemas.js';
import {
    listKitchenItems, createKitchenItem, updateKitchenItem, recordRefill, deleteKitchenItem,
} from '../controllers/kitchenInventoryController.js';

const itemCreateSchema = z.object({
    name: z.string().trim().min(1).max(80),
    unit: z.string().trim().max(20).optional().default(''),
    currentStock: z.number().nonnegative().optional().default(0),
    reorderThreshold: z.number().nonnegative().optional().default(0),
    averageConsumptionPerDay: z.number().nonnegative().optional().default(0),
});

const itemUpdateSchema = z.object({
    currentStock: z.number().nonnegative().optional(),
    reorderThreshold: z.number().nonnegative().optional(),
    averageConsumptionPerDay: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});

const refillSchema = z.object({
    quantity: z.number().positive(),
    unit: z.string().trim().max(20).optional().default(''),
    costPoisha: z.number().nonnegative().optional().default(0),
    note: z.string().trim().max(200).optional().default(''),
});

const groupIdParam = z.object({ groupId: objectIdSchema });
const itemIdParam = z.object({ itemId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid item id') });

const router = express.Router();
router.use(auth);

router.get('/groups/:groupId', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listKitchenItems);
router.post('/groups/:groupId', validate(groupIdParam, 'params'), validate(itemCreateSchema), requireGroupRoleV2('member'), createKitchenItem);
router.patch('/groups/:groupId/:itemId', validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(itemUpdateSchema), requireGroupRoleV2('member'), updateKitchenItem);
router.post('/groups/:groupId/:itemId/refill', validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), validate(refillSchema), requireGroupRoleV2('member'), recordRefill);
router.delete('/groups/:groupId/:itemId', validate(groupIdParam, 'params'), validate(itemIdParam, 'params'), requireGroupRoleV2('member'), deleteKitchenItem);

export default router;