import crypto from 'crypto';
import { SupportTicket, SupportMessage, SupportActionToken, nextTicketNo, supportSlaDueAt } from '../models/Support.js';
import { audit } from '../models/AuditEvent.js';
import { paginateQuery } from '../utils/pagination.js';
import {
    canUserComment, canAdminComment, nextStatusAfterMessage, canTransition, slaStage,
} from '../services/supportRules.js';
import { notify, notifyAdmins } from '../services/inboxService.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';

// Support Desk controller — user side (/api/support). A user only ever sees
// their OWN tickets: a foreign ticket id answers the generic 404.

const notFound = (res) => res.status(404).json({ msg: 'Ticket not found' });
const OPTIMISTIC = { code: 'TICKET_STATE_CHANGED' };

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Compute permissions block via the PURE rule functions (never re-implemented). */
const permissionsFor = (ticket) => {
    const c = canUserComment(ticket);
    const res = canTransition(ticket, 'resolve', 'user');
    const close = canTransition(ticket, 'close', 'user');
    const reopen = canTransition(ticket, 'reopen', 'user');
    return {
        canComment: c.allowed, reason: c.reason || null, code: c.code || null,
        canResolve: res.allowed, canClose: close.allowed, canReopen: reopen.allowed,
        reopenCode: reopen.code || null,
    };
};

const ALLOWED_TRANSITIONS = {
    resolve: (r) => r.allowed && { status: r.nextStatus, set: r.patch },
    close: (r) => r.allowed && { status: r.nextStatus, set: r.patch },
    reopen: (r) => r.allowed && { status: r.nextStatus, set: r.patch },
};

/**
 * Optimistic guarded transition write:
 * updateOne({ _id, status: expectedStatus, revision }, { $set, $inc:{revision} })
 * returns null when the guard misses (0 rows) -> caller replies 409.
 */
export const guardedTransition = async (ticket, action, actorType, extra = {}, now = new Date()) => {
    const decision = canTransition(ticket, action, actorType, now, extra);
    if (!decision.allowed) return { error: decision };
    const update = { $set: { status: decision.nextStatus, ...(decision.patch || {}) }, $inc: { revision: 1 } };
    if (extra.resolutionNote && action === 'resolve') update.$set.resolutionNote = String(extra.resolutionNote).slice(0, 2000);
    if (action === 'reopen' && actorType === 'admin') update.$set.reopenReason = String(extra.reason).slice(0, 500);
    const result = await SupportTicket.updateOne(
        { _id: ticket._id, status: ticket.status, revision: ticket.revision },
        update
    );
    if (result.matchedCount === 0) return { error: OPTIMISTIC };
    return { status: decision.nextStatus, patch: decision.patch || {} };
};

/** POST /api/support/tickets — idempotent, limited (3 open, 5/day). */
export const createTicket = async (req, res, next) => {
    try {
        const { category, subject, body, groupId, attachContext, attachmentIds } = req.body;
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);

        const [openCount, dayCount] = await Promise.all([
            SupportTicket.countDocuments({ userId: req.user.id, status: { $in: ['open', 'answered', 'awaiting_admin'] } }),
            SupportTicket.countDocuments({ userId: req.user.id, createdAt: { $gte: dayAgo } }),
        ]);
        if (openCount >= 3 || dayCount >= 5) {
            return res.status(429).json({ msg: 'Too many open or recent tickets', code: 'TICKET_LIMIT' });
        }

        let contextSnapshot = null;
        if (attachContext && groupId) {
            const m = await Membership.findOne({ groupId, user: req.user.id })
                .select('role startDate endDate').lean();
            if (m) contextSnapshot = { groupId, role: m.role, startDate: m.startDate, endDate: m.endDate, capturedAt: now };
        }

        const ticket = await SupportTicket.create({
            ticketNo: await nextTicketNo(),
            userId: req.user.id,
            groupId: groupId || null,
            category,
            subject: String(subject).slice(0, 120),
            status: 'open',
            firstResponseDueAt: supportSlaDueAt('normal', now),
            contextSnapshot,
            revision: 0,
        });
        await SupportMessage.create({
            ticketId: ticket._id, authorType: 'user', authorId: req.user.id,
            body, attachmentIds: attachmentIds || [],
        });

        await audit({ actorId: req.user.id, action: 'support.ticket.created', targetType: 'support_ticket', targetId: ticket._id });
        await notifyAdmins({
            type: 'support.ticket_created',
            title: `New ticket ${ticket.ticketNo}: ${ticket.subject}`,
            body: category,
            link: { kind: 'support_ticket', id: ticket._id },
            dedupeKey: `support:created:${ticket._id}`,
        }).catch(() => { });

        res.status(201).json({ msg: 'Ticket created', ticket: { id: ticket._id, ticketNo: ticket.ticketNo, status: ticket.status } });
    } catch (err) { next(err); }
};

/** GET /api/support/tickets?status=&cursor= — mine only. */
export const listMyTickets = async (req, res, next) => {
    try {
        const q = req.validated?.query || {};
        const filter = { userId: req.user.id };
        if (q.status) filter.status = q.status;
        const page = await paginateQuery({
            model: SupportTicket, filter, cursor: q.cursor, limit: 20,
            sortField: '_id', sortOrder: -1,
        });
        res.json({ tickets: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore });
    } catch (err) { next(err); }
};

/** GET /api/support/tickets/:id — thread without internal notes + permissions. */
export const getTicketThread = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, userId: req.user.id }).lean();
        if (!ticket) return notFound(res);
        const messages = await SupportMessage.find({ ticketId: ticket._id, isInternal: { $ne: true } })
            .sort({ createdAt: 1 }).limit(200).lean();
        res.json({ ticket, messages, permissions: permissionsFor(ticket), slaStage: slaStage(ticket) });
    } catch (err) { next(err); }
};

const MESSAGE_LIMIT = 50;
const MESSAGE_RATE_PER_MIN = 10;

/** POST /api/support/tickets/:id/messages */
export const addMessage = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, userId: req.user.id });
        if (!ticket) return notFound(res);

        const rule = canUserComment(ticket);
        if (!rule.allowed) {
            return res.status(403).json({ msg: rule.reason, code: rule.code });
        }

        const [msgCount, recentCount] = await Promise.all([
            SupportMessage.countDocuments({ ticketId: ticket._id }),
            SupportMessage.countDocuments({
                ticketId: ticket._id, authorType: 'user',
                createdAt: { $gte: new Date(Date.now() - 60_000) },
            }),
        ]);
        if (msgCount >= MESSAGE_LIMIT) {
            return res.status(429).json({ msg: 'Message limit reached for this ticket', code: 'TICKET_MESSAGE_LIMIT' });
        }
        if (recentCount >= MESSAGE_RATE_PER_MIN) {
            return res.status(429).json({ msg: 'Too many messages, slow down', code: 'TICKET_MESSAGE_LIMIT' });
        }

        const expectedStatus = ticket.status;
        const newStatus = nextStatusAfterMessage(ticket, 'user');
        await SupportMessage.create({
            ticketId: ticket._id, authorType: 'user', authorId: req.user.id,
            body: req.body.body, attachmentIds: req.body.attachmentIds || [],
        });
        const upd = await SupportTicket.updateOne(
            { _id: ticket._id, status: expectedStatus, revision: ticket.revision },
            {
                $set: { status: newStatus, lastUserMessageAt: new Date() },
                $inc: { revision: 1 },
            }
        );
        if (upd.matchedCount === 0) return res.status(409).json({ msg: 'Ticket state changed, retry', code: OPTIMISTIC.code });

        await audit({ actorId: req.user.id, action: 'support.ticket.replied', targetType: 'support_ticket', targetId: ticket._id });
        // Notify assignee, else all admins
        const targets = ticket.assignedAdminId ? [ticket.assignedAdminId] : [];
        if (targets.length) {
            await notify({
                userIds: targets, type: 'support.user_replied',
                title: `Re: ${ticket.ticketNo}`, body: String(req.body.body).slice(0, 300),
                link: { kind: 'support_ticket', id: ticket._id },
                dedupeKey: `support:replied:${ticket._id}:${Date.now()}`,
            }).catch(() => { });
        } else {
            await notifyAdmins({
                type: 'support.user_replied',
                title: `Re: ${ticket.ticketNo}`,
                body: String(req.body.body).slice(0, 300),
                link: { kind: 'support_ticket', id: ticket._id },
                dedupeKey: `support:replied:${ticket._id}:${ticket.revision}`,
            }).catch(() => { });
        }

        res.status(201).json({ msg: 'Message added', status: newStatus });
    } catch (err) { next(err); }
};

/** POST /api/support/tickets/:id/:action (resolve|close|reopen|rate). */
export const ticketAction = async (req, res, next) => {
    try {
        const action = req.route.path.split('/').at(-1);
        const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, userId: req.user.id });
        if (!ticket) return notFound(res);

        if (action === 'rate') {
            if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
                return res.status(409).json({ msg: 'Only resolved tickets can be rated', code: 'TICKET_STATE_CHANGED' });
            }
            ticket.rating = { score: req.body.score, comment: req.body.comment || '' };
            await ticket.save();
            await audit({ actorId: req.user.id, action: 'support.ticket.rated', targetType: 'support_ticket', targetId: ticket._id });
            return res.json({ msg: 'Thanks for the rating' });
        }

        const result = await guardedTransition(ticket, action, 'user', req.body || {});
        if (result.error) {
            return res.status(result.error.code === OPTIMISTIC.code ? 409 : 403)
                .json({ msg: result.error.reason || 'Not allowed', code: result.error.code });
        }
        await audit({ actorId: req.user.id, action: `support.ticket.${action}ed`.replace('closeed', 'closed'), targetType: 'support_ticket', targetId: ticket._id });
        res.json({ msg: `Ticket ${action} done`, status: result.status });
    } catch (err) { next(err); }
};

/** POST /api/support/actions/:token — PUBLIC, rate-limited, neutral responses. */
export const publicAction = async (req, res, next) => {
    try {
        const NEUTRAL = { msg: 'This action link is invalid or has expired.' };
        const token = String(req.params.token || '');
        if (!/^[0-9a-f]{64}$/.test(token)) return res.status(200).json(NEUTRAL);

        const doc = await SupportActionToken.findOne({ tokenHash: sha256(token) });
        if (!doc || doc.usedAt || doc.expiresAt <= new Date()) return res.status(200).json(NEUTRAL);

        const ticket = await SupportTicket.findById(doc.ticketId);
        if (!ticket || String(ticket.userId) !== String(doc.userId)) return res.status(200).json(NEUTRAL);

        if (doc.purpose === 'rate') {
            if (!['resolved', 'closed'].includes(ticket.status)) return res.status(200).json(NEUTRAL);
            ticket.rating = { score: req.body?.score || 5, comment: '' };
            await ticket.save();
        } else {
            const result = await guardedTransition(ticket, doc.purpose, 'user', {});
            if (result.error) return res.status(200).json(NEUTRAL);
        }
        await SupportActionToken.updateOne({ _id: doc._id, usedAt: null }, { usedAt: new Date() });
        res.status(200).json({ msg: 'Action completed. Thank you.' });
    } catch (err) { next(err); }
};

/** POST /api/support/appeal — PUBLIC for suspended users. Neutral 200 always. */
export const appeal = async (req, res, next) => {
    try {
        const NEUTRAL = { msg: 'If the address matches a suspended account, we will review the appeal.' };
        const { email, message, captchaToken } = req.body;

        // CAPTCHA hook (stubbed behind env switch)
        if ((process.env.CAPTCHA_PROVIDER || 'off') !== 'off') {
            const ok = await verifyCaptcha(captchaToken, req.ip); // eslint-disable-line
            if (!ok) return res.status(200).json(NEUTRAL);
        }

        const user = await User.findOne({ email }).select('_id suspended').lean();
        if (user?.suspended) {
            // 1/day/IP limit (approximate by appeal tickets in 24h)
            const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
            const recent = await SupportTicket.countDocuments({
                userId: user._id, category: 'appeal', createdAt: { $gte: dayAgo },
            });
            if (recent === 0) {
                const t = await SupportTicket.create({
                    ticketNo: await nextTicketNo(),
                    userId: user._id, category: 'appeal',
                    subject: 'Account appeal',
                    status: 'open',
                    firstResponseDueAt: supportSlaDueAt('normal'),
                });
                await SupportMessage.create({ ticketId: t._id, authorType: 'user', body: message });
                await audit({ actorId: user._id, action: 'support.appeal.created', targetType: 'support_ticket', targetId: t._id });
            }
        }
        res.status(200).json(NEUTRAL);
    } catch (err) { next(err); }
};

const verifyCaptcha = async (token, ip) => {
    // Stub verifier — wire hCaptcha/Turnstile here when CAPTCHA_PROVIDER is set.
    return Boolean(token);
};
