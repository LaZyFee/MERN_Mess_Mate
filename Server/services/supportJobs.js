
// ---------- Support Desk jobs (B1.5) ----------

import { runJob } from './jobRunner.js';
import { SupportTicket, SupportMessage } from '../models/Support.js';
import { slaStage, canTransition, AUTOCLOSE_WARNING_HOURS } from './supportRules.js';
import { notify, notifyAdmins } from './inboxService.js';
import {
    needsAnonymisation,
    anonymisationPatch,
    auditRetentionCutoff,
    RETENTION_TICKET_MONTHS,
    RETENTION_AUDIT_MONTHS,
} from './retentionRules.js';


/**
 * Alerts at 75% and 100% of firstResponseDueAt while firstAdminReplyAt is null.
 * Dedupe keys ensure exactly one alert per stage per ticket.
 */
export const supportSlaWatcherFn = async (now = new Date()) => {
    let processed = 0;
    const candidates = await SupportTicket.find({
        firstAdminReplyAt: null,
        firstResponseDueAt: { $ne: null },
        status: { $in: ['open', 'answered', 'awaiting_admin'] },
    }).select('_id ticketNo subject userId createdAt firstResponseDueAt').lean();

    for (const t of candidates) {
        try {
            const stage = slaStage(t, now);
            if (stage === 'none') continue;
            const bucket = stage === '100' ? '100' : '75';
            await notifyAdmins({
                type: `support.sla_${bucket}`,
                title: `SLA ${bucket}% — ticket ${t.ticketNo}`,
                body: t.subject,
                link: { kind: 'support_ticket', id: t._id },
                dedupeKey: `support:sla${bucket}:${t._id}`,
            });
            processed++;
        } catch { /* per-item isolation */ }
    }
    return { processed, failed: 0 };
};

export const runSupportSlaWatcher = (now = new Date()) =>
    runJob('supportSlaWatcher', supportSlaWatcherFn, { now });

/** Resolved > 72h -> system close (with a system message); 48h warning. */
export const supportAutoCloseFn = async (now = new Date()) => {
    let processed = 0;
    let failed = 0;
    const resolved = await SupportTicket.find({ status: 'resolved', resolvedAt: { $ne: null } })
        .select('_id userId status resolvedAt revision').lean();

    for (const t of resolved) {
        try {
            const ageHours = (new Date(now).getTime() - new Date(t.resolvedAt).getTime()) / 3600_000;
            if (ageHours >= 72) {
                const decision = canTransition(t, 'autoClose', 'system', now);
                if (decision.allowed) {
                    const upd = await SupportTicket.updateOne(
                        { _id: t._id, status: 'resolved', revision: t.revision },
                        { $set: { status: decision.nextStatus, ...(decision.patch || {}) }, $inc: { revision: 1 } }
                    );
                    if (upd.matchedCount) {
                        await SupportMessage.create({
                            ticketId: t._id, authorType: 'system',
                            body: 'Ticket auto-closed after 72 hours in resolved state.',
                        });
                        await notify({
                            userIds: [t.userId], type: 'support.ticket_closed',
                            title: 'Ticket auto-closed',
                            body: 'Your resolved ticket was closed automatically.',
                            link: { kind: 'support_ticket', id: t._id },
                            dedupeKey: `support:autoclose:${t._id}`,
                        });
                        processed++;
                    }
                }
            } else if (ageHours >= AUTOCLOSE_WARNING_HOURS) {
                await notify({
                    userIds: [t.userId], type: 'support.autoclose_warning',
                    title: 'Ticket will close soon',
                    body: 'Your resolved ticket will auto-close in about 24 hours.',
                    link: { kind: 'support_ticket', id: t._id },
                    dedupeKey: `support:autowarn:${t._id}`,
                });
                processed++;
            }
        } catch { failed++; }
    }
    return { processed, failed };
};

export const runSupportAutoClose = (now = new Date()) =>
    runJob('supportAutoClose', supportAutoCloseFn, { now });

// Register into the scheduler's job list
export const registerSupportJobs = (list) => {
    list.push(['supportSlaWatcher', supportSlaWatcherFn]);
    list.push(['supportAutoClose', supportAutoCloseFn]);
    list.push(['supportRetention', supportRetentionFn]);
};

// ---------- Retention job (B3, §17/§18) ----------
// Anonymise support tickets closed > 18 months ago and delete AuditEvents
// older than 24 months. SecurityEvent & InboxNotification use Mongo TTLs.


export const supportRetentionFn = async (now = new Date()) => {
    let processed = 0;
    let failed = 0;
    const candidates = await SupportTicket.find({
        status: { $in: ['closed', 'resolved'] },
        anonymisedAt: null,
    }).select('_id status closedAt resolvedAt updatedAt createdAt').lean();

    for (const t of candidates) {
        try {
            if (!needsAnonymisation(t, now)) continue;
            await SupportTicket.updateOne({ _id: t._id }, { $set: anonymisationPatch(now) });
            processed++;
        } catch { failed++; }
    }

    const cutoff = auditRetentionCutoff(now);
    const { default: AuditEvent } = await import('../models/AuditEvent.js');
    const { deletedCount = 0 } = await AuditEvent.deleteMany({ createdAt: { $lt: cutoff } });

    return {
        processed,
        failed,
        auditEventsDeleted: deletedCount,
        cutoffs: { tickets: RETENTION_TICKET_MONTHS, audits: RETENTION_AUDIT_MONTHS },
    };
};
