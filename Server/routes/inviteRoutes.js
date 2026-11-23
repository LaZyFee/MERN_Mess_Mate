import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { z } from 'zod';
import {
    joinByCode, createInviteCode, getInviteCodeMetadata,
} from '../controllers/inviteController.js';

const router = express.Router();

// Public join-by-code (rate limited by controller)
router.post('/join-by-code', auth, validate(z.object({
    code: z.string().min(1),
    groupId: z.string().min(1),
}), 'body'), joinByCode);

// Create/regenerate invite code (group admin only, enforced in controller)
router.post('/codes', auth, validate(z.object({
    groupId: z.string().min(1),
    maxUses: z.number().int().min(1).max(1000).optional(),
    ttlDays: z.number().int().min(1).max(365).optional(),
}), 'body'), createInviteCode);

// Get active invite code metadata for a group (no plaintext)
router.get('/codes/:groupId', auth, validate(z.object({
    groupId: z.string().min(1),
}), 'params'), getInviteCodeMetadata);

export default router;