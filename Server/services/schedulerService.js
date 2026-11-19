import RecurringRule from '../models/RecurringRule.js';
import Expense from '../models/Expense.js';
import Period from '../models/Period.js';
import PolicyVersion from '../models/PolicyVersion.js';
import Membership from '../models/Membership.js';
import IdempotencyRecord from '../models/IdempotencyRecord.js';
import { enqueueNotification } from './outboxWorker.js';
import { audit } from '../models/AuditEvent.js';

// Scheduler service — automated background tasks (Doc §9, §12, §13)
// 1. Recurring expense draft generation for the new month
// 2. Deadline and review grace period reminders
// 3. Stale idempotency record cleanup

const currentDhakaMonth = () => {
    // Current Asia/Dhaka month "YYYY-MM"
    const now = new Date();
    const dhakaStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); // "YYYY-MM-DD"
    return dhakaStr.slice(0, 7);
};

/**
 * Generate draft expenses from all active RecurringRules for a given costPeriod.
 * Unique generation keys prevent duplicate generation for the same period.
 */
export const generateRecurringDraftsForMonth = async (costPeriod = currentDhakaMonth()) => {
    const rules = await RecurringRule.find({
        isActive: true,
        effectiveFrom: { $lte: costPeriod },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: costPeriod } }],
        generatedKeys: { $ne: costPeriod },
    });

    const generated = [];
    for (const rule of rules) {
        try {
            const expense = await Expense.create({
                groupId: rule.groupId,
                createdBy: rule.createdBy,
                status: 'draft',
                supplierName: rule.supplierName,
                description: `${rule.name} (Recurring)`,
                date: new Date(),
                costPeriod,
                month: costPeriod,
                amount: rule.amount,
                lines: [{
                    description: rule.name,
                    categoryId: rule.categoryId,
                    amount: rule.amount,
                    splitMode: rule.splitMode,
                    beneficiaries: rule.beneficiaries || [],
                    fixedAmounts: rule.fixedAmounts || [],
                    weights: rule.weights || [],
                }],
                isPayable: true,
                paidTotal: 0,
            });

            rule.generatedKeys.push(costPeriod);
            await rule.save();

            await audit({
                groupId: rule.groupId,
                actorId: rule.createdBy,
                action: 'recurring.draft_generated',
                targetType: 'expense',
                targetId: expense._id,
                after: { ruleId: rule._id, costPeriod, amount: rule.amount },
            });

            generated.push({ ruleId: rule._id, expenseId: expense._id, costPeriod });
        } catch (err) {
            console.error(`[scheduler] failed generating rule ${rule._id}:`, err.message);
        }
    }
    return generated;
};

/**
 * Check open periods that need review reminders or transition to review state.
 */
export const checkPeriodDeadlines = async () => {
    const month = currentDhakaMonth();
    const openPeriods = await Period.find({ state: 'open' }).lean();

    for (const period of openPeriods) {
        // If current month has moved past this period's month, review is due
        if (period.month < month) {
            // Find group managers/owners to notify
            const managers = await Membership.find({
                groupId: period.groupId,
                role: { $in: ['owner', 'manager', 'treasurer'] },
                $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
            }).populate('user', 'email whatsapp username').lean();

            for (const m of managers) {
                if (!m.user) continue;
                const text = `⏰ Reminder: Period ${period.month} for your mess group is open and past its month end. Please review submissions and initiate closing.`;
                if (m.user.whatsapp) {
                    await enqueueNotification({
                        groupId: period.groupId,
                        userId: m.user._id,
                        channel: 'whatsapp',
                        purpose: 'reminder',
                        recipientWa: m.user.whatsapp,
                        payload: { text },
                        dedupeKey: `deadline_${period.groupId}_${period.month}_${m.user._id}`,
                    }).catch(() => {});
                }
                if (m.user.email) {
                    await enqueueNotification({
                        groupId: period.groupId,
                        userId: m.user._id,
                        channel: 'email',
                        purpose: 'reminder',
                        recipientEmail: m.user.email,
                        payload: {
                            subject: `MealMate: Review deadline reminder for ${period.month}`,
                            html: `<p>${text}</p>`,
                        },
                        dedupeKey: `deadline_${period.groupId}_${period.month}_${m.user._id}`,
                    }).catch(() => {});
                }
            }
        }
    }
};

/**
 * Clean up expired idempotency records
 */
export const cleanupExpiredIdempotency = async () => {
    try {
        const res = await IdempotencyRecord.deleteMany({ expiresAt: { $lt: new Date() } });
        return res.deletedCount;
    } catch {
        return 0;
    }
};

let schedulerTimer = null;

export const startScheduler = (intervalMs = 60 * 60 * 1000) => { // default 1 hour
    if (schedulerTimer) return;

    // Run once on boot after a 10s warmup
    setTimeout(async () => {
        try {
            await generateRecurringDraftsForMonth();
            await checkPeriodDeadlines();
            await cleanupExpiredIdempotency();
        } catch (e) {
            console.error('[scheduler] warmup error:', e.message);
        }
    }, 10 * 1000);

    schedulerTimer = setInterval(async () => {
        try {
            await generateRecurringDraftsForMonth();
            await checkPeriodDeadlines();
            await cleanupExpiredIdempotency();
        } catch (e) {
            console.error('[scheduler] interval error:', e.message);
        }
    }, intervalMs);
};

export const stopScheduler = () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
};

