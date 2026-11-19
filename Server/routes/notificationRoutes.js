import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import {
    listOutbox, getOutboxMessage, resend, manualShareLinks,
    whatsappWebhookVerify, whatsappWebhookReceive, setWhatsappConsent,
} from '../controllers/notificationController.js';
import { groupIdParam, outboxQuery, messageIdParam, manualShareSchema } from '../validation/schemas.js';

const router = express.Router();

// ---------- Public WhatsApp Webhook (Meta callbacks - Doc §13, §19) ----------
router.get('/whatsapp/webhook', whatsappWebhookVerify);
router.post('/whatsapp/webhook', whatsappWebhookReceive);

// ---------- Authenticated routes ----------
router.use(auth);

// WhatsApp recipient consent toggle
router.put('/whatsapp/consent', setWhatsappConsent);

// Outbox management
router.get('/groups/:groupId/notifications', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(outboxQuery, 'query'), listOutbox);
router.get('/groups/:groupId/notifications/:messageId', validate(messageIdParam, 'params'), requireGroupRoleV2('member'), getOutboxMessage);
router.post('/groups/:groupId/notifications/:messageId/resend', validate(messageIdParam, 'params'), requireGroupRoleV2('manager'), resend);
router.post('/groups/:groupId/notifications/manual-share', validate(groupIdParam, 'params'), requireGroupRoleV2('manager'), validate(manualShareSchema), manualShareLinks);

export default router;
