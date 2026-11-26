// Post-finalize debtor reminders (S5.3) — pure rules, no DB access.
// A "debtor" is a statement item whose closingCredit is negative (owes the group).
// Delivery honours per-user consent + quiet hours; the outbox dedupeKey is
// derived from statement+member so a correction revision never duplicates a reminder.

const DEFAULT_QUIET = { from: '22:00', to: '07:00' };

const toMinutes = (hhmm) => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || ''));
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
};

/** True when `now` (Date) falls inside the user's quiet window (supports wrap-around). */
export const isQuietHours = (now, quietHours = DEFAULT_QUIET) => {
    const from = toMinutes(quietHours?.from);
    const to = toMinutes(quietHours?.to);
    if (from === null || to === null || from === to) return false;
    const mins = now.getHours() * 60 + now.getMinutes();
    return from < to ? (mins >= from && mins < to) : (mins >= from || mins < to);
};

/** Quiet hours use the server's wall clock (quietHours are stored as local HH:MM). */
export const dhakaClock = (now = new Date()) => ({ hour: now.getHours(), minute: now.getMinutes() });

/**
 * Select reminder targets from a finalized statement.
 *   items: statement items
 *   membershipsByItemId: Map<string, { user, whatsapp, email, whatsappConsent }>
 *   prefsByUserId: Map<string, notificationPrefs>
 *   minAmountPoisha: ignore tiny debts (rounding dust)
 * Returns [{ membershipId, userId, amountPoisha, channels }] with channels ⊆ email, whatsapp.
 */
export const selectDebtorTargets = ({
    items = [], membershipsByItemId = new Map(), prefsByUserId = new Map(),
    minAmountPoisha = 100, now = new Date(),
}) => {
    const targets = [];
    for (const item of items) {
        const owed = Number(item.closingCredit) || 0;
        if (owed >= 0) continue; // receives or settled
        const amountPoisha = -owed;
        if (amountPoisha < minAmountPoisha) continue;

        const key = String(item.membershipId);
        const membership = membershipsByItemId.get(key);
        const user = membership?.user;
        if (!user) continue; // placeholder membership has no delivery target
        const prefs = prefsByUserId.get(String(user._id)) || {};
        if (prefs.types?.payment_reminder === false) continue;
        if (isQuietHours(now, prefs.quietHours || DEFAULT_QUIET)) continue;

        const channels = [];
        if (user.whatsapp && user.whatsappConsent !== false) channels.push('whatsapp');
        if (user.email) channels.push('email');
        if (!channels.length) continue;

        targets.push({ membershipId: item.membershipId, userId: user._id, amountPoisha, channels });
    }
    return targets;
};

/** Stable dedupeKey: one reminder per statement+member (+ revision keeps versions apart). */
export const reminderDedupeKey = ({ groupId, month, version, membershipId, channel }) =>
    `reminder:${groupId}:${month}:${version}:${membershipId}:${channel}`;

/**
 * Reminder cadence: remind every N days after the statement month closed, for at
 * most `maxReminders` attempts. Pure so it can be unit-tested without a scheduler.
 */
export const shouldSendReminder = ({ month, version, now = new Date(), intervalDays = 7, maxReminders = 3, attemptsSent = 0 }) => {
    if (attemptsSent >= maxReminders) return false;
    const monthEnd = new Date(`${month}-01T00:00:00.000Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    const daysSince = Math.floor((now.getTime() - monthEnd.getTime()) / 86_400_000);
    if (daysSince < 0) return false;
    const nextDue = attemptsSent === 0 ? 1 : intervalDays * attemptsSent; // first reminder the day after close
    return daysSince >= nextDue && version >= 1;
};

/** Human-readable reminder body (plain text; rendered by the outbox templates). */
export const buildReminderText = ({ groupName = 'your mess group', displayName, month, amountPoisha }) => {
    const taka = (Math.round(Number(amountPoisha) || 0) / 100).toFixed(2);
    return `Hi ${displayName}, the ${month} statement for ${groupName} is finalized. `
        + `You owe ৳${taka}. Please settle with the treasurer — thanks!`;
};
