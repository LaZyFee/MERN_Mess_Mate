// Post-finalize debtor reminders (S5.3) — reads the current Statement, selects
// owing members (pure rules in reminderRules.js) and enqueues outbox rows.
// Dedupe: one row per statement revision + member + channel, so re-running the
// job or finalizing a correction never spams the same reminder twice.

import Statement from '../models/Statement.js';
import Membership from '../models/Membership.js';
import MessGroup from '../models/MessGroup.js';
import NotificationOutbox from '../models/NotificationOutbox.js';
import {
    selectDebtorTargets, reminderDedupeKey, buildReminderText, shouldSendReminder,
} from './reminderRules.js';

const STOP_STATES = ['sent', 'delivered', 'read'];
const MAX_CHANNELS = 3;

/**
 * Build + enqueue reminders for one group/month.
 * Returns { queued, skipped, targets } — never throws on missing optional data.
 */
export const sendDebtorReminders = async ({
    groupId, month, now = new Date(), intervalDays = 7, maxReminders = 3, minAmountPoisha = 100,
}) => {
    const statement = await Statement.findOne({ groupId, month, state: 'current' }).lean();
    if (!statement) return { queued: 0, skipped: 0, targets: 0 };

    // already sent per membership+channel for the previous reminder cycle
    const priorRows = await NotificationOutbox.find({
        groupId, statementId: statement._id, purpose: 'reminder',
    }).select('membershipId channel state').lean();
    const sentCount = new Map();
    for (const row of priorRows) {
        if (!STOP_STATES.includes(row.state)) continue;
        const key = `${row.membershipId}:${row.channel}`;
        sentCount.set(key, (sentCount.get(key) || 0) + 1);
    }
    const maxSent = priorRows.reduce((m, r) => Math.max(m, STOP_STATES.includes(r.state) ? 1 : 0), 0);
    if (!shouldSendReminder({ month, version: statement.version, now, intervalDays, maxReminders, attemptsSent: maxSent })) {
        return { queued: 0, skipped: priorRows.length, targets: 0 };
    }

    const ids = statement.items.map(i => i.membershipId);
    const [memberships, group] = await Promise.all([
        Membership.find({ _id: { $in: ids } }).populate('user', 'email whatsapp whatsappConsent notificationPrefs').lean(),
        MessGroup.findById(groupId).select('name').lean(),
    ]);
    const membershipsByItemId = new Map(memberships.map(m => [String(m._id), m]));
    const prefsByUserId = new Map();
    for (const m of memberships) {
        if (m.user) prefsByUserId.set(String(m.user._id), m.user.notificationPrefs || {});
    }

    const targets = selectDebtorTargets({
        items: statement.items, membershipsByItemId, prefsByUserId, minAmountPoisha, now,
    });

    const rows = [];
    for (const target of targets) {
        const membership = membershipsByItemId.get(String(target.membershipId));
        const text = buildReminderText({
            groupName: group?.name || 'your mess group',
            displayName: statement.items.find(i => String(i.membershipId) === String(target.membershipId))?.displayName,
            month, amountPoisha: target.amountPoisha,
        });
        for (const channel of target.channels) {
            if ((sentCount.get(`${target.membershipId}:${channel}`) || 0) >= MAX_CHANNELS) continue;
            rows.push({
                groupId, statementId: statement._id, membershipId: target.membershipId, userId: target.userId,
                channel, purpose: 'reminder', templateVersion: 'v1',
                dedupeKey: reminderDedupeKey({
                    groupId, month, version: statement.version, membershipId: target.membershipId, channel,
                }),
                recipientEmail: channel === 'email' ? membership?.user?.email || '' : '',
                recipientWa: channel === 'whatsapp' ? membership?.user?.whatsapp || '' : '',
                payload: channel === 'email'
                    ? { subject: `MealMate: ${month} payment reminder`, text, html: `<p>${text}</p>` }
                    : { text },
                state: 'pending',
            });
        }
    }

    let queued = 0;
    if (rows.length) {
        try {
            const result = await NotificationOutbox.insertMany(rows, { ordered: false });
            queued = result.length;
        } catch (err) {
            // duplicate dedupeKey (job re-ran) ⇒ count only the ones actually written
            queued = err?.result?.insertedCount || err?.insertedCount || 0;
        }
    }
    return { queued, skipped: rows.length - queued, targets: targets.length };
};

/** Enqueue reminders for every group with a finalized current statement. */
export const runDebtorReminderJob = async ({ now = new Date() } = {}) => {
    const results = [];
    const open = await Statement.find({ state: 'current', finalizedAt: { $lt: now } })
        .select('groupId month').lean();
    for (const s of open) {
        try {
            const r = await sendDebtorReminders({ groupId: s.groupId, month: s.month, now });
            if (r.queued) results.push({ groupId: s.groupId, month: s.month, ...r });
        } catch (err) {
            console.error(`[reminders] ${s.groupId}/${s.month}:`, err.message);
        }
    }
    return results;
};
