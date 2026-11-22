import { SupportTicket, SupportMessage, SupportCannedReply, supportSlaDueAt } from '../models/Support.js';
import { audit } from '../models/AuditEvent.js';
import { paginateQuery } from '../utils/pagination.js';
import {
    canAdminComment, nextStatusAfterMessage, canTransition,
} from '../services/supportRules.js';
import { notify, notifyAdmins } from '../services/inboxService.js';
import { guardedTransition } from './supportController.js';
import User from '../models/User.js';

// Support Desk admin controller (/api/admin/support). Mounted behind
// requirePlatformAdmin — non-admins get the generic 404 from the guard.

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

const emitTicketEvent = (req, event, payload) => {
    const io = req.app?.get('io');
    if (io) io.emit(event, payload); // admins listen on their user room
};

/** GET /api/admin/support/tickets — work queue. */
export const adminListTickets = async (req, res, next) => {
    try {
        const q = req.validated?.query || {};
        const filter = {};
        if (q.status) filter.status = q.status;
        if (q.priority) filter.priority = q.priority;
        if (q.assignee) filter.assignedAdminId = q.assignee === 'none' ? null : q.assignee;
        if (q.category) filter.category = q.category;
        if (q.overdue === '1') {
            filter.firstAdminReplyAt = null;
            filter.firstResponseDueAt = { $lt: new Date() };
        }
        if (q.q) filter.$or = [{ ticketNo: q.q }, { subject: new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];

        // Fetch sorted by overdue-first logic in memory-light way: overdue filter
        // pushes them naturally; otherwise sort priority desc then createdAt asc.
        const page = await paginateQuery({
            model: SupportTicket, filter, cursor: q.cursor, limit: 25,
            sortField: '_id', sortOrder: -1,
        });
        const items = [...page.items].sort((a, b) =>
            (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
            new Date(a.createdAt) - new Date(b.createdAt));
        res.json({ tickets: items, nextCursor: page.nextCursor, hasMore: page.hasMore });
    } catch (err) { next(err); }
};

/** GET /api/admin/support/tickets/:id — full thread incl. internal + context. */
export const adminGetTicket = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId).lean();
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        const messages = await SupportMessage.find({ ticketId: ticket._id })
            .sort({ createdAt: 1 }).limit(300).lean();
        // Context: username + group role; NEVER email/phone (admin user view has them already).
        const [owner, memberships] = await Promise.all([
            User.findById(ticket.userId).select('username profilePic').lean(),
            ticket.groupId
                ? (await import('../models/Membership.js')).default
                    .find({ groupId: ticket.groupId, user: ticket.userId })
                    .select('role startDate endDate').lean()
                : [],
        ]);
        res.json({ ticket, messages, owner, memberships, slaStage: canTransition && null });
    } catch (err) { next(err); }
};

/** POST /api/admin/support/tickets/:id/reply — public reply. */
export const adminReply = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        const rule = canAdminComment(ticket);
        if (!rule.allowed) return res.status(403).json({ msg: rule.reason, code: rule.code });

        const isFirstAdminReply = !ticket.firstAdminReplyAt;
        const expectedStatus = ticket.status;
        const newStatus = nextStatusAfterMessage(ticket, 'admin');
        await SupportMessage.create({
            ticketId: ticket._id, authorType: 'admin', authorId: req.user.id,
            body: req.body.body, isInternal: false, attachmentIds: req.body.attachmentIds || [],
        });
        const upd = await SupportTicket.updateOne(
            { _id: ticket._id, status: expectedStatus, revision: ticket.revision },
            {
                $set: {
                    status: newStatus, lastAdminMessageAt: new Date(),
                    ...(isFirstAdminReply ? { firstAdminReplyAt: new Date() } : {}),
                    ...(ticket.assignedAdminId ? {} : { assignedAdminId: req.user.id }),
                },
                $inc: { revision: 1 },
            }
        );
        if (upd.matchedCount === 0) {
            return res.status(409).json({ msg: 'Ticket state changed, retry', code: 'TICKET_STATE_CHANGED' });
        }
        await audit({ actorId: req.user.id, action: 'support.ticket.replied', targetType: 'support_ticket', targetId: ticket._id });
        await notify({
            userIds: [ticket.userId], type: 'support.admin_replied',
            title: `Re: ${ticket.ticketNo}`, body: String(req.body.body).slice(0, 300),
            link: { kind: 'support_ticket', id: ticket._id },
        }).catch(() => { });
        emitTicketEvent(req, 'support-updated', { ticketId: ticket._id, status: newStatus });
        res.status(201).json({ msg: 'Reply sent', status: newStatus });
    } catch (err) { next(err); }
};

/** POST /api/admin/support/tickets/:id/internal-note — does not change status. */
export const adminInternalNote = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        await SupportMessage.create({
            ticketId: ticket._id, authorType: 'admin', authorId: req.user.id,
            body: req.body.body, isInternal: true,
        });
        await audit({ actorId: req.user.id, action: 'support.ticket.internal_note', targetType: 'support_ticket', targetId: ticket._id });
        res.status(201).json({ msg: 'Internal note added' });
    } catch (err) { next(err); }
};

/** POST /api/admin/support/tickets/:id/assign */
export const adminAssign = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        ticket.assignedAdminId = req.body.assignedAdminId;
        await ticket.save();
        await audit({ actorId: req.user.id, action: 'support.ticket.assigned', targetType: 'support_ticket', targetId: ticket._id, after: { assignedAdminId: ticket.assignedAdminId } });
        res.json({ msg: 'Assigned' });
    } catch (err) { next(err); }
};

/** PATCH /api/admin/support/tickets/:id — priority/category/tags (priority recomputes SLA). */
export const adminPatchTicket = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
        const { priority, category, tags } = req.body;
        if (priority && priority !== ticket.priority) {
            ticket.priority = priority;
            if (!ticket.firstAdminReplyAt) {
                ticket.firstResponseDueAt = supportSlaDueAt(priority, ticket.createdAt);
            }
        }
        if (category) ticket.category = category;
        if (tags) ticket.tags = tags;
        await ticket.save();
        await audit({ actorId: req.user.id, action: 'support.ticket.updated', targetType: 'support_ticket', targetId: ticket._id, after: { priority, category } });
        res.json({ msg: 'Ticket updated', ticket });
    } catch (err) { next(err); }
};

/** POST /api/admin/support/tickets/:id/:action (resolve|close|reopen). */
export const adminAction = async (req, res, next) => {
    try {
        const { action } = req.params;
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });

        const result = await guardedTransition(ticket, action, 'admin', req.body || {});
        if (result.error) {
            return res.status(result.error.code === 'TICKET_STATE_CHANGED' ? 409 : 403)
                .json({ msg: result.error.reason || 'Not allowed', code: result.error.code });
        }
        await audit({ actorId: req.user.id, action: `support.ticket.${action}d`.replace('closedd', 'closed').replace('resolvedd', 'resolved').replace('reopend', 'reopened'), targetType: 'support_ticket', targetId: ticket._id });
        await notify({
            userIds: [ticket.userId], type: `support.ticket_${result.status}`,
            title: `Ticket ${ticket.ticketNo} ${result.status}`,
            body: req.body?.reason || req.body?.note || '',
            link: { kind: 'support_ticket', id: ticket._id },
        }).catch(() => { });
        res.json({ msg: `Ticket ${result.status}`, status: result.status });
    } catch (err) { next(err); }
};

/** POST /api/admin/support/tickets/:id/messages/:messageId/redact — reason required. */
export const adminRedactMessage = async (req, res, next) => {
    try {
        const msg = await SupportMessage.findOne({ _id: req.params.messageId, ticketId: req.params.ticketId });
        if (!msg) return res.status(404).json({ msg: 'Message not found' });
        msg.body = '[removed]';
        await msg.save();
        await audit({
            actorId: req.user.id, action: 'support.ticket.redacted',
            targetType: 'support_message', targetId: msg._id,
            reason: String(req.body.reason).slice(0, 500),
        });
        res.json({ msg: 'Message redacted' });
    } catch (err) { next(err); }
};

/** GET /api/admin/support/stats */
export const adminStats = async (req, res, next) => {
    try {
        const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const byStatus = {};
        for (const s of ['open', 'answered', 'awaiting_admin', 'resolved', 'closed']) {
            byStatus[s] = await SupportTicket.countDocuments({ status: s });
        }
        const overdue = await SupportTicket.countDocuments({
            firstAdminReplyAt: null, firstResponseDueAt: { $lt: new Date() },
            status: { $nin: ['resolved', 'closed'] },
        });

        const answered = await SupportTicket.aggregate([
            { $match: { firstAdminReplyAt: { $ne: null }, createdAt: { $gte: since30 } } },
            { $project: { mins: { $divide: [{ $subtract: ['$firstAdminReplyAt', '$createdAt'] }, 60000] } } },
            { $sort: { mins: 1 } },
            { $group: { _id: null, values: { $push: '$mins' } } },
        ]);
        const values = answered[0]?.values || [];
        const median = values.length
            ? (values[Math.floor((values.length - 1) / 2)] + values[Math.ceil((values.length - 1) / 2)]) / 2
            : null;

        const ratings = await SupportTicket.aggregate([
            { $match: { 'rating.score': { $gte: 1 } } },
            { $group: { _id: null, avg: { $avg: '$rating.score' }, count: { $sum: 1 } } },
        ]);

        res.json({
            byStatus, overdue,
            medianFirstResponseMinutes: median === null ? null : Math.round(median),
            averageRating: ratings[0]?.avg ?? null, ratingCount: ratings[0]?.count ?? 0,
        });
    } catch (err) { next(err); }
};

/** Canned replies CRUD. */
export const listCannedReplies = async (req, res, next) => {
    try {
        const replies = await SupportCannedReply.find({}).sort({ title: 1 }).limit(200).lean();
        res.json({ replies });
    } catch (err) { next(err); }
};
export const createCannedReply = async (req, res, next) => {
    try {
        const reply = await SupportCannedReply.create({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ reply });
    } catch (err) { next(err); }
};
export const updateCannedReply = async (req, res, next) => {
    try {
        const reply = await SupportCannedReply.findByIdAndUpdate(req.params.replyId, req.body, { new: true });
        if (!reply) return res.status(404).json({ msg: 'Canned reply not found' });
        res.json({ reply });
    } catch (err) { next(err); }
};
export const deleteCannedReply = async (req, res, next) => {
    try {
        const r = await SupportCannedReply.findByIdAndDelete(req.params.replyId);
        if (!r) return res.status(404).json({ msg: 'Canned reply not found' });
        res.json({ msg: 'Deleted' });
    } catch (err) { next(err); }
};
