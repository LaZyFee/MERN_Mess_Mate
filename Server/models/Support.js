import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

// Support Desk models (plan §15). Messages are immutable (no update/delete
// routes); redaction overwrites the body with "[removed]" and is audit-logged.

export const TICKET_CATEGORIES = ['account', 'bug', 'billing_dispute', 'feature', 'group_access', 'appeal', 'other'];
export const TICKET_STATUSES = ['open', 'answered', 'awaiting_admin', 'resolved', 'closed'];
export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const supportTicketSchema = new mongoose.Schema({
    ticketNo: { type: String, required: true, unique: true }, // MM-T-000123
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', default: null },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    subject: { type: String, trim: true, maxlength: 120, required: true },
    status: { type: String, enum: TICKET_STATUSES, default: 'open', index: true },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'normal' },
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    firstAdminReplyAt: { type: Date, default: null },
    lastUserMessageAt: { type: Date, default: null },
    lastAdminMessageAt: { type: Date, default: null },
    firstResponseDueAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    closedBy: { type: String, default: null }, // user | admin | system
    resolutionNote: { type: String, trim: true, maxlength: 2000, default: '' },
    reopenCount: { type: Number, default: 0 },
    relatedTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', default: null },
    rating: {
        score: { type: Number, min: 1, max: 5, default: null },
        comment: { type: String, trim: true, maxlength: 300, default: '' },
        _id: false,
    },
    contextSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    revision: { type: Number, default: 0 },
}, { timestamps: true });

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, firstResponseDueAt: 1 });
supportTicketSchema.index({ assignedAdminId: 1, status: 1 });
supportTicketSchema.plugin(uniqueValidator);

const supportMessageSchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    authorType: { type: String, enum: ['user', 'admin', 'system'], required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    body: { type: String, trim: true, maxlength: 2000, required: true },
    isInternal: { type: Boolean, default: false },
    attachmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
}, { timestamps: { createdAt: true, updatedAt: false } });

supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

const supportActionTokenSchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['resolve', 'close', 'rate'], required: true },
    tokenHash: { type: String, required: true, unique: true }, // sha256 of the plaintext token
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

supportActionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

const supportCannedReplySchema = new mongoose.Schema({
    title: { type: String, trim: true, maxlength: 120, required: true },
    body: { type: String, trim: true, maxlength: 2000, required: true },
    category: { type: String, enum: TICKET_CATEGORIES, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // e.g. 'ticket'
    seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

/** Atomic ticket-number allocation: MM-T-000123 */
export const nextTicketNo = async () => {
    const c = await Counter.findOneAndUpdate(
        { _id: 'ticket' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return `MM-T-${String(c.seq).padStart(6, '0')}`;
};

export const SLA_HOURS = { normal: 24, urgent: 4 };
export const supportSlaDueAt = (priority = 'normal', now = new Date()) =>
    new Date(new Date(now).getTime() + (SLA_HOURS[priority] || SLA_HOURS.normal) * 3600 * 1000);

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);
const SupportActionToken = mongoose.model('SupportActionToken', supportActionTokenSchema);
const SupportCannedReply = mongoose.model('SupportCannedReply', supportCannedReplySchema);

export { SupportTicket, SupportMessage, SupportActionToken, SupportCannedReply };
