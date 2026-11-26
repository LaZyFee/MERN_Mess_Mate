import mongoose from 'mongoose';

// IdempotencyRecord — protects retried creation/posting of financial events.
// Same key + different request hash → 409 conflict. Records expire (TTL index).
// leaseUntil + sourceId support optimistic concurrency: a worker claims a lease
// by setting leaseUntil; the reconciler clears expired leases.

const idempotencyRecordSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', default: null, index: true },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        operation: { type: String, required: true }, // e.g. 'money.confirm'
        key: { type: String, required: true },
        requestHash: { type: String, required: true }, // sha256 of canonical body
        resultType: { type: mongoose.Schema.Types.Mixed, default: null }, // stored response snapshot
        resultBody: { type: mongoose.Schema.Types.Mixed, default: null },
        expiresAt: { type: Date, required: true },
        // leaseUntil: when the current processing lease expires (null = not leased)
        leaseUntil: { type: Date, default: null, index: true },
        // sourceId: idempotency source id for dedupe across retries
        sourceId: { type: String, default: null },
    },
    { timestamps: true }
);

idempotencyRecordSchema.index({ groupId: 1, actorId: 1, operation: 1, key: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
idempotencyRecordSchema.index({ sourceId: 1 }, { sparse: true });

const IdempotencyRecord = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
export default IdempotencyRecord;
