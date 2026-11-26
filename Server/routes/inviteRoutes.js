import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { inviteJoinBody, inviteCreateBody, inviteGroupParam } from '../validation/featureSchemas.js';
import {
    joinByCode, createInviteCode, getInviteCodeMetadata,
} from '../controllers/inviteController.js';

const router = express.Router();

// Public join-by-code (rate limited by controller)
router.post('/join-by-code', auth, validate(inviteJoinBody, 'body'), joinByCode);

// Create/regenerate invite code (group admin only, enforced in controller)
router.post('/codes', auth, validate(inviteCreateBody, 'body'), createInviteCode);

// Get active invite code metadata for a group (no plaintext)
router.get('/codes/:groupId', auth, validate(inviteGroupParam, 'params'), getInviteCodeMetadata);

export default router;
