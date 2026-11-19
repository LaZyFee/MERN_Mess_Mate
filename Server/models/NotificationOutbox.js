import mongoose from 'mongoose';

// NotificationOutbox — written atomically with the business commit; a background
// worker processes it afterwards. Tracks per-recipient delivery status with
// retries, dedupe keys and provider references. Never blocks or rolls back the
// business event.

const outboxMessageSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        statementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Statement', default: null },
        membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        channel: { type: String, enum: ['email', 'whatsapp', 'in_app'], required: true },
        purpose: { type: String, default: 'statement' }, // statement | reminder | dispute_update
        templateVersion: { type: String, default: '' },
        dedupeKey: { type: String, default: null },
        // recipient snapshot (works even if contact changes later)
        recipientEmail: { type: String, default: '' },
        recipientWa: { type: String, default: '' },
        payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // template inputs
        // lifecycle: pending → processing → sent | delivered | read | failed | skipped | not_configured
        state: {
            type: String,
            enum: ['pending', 'processing', 'sent', 'delivered', 'read', 'failed', 'skipped', 'not_configured'],
            default: 'pending',
            index: true,
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 5 },
        nextAttemptAt: { type: Date, default: Date.now },
        lastError: { type: String, default: '' },
        providerMessageId: { type: String, default: '', index: true },
        consentBasis: { type: String, default: 'member_profile' }, // member_profile | admin_manual | opted_in
        processedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

outboxMessageSchema.index({ state: 1, nextAttemptAt: 1 });
outboxMessageSchema.index(
    { statementId: 1, userId: 1, channel: 1, templateVersion: 1, purpose: 1 },
    { unique: true, sparse: true }
);

const NotificationOutbox = mongoose.model('NotificationOutbox', outboxMessageSchema);
export default NotificationOutbox;
