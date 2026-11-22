import mongoose from 'mongoose';

// InviteCode — hashed join codes for mess groups (Doc §18).
// Plaintext is shown once at creation; thereafter only the hash + prefix exist.
const inviteCodeSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        codeHash: { type: String, required: true, unique: true, index: true }, // sha256(code + pepper)
        prefix: { type: String, trim: true, maxlength: 8, required: true, index: true }, // first 4 chars for lookup
        expiresAt: { type: Date, required: true, index: true }, // default 7 days
        maxUses: { type: Number, default: 20, min: 1 },
        usedCount: { type: Number, default: 0, min: 0 },
        revokedAt: { type: Date, default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

inviteCodeSchema.index({ groupId: 1, revokedAt: 1, expiresAt: 1 });

const InviteCode = mongoose.model('InviteCode', inviteCodeSchema);
export default InviteCode;

// ---- Helpers ----

import crypto from 'crypto';

const INVITE_PEPPER = process.env.INVITE_PEPPER || 'mealmate-invite-pepper-change-in-prod';

export const hashInviteCode = (code) =>
    crypto.createHash('sha256').update(`${code}${INVITE_PEPPER}`).digest('hex');

export const inviteCodePrefix = (code) => String(code).slice(0, 4).toUpperCase();

export const generateInviteCode = (len = 8) =>
    crypto.randomBytes(len).toString('base64url').slice(0, len);
