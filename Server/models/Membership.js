import mongoose from 'mongoose';

// Membership collection — effective-dated intervals, roles, placeholder accounts.
// Historical source of truth for "who was in the group when". Never delete rows:
// departure sets a `leftAt` and preserves the account.

const membershipSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        // null when this membership is a placeholder for an unregistered resident
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        displayName: { type: String, trim: true, maxlength: 80, required: true }, // real name or placeholder label
        isPlaceholder: { type: Boolean, default: false },
        // interval: effective [startDate, endDateExclusive) — endDate null = currently active
        startDate: { type: Date, required: true },
        endDate: { type: Date, default: null },
        // role effective for this interval: owner | manager | treasurer | auditor | member
        role: { type: String, enum: ['owner', 'manager', 'treasurer', 'auditor', 'member'], default: 'member' },
        room: { type: String, trim: true, maxlength: 40, default: '' },   // room label for rent policies
        weight: { type: Number, default: 1, min: 1 },                     // share weight (e.g. bigger room = 2)
        leftAt: { type: Date, default: null },                            // when they departed (debt/credit preserved)
        replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null }, // placeholder→account link
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        schemaVersion: { type: Number, default: 1 },
    },
    { timestamps: true }
);

membershipSchema.index({ groupId: 1, user: 1 });
membershipSchema.index({ groupId: 1, startDate: 1 });
membershipSchema.index({ user: 1 });

const Membership = mongoose.model('Membership', membershipSchema);
export default Membership;
