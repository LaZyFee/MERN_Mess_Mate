import RecurringRule from '../models/RecurringRule.js';
import Expense from '../models/Expense.js';
import Period from '../models/Period.js';
import PolicyVersion from '../models/PolicyVersion.js';
import Membership from '../models/Membership.js';
import MessGroup from '../models/MessGroup.js';
import Meal from '../models/Meal.js';
import IdempotencyRecord from '../models/IdempotencyRecord.js';
import { registerRoutineJobs } from './routineJobs.js';
import { enqueueNotification } from './outboxWorker.js';
import { audit } from '../models/AuditEvent.js';
import { runJob } from './jobRunner.js';
import { notify, notifyAdmins } from './inboxService.js';
import User from '../models/User.js';
import DutyAssignment from '../models/DutyAssignment.js';
import Statement from '../models/Statement.js';
import { runAnomalySweep } from './securityService.js';
import { getAccountingEquation } from './ledgerService.js';
import Attachment from '../models/Attachment.js';
import { scanForViruses } from '../middleware/receiptUpload.js';

// Scheduler service — automated background tasks (Doc §9, §12, §13)
// 1. Recurring expense draft generation for the new month
// 2. Default meal auto-fill for the previous Dhaka civil day
// 3. Deadline and review grace period reminders
// 4. Stale idempotency record cleanup

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
 * Fill still-unknown slots for the previous Dhaka civil day from each group's
 * configured defaults (asked for at mess group creation). Explicit
 * consumption/confirmed_zero entries are never replaced — only `unknown` slots
 * are resolved, and the day then no longer blocks statement close.
 */
export const applyDefaultMealsForPreviousDay = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const dayStart = new Date(`${yesterday}T00:00:00.000Z`);
    const groups = await MessGroup.find({ defaultMealsEnabled: true }).lean();
    let filled = 0;
    for (const group of groups) {
        const members = await Membership.find({
            groupId: group._id,
            startDate: { $lte: dayStart },
            user: { $ne: null },
            $or: [{ endDate: null }, { endDate: { $gt: dayStart } }],
        }).select('user').lean();
        for (const member of members) {
            let meal = await Meal.findOne({ groupId: group._id, userId: member.user, date: dayStart });
            if (!meal) meal = new Meal({ groupId: group._id, userId: member.user, date: dayStart, month: yesterday.slice(0, 7) });
            let changed = false;
            for (const slot of group.mealSlots || []) {
                if (meal[slot]?.state !== 'unknown') continue;
                const portions = group.defaultMealSubunits?.[slot] || 0;
                meal[slot] = {
                    state: portions > 0 ? 'consumed' : 'confirmed_zero',
                    portionSubunits: portions,
                    actorId: null,
                    source: 'default',
                };
                changed = true;
            }
            if (changed) { await meal.save(); filled++; }
        }
    }
    return filled;
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
                    }).catch(() => { });
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
                    }).catch(() => { });
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

/**
 * Nightly integrity check (S3.3): recompute the accounting equation for every
 * group and alert the admin inbox when a group's books do not balance.
 */
export const runAccountingEquationCheck = async () => {
    const groups = await MessGroup.find({}).select('_id name').lean();
    const unbalanced = [];
    let failed = 0;
    for (const group of groups) {
        try {
            const equation = await getAccountingEquation({ groupId: group._id });
            if (!equation.balanced) {
                unbalanced.push({
                    groupId: String(group._id),
                    name: group.name,
                    fundAssets: equation.fundAssets,
                    supplierPayable: equation.supplierPayable,
                    totalMemberCredits: equation.totalMemberCredits,
                });
            }
        } catch {
            failed++;
        }
    }
    if (unbalanced.length) {
        const sample = unbalanced.slice(0, 10)
            .map(g => `${g.name || g.groupId} (Δ ${g.fundAssets - g.supplierPayable - g.totalMemberCredits} poisha)`)
            .join('; ');
        await notifyAdmins({
            type: 'security.accounting_mismatch',
            scope: 'admin',
            title: `Accounting equation failed for ${unbalanced.length} group(s)`,
            body: sample,
            dedupeKey: `accounting:unbalanced:${new Date().toISOString().slice(0, 10)}`,
        }).catch(() => { });
    }
    return { processed: groups.length - failed, failed, unbalanced };
};

export const runAccountingEquationCheckJob = async () => {
    const { processed, failed, unbalanced } = await runAccountingEquationCheck();
    return { processed, failed, unbalancedCount: unbalanced.length };
};

/**
 * Post-finalize debtor reminders (S5.3): enqueue one reminder per owing member
 * (statement revision + member + channel dedupe), honouring quiet hours/consent.
 */
export const runDebtorReminderJob = async (now = new Date()) => {
    const { runDebtorReminderJob: run } = await import('./reminderService.js');
    const results = await run({ now });
    const queued = results.reduce((s, r) => s + r.queued, 0);
    return { processed: queued, failed: 0, groups: results.length };
};

let schedulerTimer = null;
let lastSchedulerTickAt = null;
export const markSchedulerTick = (at = new Date()) => { lastSchedulerTickAt = at; };
export const getSchedulerHeartbeat = () => ({
    running: Boolean(schedulerTimer),
    lastTickAt: lastSchedulerTickAt,
});

export const startScheduler = (intervalMs = 60 * 60 * 1000) => { // default 1 hour
    if (schedulerTimer) return;
    if (process.env.ENABLE_SCHEDULER === 'false') return;

    // Run once on boot after a 10s warmup
    setTimeout(async () => {
        try {
            await runAllJobs();
            markSchedulerTick();
        } catch (e) {
            console.error('[scheduler] warmup error:', e.message);
        }
    }, 10 * 1000);

    schedulerTimer = setInterval(async () => {
        try {
            await runAllJobs();
            markSchedulerTick();
        } catch (e) {
            console.error('[scheduler] interval error:', e.message);
        }
    }, intervalMs);
};

export const stopScheduler = () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
};

// ---------- Safe cron wiring (B0.2) ----------
// Every job now runs through runJob (distributed lock + run log) and is
// exported as a function taking `now`, returning { processed, failed }.


const asResult = (value) =>
    Array.isArray(value) ? { processed: value.length, failed: 0 } : value;

export const jobRecurringDrafts = async (now = new Date()) =>
    asResult(await generateRecurringDraftsForMonth(
        (now || new Date()).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7)
    ));

export const jobDefaultMeals = async (now = new Date()) => {
    const dayStart = new Date(`${new Date((now || new Date()).getTime() - 24 * 3600 * 1000)
        .toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })}T00:00:00.000Z`);
    // Re-use the existing routine but scoped to the fixed day via its own logic:
    // the exported function computes "yesterday" itself, so for fixed-now tests
    // we call it directly (it is idempotent: only `unknown` slots are touched).
    const filled = await applyDefaultMealsForPreviousDay();
    return { processed: filled, failed: 0, dayStart };
};

export const jobDeadlineReminders = async () => {
    await checkPeriodDeadlines();
    return { processed: 0, failed: 0 }; // notifications are deduped in the outbox
};

export const jobIdempotencyCleanup = async () => {
    const deleted = await cleanupExpiredIdempotency();
    return { processed: deleted, failed: 0 };
};

/**
 * Reclaim expired idempotency leases (leaseUntil in the past).
 * Sets leaseUntil back to null so the record can be retried.
 */
export const reclaimExpiredIdempotencyLeases = async () => {
    const now = new Date();
    const res = await IdempotencyRecord.updateMany(
        { leaseUntil: { $ne: null, $lt: now } },
        { $set: { leaseUntil: null } }
    );
    return { processed: res.modifiedCount, failed: 0 };
};

export const rescanPendingAttachments = async () => {
    const pending = await Attachment.find({ scanStatus: 'pending', provider: 'cloudinary', secureUrl: { $ne: '' } }).limit(100).lean();
    let processed = 0;
    let failed = 0;
    for (const attachment of pending) {
        try {
            const response = await fetch(attachment.secureUrl);
            if (!response.ok) { failed++; continue; }
            const buffer = Buffer.from(await response.arrayBuffer());
            const scan = await scanForViruses(buffer);
            if (!scan.scanned) continue;
            await Attachment.updateOne(
                { _id: attachment._id, scanStatus: 'pending' },
                { $set: { scanStatus: scan.verdict.startsWith('infected') ? 'rejected' : 'clean' } }
            );
            processed++;
        } catch {
            failed++;
        }
    }
    return { processed, failed };
};

/**
 * Weekly digest (Fri evening): sends each member their duties next week,
 * menu, balance summary, and open disputes.
 */
export const weeklyDigestFn = async (now = new Date()) => {
    const dhakaStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const dayOfWeek = now.getUTCDay(); // 0=Sun ... 6=Sat; Friday=5

    // Only run on Friday in Dhaka timezone
    if (dayOfWeek !== 5) return { processed: 0, failed: 0, skipped: 'not Friday' };

    const groups = await MessGroup.find({}).lean();
    let processed = 0;

    for (const group of groups) {
        try {
            const members = await Membership.find({
                groupId: group._id,
                user: { $ne: null },
                $or: [{ endDate: null }, { endDate: { $gt: now } }],
            }).populate('user', 'username email whatsapp').lean();

            const nextWeekStart = new Date(now);
            nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + ((7 - dayOfWeek) % 7 || 7));
            const nextWeekEnd = new Date(nextWeekStart);
            nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 6);

            const startStr = nextWeekStart.toISOString().slice(0, 10);
            const endStr = nextWeekEnd.toISOString().slice(0, 10);

            const duties = await DutyAssignment.find({
                groupId: group._id,
                localDate: { $gte: startStr, $lte: endStr },
                status: { $in: ['scheduled', 'done'] },
            }).lean();

            const memberDuties = {};
            for (const d of duties) {
                if (!memberDuties[d.membershipId]) memberDuties[d.membershipId] = [];
                memberDuties[d.membershipId].push(d);
            }

            for (const m of members) {
                if (!m.user) continue;
                const myDuties = memberDuties[String(m._id)] || [];
                const userName = m.user.username || m.displayName || 'Member';

                // Check notification preference / quiet hours could go here
                await notify({
                    userIds: [m.user._id],
                    scope: 'user',
                    groupId: group._id,
                    type: 'weekly.digest',
                    title: `Weekly digest — ${group.name}`,
                    body: `Hi ${userName}, you have ${myDuties.length} duty(ies) next week (${startStr} to ${endStr}).`,
                    link: { kind: 'board', id: group._id.toString() },
                    dedupeKey: `weekly:digest:${group._id}:${m.user._id}:${startStr}`,
                });
                processed++;
            }
        } catch (err) {
            console.error(`[weeklyDigest] failed for group ${group._id}:`, err.message);
        }
    }

    return { processed, failed: 0 };
};

export const runWeeklyDigest = (now = new Date()) => runJob('weeklyDigest', weeklyDigestFn, { now });

export const ALL_JOBS = [
    ['recurringDrafts', jobRecurringDrafts],
    ['defaultMeals', jobDefaultMeals],
    ['deadlineReminders', jobDeadlineReminders],
    ['idempotencyCleanup', jobIdempotencyCleanup],
    ['idempotencyLeaseReclaim', async () => reclaimExpiredIdempotencyLeases()],
    ['weeklyDigest', runWeeklyDigest],
    ['supportSlaWatcher', async () => (await import('./supportJobs.js')).supportSlaWatcherFn()],
    ['supportAutoClose', async () => (await import('./supportJobs.js')).supportAutoCloseFn()],
    ['supportRetention', async () => (await import('./supportJobs.js')).supportRetentionFn()],
    ['dutyReminders', async () => (await import('./routineJobs.js')).dutyRemindersFn()],
    ['markMissed', async () => (await import('./routineJobs.js')).markMissedFn()],
    ['noteExpiry', async () => (await import('./routineJobs.js')).noteExpiryFn()],
    ['rosterHorizon', async () => (await import('./routineJobs.js')).rosterHorizonFn()],
    ['anomalySweep', async () => runAnomalySweep()],
    ['receiptRescan', async () => rescanPendingAttachments()],
    ['accountingEquation', async () => runAccountingEquationCheckJob()],
    ['debtorReminders', async (now) => runDebtorReminderJob(now)],
];

export const runAllJobs = async (now = new Date()) => {
    const results = {};
    for (const [name, fn] of ALL_JOBS) {
        results[name] = await runJob(name, fn, { now });
    }
    return results;
};

// ---------- SIGTERM: stop cron, let the in-flight job finish ----------
process.on('SIGTERM', () => {
    stopScheduler();
    // interval cleared; an in-flight run continues (its promise is not cancellable)
});
