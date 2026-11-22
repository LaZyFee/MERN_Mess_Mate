import mongoose from 'mongoose';

// Session — one row per device. Refresh-token FAMILIES: a login creates a
// family (familyId); each rotation adds a new hashed token to the same family.
// Reuse of a rotated token revokes the whole family. Users can list and revoke
// sessions (all devices) explicitly.

const sessionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        familyId: { type: String, required: true }, // one family per login
        deviceId: { type: String, trim: true, maxlength: 100, default: 'unknown' },
        userAgent: { type: String, trim: true, maxlength: 300, default: '' },
        ip: { type: String, default: '' },
        currentTokenHash: { type: String, default: '' }, // sha256 of newest refresh token in family
        previousTokenHashes: { type: [String], default: [] }, // rotation history for reuse detection
        revokedAt: { type: Date, default: null },
        revokedReason: { type: String, default: '' },
        reusedAt: { type: Date, default: null }, // set when a stale family token was replayed
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

sessionSchema.index({ familyId: 1 }, { unique: true });
sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export default Session;
