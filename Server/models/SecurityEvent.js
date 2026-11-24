import mongoose from 'mongoose';

// SecurityEvent — anomaly/security audit events (Doc §18).
// TTL 90 days; feeds the 15-minute anomaly sweep.
const securityEventSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', default: null, index: true },
        type: {
            type: String,
            required: true,
            index: true,
            enum: [
                'refresh_token_reuse',
                'new_device',
                'new_country',
                'device_enrolment_burst',
                'repeated_failures',
                'join_code_failure',
                'new_sign_in',
                'token_from_query_string',
            ],
        },
        ip: { type: String, default: '' },
        ua: { type: String, default: '' },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
securityEventSchema.index({ userId: 1, type: 1, createdAt: -1 });

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
export default SecurityEvent;

export const recordSecurityEvent = async ({
    userId,
    groupId = null,
    type,
    ip = '',
    ua = '',
    meta = {},
}) => {
    try {
        await SecurityEvent.create({ userId, groupId, type, ip, ua, meta });
    } catch (e) {
        // security recording must never break the request path
        console.error('[securityEvent] failed:', e.message);
    }
};
