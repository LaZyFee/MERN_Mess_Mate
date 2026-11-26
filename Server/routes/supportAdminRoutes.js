import express from 'express';
import auth from '../middleware/auth.js';
import {
    requirePlatformAdmin,
} from '../controllers/adminController.js';
import {
    adminListTickets, adminGetTicket, adminReply, adminInternalNote,
    adminAssign, adminPatchTicket, adminAction, adminRedactMessage,
    adminStats, listCannedReplies, createCannedReply, updateCannedReply, deleteCannedReply,
} from '../controllers/supportAdminController.js';
import {
    adminReplySchema, adminTicketPatchSchema, adminAssignSchema, adminRedactSchema,
    adminTicketListQuery, cannedReplySchema,
} from '../validation/supportSchemas.js';
import { validate } from '../validation/validate.js';
import { objectId } from '../validation/schemas.js';
import { adminCannedReplyParam } from '../validation/featureSchemas.js';
import { z } from 'zod';

// Platform admin Support Desk — inherits the 404-masking guard.

const router = express.Router();
router.use(auth, requirePlatformAdmin);

const idParam = z.object({ ticketId: objectId });
const msgParam = z.object({ ticketId: objectId, messageId: objectId });

router.get('/tickets', validate(adminTicketListQuery, 'query'), adminListTickets);
router.get('/tickets/:ticketId', validate(idParam, 'params'), adminGetTicket);
router.post('/tickets/:ticketId/reply', validate(idParam, 'params'), validate(adminReplySchema), adminReply);
router.post('/tickets/:ticketId/internal-note', validate(idParam, 'params'), validate(adminReplySchema), adminInternalNote);
router.post('/tickets/:ticketId/assign', validate(idParam, 'params'), validate(adminAssignSchema), adminAssign);
router.patch('/tickets/:ticketId', validate(idParam, 'params'), validate(adminTicketPatchSchema), adminPatchTicket);
router.post('/tickets/:ticketId/resolve', validate(idParam, 'params'), validate(adminRedactSchema.partial({ reason: true })), adminAction);
router.post('/tickets/:ticketId/close', validate(idParam, 'params'), validate(adminRedactSchema.partial({ reason: true })), adminAction);
router.post('/tickets/:ticketId/reopen', validate(idParam, 'params'), validate(adminRedactSchema), adminAction);
router.post('/tickets/:ticketId/messages/:messageId/redact', validate(msgParam, 'params'), validate(adminRedactSchema), adminRedactMessage);
router.get('/stats', adminStats);

router.get('/canned-replies', listCannedReplies);
router.post('/canned-replies', validate(cannedReplySchema), createCannedReply);
router.put('/canned-replies/:replyId', validate(adminCannedReplyParam, 'params'), validate(cannedReplySchema), updateCannedReply);
router.delete('/canned-replies/:replyId', validate(adminCannedReplyParam, 'params'), deleteCannedReply);

export default router;
