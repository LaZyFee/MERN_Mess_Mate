import mongoose from 'mongoose';

// AuditEvent — append-only. Financial approvals, reversals, role/policy changes,
// close attempts, deliveries. No update/delete API exists for this collection.

const auditEventSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', default: null, index: true },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        action: { type: String, required: true, index: true }, // e.g. 'expense.approved'
        targetType: { type: String, default: '' },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
        before: { type: mongoose.Schema.Types.Mixed, default: null }, // redacted
        after: { type: mongoose.Schema.Types.Mixed, default: null },  // redacted
        reason: { type: String, trim: true, maxlength: 300, default: '' },
        requestId: { type: String, default: '' },
        ip: { type: String, default: '' },
    },
    { timestamps: { createdAt: true, updatedAt: false } } // immutable creation time
);

auditEventSchema.index({ groupId: 1, createdAt: -1 });
auditEventSchema.index({ targetId: 1 });

const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
export default AuditEvent;

// Redact sensitive fields before persisting snapshots
const REDACT = ['password', 'refreshToken', 'token', 'resetPasswordToken', 'verifyEmailToken', 'evidenceUrl', 'reference'];
export const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const k of Object.keys(out)) {
        if (REDACT.some(r => k.toLowerCase().includes(r.toLowerCase()))) out[k] = '[redacted]';
        else if (out[k] && typeof out[k] === 'object') out[k] = redact(out[k]);
    }
    return out;
};

export const audit = async ({ groupId = null, actorId = null, action, targetType = '', targetId = null, before = null, after = null, reason = '', requestId = '', ip = '' }) => {
    try {
        await AuditEvent.create({
            groupId, actorId, action, targetType, targetId,
            before: redact(before), after: redact(after),
            reason, requestId, ip,
        });
    } catch (e) {
        // auditing must never break the request path
        console.error('[audit] failed:', e.message);
    }
};
