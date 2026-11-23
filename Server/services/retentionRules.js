// Retention rules & job — PURE decision logic separated from DB access.
// Policy (plan §17/§18):
//   - Support tickets closed/resolved > RETENTION_TICKET_MONTHS (18) months ago
//     are anonymised: subject/body/rating comment -> "[removed]", resolution
//     note cleared, userId unlinkable (set null), counts preserved.
//   - AuditEvents older than RETENTION_AUDIT_MONTHS (24) months are deleted.
//   - SecurityEvent / InboxNotification rely on Mongo TTL indexes (90 days).

export const RETENTION_TICKET_MONTHS = 18;
export const RETENTION_AUDIT_MONTHS = 24;
export const REMOVED = '[removed]';

const monthsAgo = (months, now = new Date()) =>
    new Date(new Date(now).getTime() - months * 30 * 24 * 3600 * 1000);

/** Cutoff instant before which closed tickets must be anonymised. */
export const ticketRetentionCutoff = (now = new Date()) =>
    monthsAgo(RETENTION_TICKET_MONTHS, now);

/** Cutoff instant before which audit events are deleted. */
export const auditRetentionCutoff = (now = new Date()) =>
    monthsAgo(RETENTION_AUDIT_MONTHS, now);

/**
 * Should a ticket be anonymised? Only terminal tickets (closed, or resolved
 * that never got closed but are past retention anyway) past the cutoff.
 */
export const needsAnonymisation = (ticket, now = new Date()) => {
    if (!ticket) return false;
    const endRef = ticket.closedAt || ticket.resolvedAt || ticket.updatedAt || ticket.createdAt;
    if (!endRef) return false;
    if (!['closed', 'resolved'].includes(ticket.status)) return false;
    return new Date(endRef).getTime() <= ticketRetentionCutoff(now).getTime();
};

/**
 * The anonymisation patch for one ticket. Identity link removed, free text
 * stripped, but numeric counters (reopenCount) and the ticket number kept so
 * aggregate stats survive.
 */
export const anonymisationPatch = (now = new Date()) => ({
    userId: null,
    assignedAdminId: null,
    subject: REMOVED,
    resolutionNote: REMOVED,
    contextSnapshot: null,
    'rating.comment': REMOVED,
    anonymisedAt: now,
});
