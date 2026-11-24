import User from '../models/User.js';
import NotificationOutbox from '../models/NotificationOutbox.js';
import crypto from 'crypto';

/**
 * WhatsApp notifications for month-end summaries & webhook status updates (Doc §13, §19).
 *
 * Modes:
 *  1. Deep-link mode (default, zero-config) — generates wa.me links.
 *  2. Cloud API mode (optional) — direct text or pre-approved Meta template.
 *  3. Inbound webhooks — verifies signature and updates delivery receipts (delivered, read, failed).
 */

export const normalizeWaNumber = (raw) => {
    if (!raw) return null;
    const digits = String(raw).replace(/[^\d]/g, '');
    if (digits.length < 10 || digits.length > 15) return null;
    return digits; // wa.me / Meta Cloud API expects country-code digits without '+'
};

export const buildWaLink = (waNumber, message) => {
    const num = normalizeWaNumber(waNumber);
    if (!num) return null;
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
};

export const buildMemberSummaryMessage = ({ groupName, username, month, mealRate, totalMeals, mealCost, otherCost, totalDue, amountPaid, balance, note }) => {
    const lines = [
        `📋 *${groupName}* — Monthly Summary (${month})`,
        ``,
        `Hi *${username}*, here is your month-end bill:`,
        ``,
        `🍽️ Meals: ${totalMeals} × ৳${mealRate} = *৳${mealCost}*`,
        `🏠 Other costs (rent/bills/extras): *৳${otherCost}*`,
        `💰 *Total due: ৳${totalDue}*`,
        `💳 You paid: ৳${amountPaid}`,
        `${balance >= 0 ? `✅ You receive: ৳${balance}` : `🔴 You owe: ৳${Math.abs(balance)}`}`,
    ];
    if (note) lines.push(``, `📝 Note from admin: ${note}`);
    lines.push(``, `— sent via MealMate`);
    return lines.join('\n');
};

// Build per-member WhatsApp payloads from a computed/frozen summary
export const buildWaSummaryLinks = async ({ group, summary }) => {
    const members = await User.find({
        _id: { $in: group.members.map(m => m.user) },
    }).select('username whatsapp whatsappConsent').lean();

    const waMap = new Map(members.map(u => [String(u._id), u]));

    const results = [];
    for (const us of summary.userSummaries) {
        const user = waMap.get(String(us.userId));
        if (!user?.whatsapp) {
            results.push({ userId: us.userId, username: user?.username || 'Member', waLink: null, reason: 'no whatsapp number saved' });
            continue;
        }
        if (user.whatsappConsent === false) {
            results.push({ userId: us.userId, username: user.username, waLink: null, reason: 'recipient opted out of automated whatsapp' });
            continue;
        }
        const message = buildMemberSummaryMessage({
            groupName: group.name,
            username: user.username,
            month: summary.month,
            mealRate: summary.mealRate,
            totalMeals: us.totalMeals,
            mealCost: us.mealCost,
            otherCost: us.otherCost,
            totalDue: us.totalDue,
            amountPaid: us.mealExpenses,
            balance: us.balance,
        });
        results.push({ userId: us.userId, username: user.username, waLink: buildWaLink(user.whatsapp, message), message });
    }
    return results;
};

// Direct text send via WhatsApp Cloud API (Meta)
export const sendWaDirect = async (waNumber, message) => {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
        return { success: false, error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set' };
    }

    const num = normalizeWaNumber(waNumber);
    if (!num) return { success: false, error: 'Invalid WhatsApp number' };

    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: num,
                    type: 'text',
                    text: { body: message },
                }),
            }
        );
        const data = await res.json();
        if (res.ok && data.messages?.[0]?.id) {
            return { success: true, messageId: data.messages[0].id };
        }
        return { success: false, error: data.error?.message || 'Meta API error' };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Pre-approved Meta Template send (Doc §13: proactive business conversations)
export const sendWaTemplate = async ({ waNumber, templateName, languageCode = 'en_US', components = [] }) => {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
        return { success: false, error: 'WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set' };
    }

    const num = normalizeWaNumber(waNumber);
    if (!num) return { success: false, error: 'Invalid WhatsApp number' };

    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: num,
                    type: 'template',
                    template: {
                        name: templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'statement_summary',
                        language: { code: languageCode },
                        components,
                    },
                }),
            }
        );
        const data = await res.json();
        if (res.ok && data.messages?.[0]?.id) {
            return { success: true, messageId: data.messages[0].id };
        }
        return { success: false, error: data.error?.message || 'Template send failed' };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Webhook HMAC-SHA256 signature verification (Doc §13, §19)
export const verifyWebhookSignature = (rawPayload, signatureHeader, appSecret) => {
    if (!signatureHeader || !appSecret) return false;
    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;
    const expectedHash = parts[1];
    if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
    const generatedHash = crypto.createHmac('sha256', appSecret).update(rawPayload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(generatedHash, 'hex'));
};

// Inbound webhook status receiver: updates NotificationOutbox status
export const processWebhookStatuses = async (statuses = []) => {
    const results = [];
    for (const st of statuses) {
        const { id: messageId, status, timestamp, errors } = st;
        // status is one of: sent, delivered, read, failed
        const update = {};
        if (status === 'delivered') update.state = 'delivered';
        else if (status === 'read') update.state = 'read';
        else if (status === 'failed') {
            update.state = 'failed';
            update.lastError = errors?.[0]?.title || errors?.[0]?.message || 'WhatsApp delivery failed';
        }
        if (Object.keys(update).length > 0) {
            const updated = await NotificationOutbox.findOneAndUpdate(
                { providerMessageId: messageId },
                { $set: update },
                { new: true }
            );
            results.push({ messageId, status, updated: !!updated });
        }
    }
    return results;
};
