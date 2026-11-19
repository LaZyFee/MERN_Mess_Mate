import NotificationOutbox from '../models/NotificationOutbox.js';
import { sendMail } from '../utils/mailer.js';
import { sendWaDirect, sendWaTemplate } from '../utils/whatsapp.js';

// Outbox worker — drains pending notifications after commit. Runs on an
// interval with a lease (processing + maxAttempts + backoff). Ambiguous
// provider timeouts leave the message pending for retry; dedupe keys prevent
// duplicate batches.

const isMailConfigured = () => Boolean(process.env.SMTP_HOST);
const isWaConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

/** Lease a batch of pending messages (single worker instance is safe: state CAS). */
const leaseBatch = async (limit = 10) => {
    const now = new Date();
    const candidates = await NotificationOutbox.find({
        state: { $in: ['pending', 'failed'] },
        nextAttemptAt: { $lte: now },
        attempts: { $lt: 5 },
    }).sort({ nextAttemptAt: 1 }).limit(limit);

    const leased = [];
    for (const m of candidates) {
        const claimed = await NotificationOutbox.findOneAndUpdate(
            { _id: m._id, state: m.state },
            { $set: { state: 'processing', attempts: m.attempts + 1 } },
            { new: true }
        );
        if (claimed) leased.push(claimed);
    }
    return leased;
};

const deliver = async (message) => {
    if (message.channel === 'email') {
        if (!isMailConfigured()) {
            await NotificationOutbox.findByIdAndUpdate(message._id, { state: 'not_configured', lastError: 'SMTP not configured' });
            return;
        }
        try {
            await sendMail({
                to: message.recipientEmail,
                subject: message.payload?.subject || 'MealMate statement',
                html: message.payload?.html || '<p>Your MealMate statement is ready.</p>',
            });
            await NotificationOutbox.findByIdAndUpdate(message._id, {
                state: 'sent', processedAt: new Date(), lastError: '',
            });
        } catch (e) {
            await fail(message, e.message);
        }
    } else if (message.channel === 'whatsapp') {
        if (!isWaConfigured()) {
            await NotificationOutbox.findByIdAndUpdate(message._id, { state: 'not_configured', lastError: 'WhatsApp Cloud API not configured' });
            return;
        }
        try {
            // Check recipient consent if userId exists (Doc §13)
            if (message.userId) {
                const User = (await import('../models/User.js')).default;
                const user = await User.findById(message.userId).select('whatsappConsent').lean();
                if (user && user.whatsappConsent === false) {
                    await NotificationOutbox.findByIdAndUpdate(message._id, {
                        state: 'skipped',
                        lastError: 'Recipient opted out of automated WhatsApp messages',
                        processedAt: new Date(),
                    });
                    return;
                }
            }

            const sendResult = message.payload?.templateName
                ? await sendWaTemplate({
                    waNumber: message.recipientWa,
                    templateName: message.payload.templateName,
                    languageCode: message.payload.languageCode || 'en_US',
                    components: message.payload.components || [],
                })
                : await sendWaDirect(message.recipientWa, message.payload?.text || 'Your MealMate statement is ready.');

            if (sendResult.success) {
                await NotificationOutbox.findByIdAndUpdate(message._id, {
                    state: 'sent',
                    providerMessageId: sendResult.messageId || '',
                    processedAt: new Date(),
                    lastError: '',
                });
            } else {
                await fail(message, sendResult.error || 'Provider returned error');
            }
        } catch (e) {
            await fail(message, e.message);
        }
    } else {
        // in_app — nothing to send externally; mark delivered
        await NotificationOutbox.findByIdAndUpdate(message._id, { state: 'sent', processedAt: new Date() });
    }
};

const fail = async (message, errorText) => {
    const nextDelayMs = Math.min(30 * 60 * 1000, 30 * 1000 * 2 ** message.attempts); // 30s..30min backoff
    await NotificationOutbox.findByIdAndUpdate(message._id, {
        state: 'failed',
        lastError: String(errorText).slice(0, 300),
        nextAttemptAt: new Date(Date.now() + nextDelayMs),
    });
};

let timer = null;

export const startOutboxWorker = (intervalMs = 30 * 1000) => {
    if (timer) return;
    timer = setInterval(async () => {
        try {
            const batch = await leaseBatch();
            for (const message of batch) await deliver(message);
        } catch (e) {
            console.error('[outboxWorker] tick error:', e.message);
        }
    }, intervalMs);
};

export const stopOutboxWorker = () => {
    if (timer) clearInterval(timer);
    timer = null;
};

/** Enqueue a single notification into the outbox. */
export const enqueueNotification = async ({
    groupId, statementId = null, membershipId = null, userId = null,
    channel, purpose = 'statement', templateVersion = 'v1', dedupeKey = null,
    recipientEmail = '', recipientWa = '', payload = {},
}) => {
    return NotificationOutbox.create({
        groupId, statementId, membershipId, userId, channel, purpose,
        templateVersion, dedupeKey, recipientEmail, recipientWa, payload,
        state: 'pending',
    });
};
