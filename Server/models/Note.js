import mongoose from 'mongoose';

// Note — a board post: note | announcement | handover (absence window + task
// checklist anyone can claim) | alert.
// audience targeting, pin (max 3), read receipts, auto-expiry, soft delete.
const noteTaskSchema = new mongoose.Schema(
    {
        text: { type: String, trim: true, maxlength: 200, required: true },
        assigneeMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        dueDate: { type: String, default: null }, // 'YYYY-MM-DD'
        status: { type: String, enum: ['open', 'claimed', 'done'], default: 'open' },
        claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        claimedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        doneAt: { type: Date, default: null },
    },
    { _id: true }
);

const noteAudienceSchema = new mongoose.Schema(
    {
        type: { type: String, enum: ['all', 'members', 'role'], default: 'all', required: true },
        membershipIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membership' }],
        roles: [{ type: String, enum: ['owner', 'manager', 'treasurer', 'auditor', 'member'] }],
    },
    { _id: false }
);

const noteReadReceiptSchema = new mongoose.Schema(
    {
        membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const noteSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        authorMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
        authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        kind: {
            type: String,
            enum: ['note', 'announcement', 'handover', 'alert'],
            default: 'note',
            index: true,
        },
        title: { type: String, trim: true, maxlength: 120, required: true },
        body: { type: String, trim: true, maxlength: 2000, default: '' }, // plain text, no HTML
        audience: { type: noteAudienceSchema, default: { type: 'all' } },
        pinned: { type: Boolean, default: false },
        validFrom: { type: Date, default: null },
        validUntil: { type: Date, default: null }, // auto-archive
        absence: {
            from: { type: Date, default: null }, // handover only
            to: { type: Date, default: null },
        },
        tasks: [noteTaskSchema], // max 20, handover checklist
        readBy: [noteReadReceiptSchema],
        state: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active', index: true },
        revision: { type: Number, default: 0 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

noteSchema.index({ groupId: 1, state: 1, createdAt: -1 });
noteSchema.index({ groupId: 1, pinned: 1, state: 1 });
noteSchema.index({ validUntil: 1 }, { expireAfterSeconds: 0 }); // TTL auto-archive sweep

const Note = mongoose.model('Note', noteSchema);
export default Note;
