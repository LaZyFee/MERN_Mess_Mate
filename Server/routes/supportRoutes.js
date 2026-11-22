import express from 'express';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { idempotent } from '../middleware/idempotency.js';
import {
    createTicket, listMyTickets, getTicketThread, addMessage, ticketAction,
    publicAction, appeal,
} from '../controllers/supportController.js';
import {
    ticketCreateSchema, ticketListQuery, ticketMessageSchema, ticketTransitionSchema,
    ticketRateSchema, appealSchema,
} from '../validation/supportSchemas.js';

const router = express.Router();

// ---- Public routes (no auth) ----
const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 20,
    standardHeaders: true, legacyHeaders: false,
    message: { msg: 'Too many attempts' },
});
const appealLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, max: 1,
    standardHeaders: true, legacyHeaders: false,
    message: { msg: 'Appeal already submitted today' },
});

router.post('/actions/:token', actionLimiter, publicAction);
router.post('/appeal', appealLimiter, validate(appealSchema), appeal);

// ---- Authenticated user routes ----
router.use(auth);

const messageLimiter = rateLimit({
    windowMs: 60 * 1000, max: 10,
    standardHeaders: true, legacyHeaders: false,
    message: { msg: 'Too many messages', code: 'TICKET_MESSAGE_LIMIT' },
});

router.post('/tickets', validate(ticketCreateSchema), idempotent('support.ticket.create'), createTicket);
router.get('/tickets', validate(ticketListQuery, 'query'), listMyTickets);
router.get('/tickets/:ticketId', getTicketThread);
router.post('/tickets/:ticketId/messages', messageLimiter, validate(ticketMessageSchema), addMessage);
router.post('/tickets/:ticketId/resolve', validate(ticketTransitionSchema), ticketAction);
router.post('/tickets/:ticketId/close', validate(ticketTransitionSchema), ticketAction);
router.post('/tickets/:ticketId/reopen', validate(ticketTransitionSchema), ticketAction);
router.post('/tickets/:ticketId/rate', validate(ticketRateSchema), ticketAction);

export default router;
