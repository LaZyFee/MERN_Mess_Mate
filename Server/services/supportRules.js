// Support Desk rule engine — PURE functions, no DB access.
// The comment-lock table (plan §15.1):
//   open           user: denied TICKET_AWAITING_ADMIN | admin: allowed -> answered (+firstAdminReplyAt)
//   answered       user: allowed -> awaiting_admin    | admin: allowed (stays answered)
//   awaiting_admin user: denied (strict) / allowed (non-strict) | admin: allowed -> answered
//   resolved       user: denied TICKET_RESOLVED       | admin: allowed -> answered
//   closed         user: denied TICKET_CLOSED         | admin: denied TICKET_CLOSED

export const STATUSES = ['open', 'answered', 'awaiting_admin', 'resolved', 'closed'];
export const REOPEN_WINDOW_DAYS = 7;
export const AUTOCLOSE_HOURS = 72;
export const AUTOCLOSE_WARNING_HOURS = 48;

const isStrictMode = (opts = {}) => {
    if (typeof opts.strict === 'boolean') return opts.strict;
    return process.env.SUPPORT_STRICT_TURNS !== 'false';
};

/** { allowed, code?, reason? } for a user comment attempt. */
export const canUserComment = (ticket, opts = {}) => {
    const status = ticket?.status;
    switch (status) {
        case 'open':
            return { allowed: false, code: 'TICKET_AWAITING_ADMIN', reason: 'An admin will reply first. You can reply once the ticket is answered.' };
        case 'answered':
            return { allowed: true };
        case 'awaiting_admin':
            if (isStrictMode(opts)) {
                return { allowed: false, code: 'TICKET_AWAITING_ADMIN', reason: 'Please wait for an admin response before replying again.' };
            }
            // Non-strict: the lock was only until the FIRST admin reply.
            return ticket.firstAdminReplyAt
                ? { allowed: true }
                : { allowed: false, code: 'TICKET_AWAITING_ADMIN', reason: 'An admin will reply first.' };
        case 'resolved':
            return { allowed: false, code: 'TICKET_RESOLVED', reason: 'This ticket is resolved. Reopen it to add a comment.' };
        case 'closed':
            return { allowed: false, code: 'TICKET_CLOSED', reason: 'This ticket is closed. Please open a new ticket.' };
        default:
            return { allowed: false, code: 'TICKET_CLOSED', reason: 'Unknown ticket state.' };
    }
};

/** { allowed, code?, reason? } for an admin comment attempt. */
export const canAdminComment = (ticket) => {
    if (ticket?.status === 'closed') {
        return { allowed: false, code: 'TICKET_CLOSED', reason: 'Ticket is closed — reopen it first.' };
    }
    return { allowed: true };
};

/**
 * Status after a comment. authorType: 'user' | 'admin'.
 * Throws nothing; returns the new status. Caller applies the optimistic guard.
 */
export const nextStatusAfterMessage = (ticket, authorType) => {
    if (authorType === 'admin') {
        // Admin replies always (re-)hand the ticket to the user.
        return 'answered';
    }
    if (ticket.status === 'answered') return 'awaiting_admin';
    if (ticket.status === 'awaiting_admin' && !isStrictMode()) return 'awaiting_admin';
    return ticket.status;
};

/**
 * Transition check. action: resolve | close | reopen | autoClose.
 * actorType: user | admin | system. now injected for testability.
 * Returns { allowed, code?, reason?, nextStatus, patch } or { allowed:false }.
 */
export const canTransition = (ticket, action, actorType, now = new Date(), opts = {}) => {
    const status = ticket?.status;
    const t = (reason, code) => ({ allowed: false, reason, code });

    switch (action) {
        case 'resolve': {
            if (status === 'closed') return t('Ticket is closed.', 'TICKET_CLOSED');
            if (actorType === 'user' && !['open', 'answered', 'awaiting_admin'].includes(status)) {
                return t('Ticket is already resolved.', 'TICKET_RESOLVED');
            }
            return { allowed: true, nextStatus: 'resolved', patch: { resolvedAt: now } };
        }
        case 'close': {
            if (status === 'closed') return t('Ticket is already closed.', 'TICKET_CLOSED');
            const allowedFrom = actorType === 'user' ? ['resolved', 'answered'] : ['resolved'];
            if (!allowedFrom.includes(status)) {
                return t('Only a resolved ticket can be closed.', 'TICKET_RESOLVED');
            }
            return { allowed: true, nextStatus: 'closed', patch: { closedAt: now, closedBy: actorType } };
        }
        case 'reopen': {
            if (actorType === 'user') {
                if (status !== 'resolved') return t('Ticket cannot be reopened.', status === 'closed' ? 'TICKET_CLOSED' : 'TICKET_STATE_CHANGED');
                const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;
                if (!resolvedAt) return t('Ticket cannot be reopened.', 'TICKET_STATE_CHANGED');
                const windowMs = REOPEN_WINDOW_DAYS * 24 * 3600 * 1000;
                if (new Date(now).getTime() - resolvedAt.getTime() > windowMs) {
                    return t(`Reopen window of ${REOPEN_WINDOW_DAYS} days has expired. Please open a new ticket.`, 'REOPEN_WINDOW_EXPIRED');
                }
                return {
                    allowed: true, nextStatus: 'awaiting_admin',
                    patch: { resolvedAt: null, reopenCount: (ticket.reopenCount || 0) + 1 },
                };
            }
            // admin / system
            if (!['closed', 'resolved'].includes(status)) {
                return t('Only closed or resolved tickets can be reopened.', 'TICKET_STATE_CHANGED');
            }
            if (actorType === 'admin' && !opts.reason) {
                return t('A reason is required to reopen a ticket.', 'VALIDATION');
            }
            return {
                allowed: true, nextStatus: 'answered',
                patch: { resolvedAt: null, closedAt: null, closedBy: null },
            };
        }
        case 'autoClose': {
            if (status !== 'resolved') return t('Only resolved tickets auto-close.', 'TICKET_STATE_CHANGED');
            const resolvedAt = new Date(ticket.resolvedAt).getTime();
            if (new Date(now).getTime() - resolvedAt <= AUTOCLOSE_HOURS * 3600 * 1000) {
                return t('Ticket is not old enough to auto-close.', 'TICKET_STATE_CHANGED');
            }
            return { allowed: true, nextStatus: 'closed', patch: { closedAt: now, closedBy: 'system' } };
        }
        default:
            return t(`Unknown action ${action}`, 'VALIDATION');
    }
};

/** True when `resolvedAt` is older than the auto-close threshold. */
export const isAutoCloseable = (ticket, now = new Date()) => {
    if (ticket?.status !== 'resolved' || !ticket?.resolvedAt) return false;
    return new Date(now).getTime() - new Date(ticket.resolvedAt).getTime() > AUTOCLOSE_HOURS * 3600 * 1000;
};

/** SLA watch: 'none' | '75' | '100' — first response due vs elapsed time. */
export const slaStage = (ticket, now = new Date()) => {
    if (!ticket || ticket.firstAdminReplyAt) return 'none';
    if (!ticket.firstResponseDueAt) return 'none';
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : null;
    const due = new Date(ticket.firstResponseDueAt).getTime();
    const n = new Date(now).getTime();
    if (n >= due) return '100';
    if (createdAt && n >= createdAt + 0.75 * (due - createdAt)) return '75';
    return 'none';
};
