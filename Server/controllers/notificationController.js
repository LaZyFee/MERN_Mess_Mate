import NotificationOutbox from '../models/NotificationOutbox.js';
import User from '../models/User.js';
import { enqueueNotification } from '../services/outboxWorker.js';
import { normalizeWaNumber, verifyWebhookSignature, processWebhookStatuses } from '../utils/whatsapp.js';

// Notifications — delivery status visibility, webhooks, consent & manual resend (Doc §13, §19).

/** GET /api/groups/:groupId/notifications?statementId=&state= */
export const listOutbox = async (req, res, next) => {
    try {
        const filter = { groupId: req.params.groupId };
        const q = req.validated?.query || {};
        if (q.statementId) filter.statementId = q.statementId;
        if (q.state) filter.state = q.state;
        const messages = await NotificationOutbox.find(filter)
            .sort({ createdAt: -1 }).limit(200).lean();
        res.json({ messages });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/notifications/:messageId */
export const getOutboxMessage = async (req, res, next) => {
    try {
        const message = await NotificationOutbox.findOne({ _id: req.params.messageId, groupId: req.params.groupId }).lean();
        if (!message) return res.status(404).json({ msg: 'Notification not found' });
        res.json({ message });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/notifications/:messageId/resend — explicit resend creates a new record */
export const resend = async (req, res, next) => {
    try {
        const original = await NotificationOutbox.findOne({ _id: req.params.messageId, groupId: req.params.groupId }).lean();
        if (!original) return res.status(404).json({ msg: 'Notification not found' });

        const { _id, createdAt, updatedAt, state, attempts, providerMessageId, processedAt, dedupeKey, ...rest } = original;
        const copy = await enqueueNotification({
            ...rest,
            purpose: `${original.purpose}_resend`,
            state: 'pending',
        });
        res.status(201).json({ msg: 'Resend queued (new delivery record)', message: copy });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/notifications/manual-share — wa.me links for manual sending */
export const manualShareLinks = async (req, res, next) => {
    try {
        const { statementId } = req.body || {};
        const filter = { groupId: req.params.groupId, channel: 'whatsapp' };
        if (statementId) filter.statementId = statementId;
        const messages = await NotificationOutbox.find(filter).lean();

        const links = messages.map(m => {
            const num = normalizeWaNumber(m.recipientWa);
            return {
                messageId: m._id,
                state: m.state,
                link: num ? `https://wa.me/${num}?text=${encodeURIComponent(m.payload?.text || '')}` : null,
                reason: num ? undefined : 'invalid/missing number',
            };
        });
        res.json({ links });
    } catch (err) { next(err); }
};

/**
 * GET /api/notifications/whatsapp/webhook (Meta verification handshake)
 */
export const whatsappWebhookVerify = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'mealmate_verify_token';
    if (mode === 'subscribe' && token === expectedToken) {
        return res.status(200).send(challenge);
    }
    return res.status(403).json({ msg: 'Webhook verification token mismatch' });
};

/**
 * POST /api/notifications/whatsapp/webhook (Meta delivery status receipts)
 */
export const whatsappWebhookReceive = async (req, res, next) => {
    try {
        // Verify signature if WHATSAPP_APP_SECRET is set
        const signature = req.headers['x-hub-signature-256'];
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        if (appSecret && signature) {
            const rawBody = JSON.stringify(req.body);
            const isValid = verifyWebhookSignature(rawBody, signature, appSecret);
            if (!isValid) return res.status(401).json({ msg: 'Invalid webhook signature' });
        }

        const entries = req.body?.entry || [];
        for (const entry of entries) {
            for (const change of (entry.changes || [])) {
                const statuses = change.value?.statuses || [];
                if (statuses.length > 0) {
                    await processWebhookStatuses(statuses);
                }
            }
        }

        // WhatsApp expects 200 OK immediately
        res.status(200).json({ status: 'received' });
    } catch (err) {
        console.error('[whatsappWebhook] error:', err.message);
        res.status(200).json({ status: 'error_logged' });
    }
};

/**
 * PUT /api/notifications/whatsapp/consent (recipient opt-in / opt-out)
 */
export const setWhatsappConsent = async (req, res, next) => {
    try {
        const { consent = true } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { whatsappConsent: Boolean(consent), whatsappConsentAt: new Date() },
            { new: true }
        ).select('username whatsapp whatsappConsent whatsappConsentAt');

        res.json({
            msg: consent ? 'Opted in to WhatsApp notifications' : 'Opted out of WhatsApp notifications',
            user,
        });
    } catch (err) {
        next(err);
    }
};
