import mongoose from 'mongoose';

// PolicyVersion — effective-dated group policy. Historical versions are immutable
// (edits create a new version). Rules used in a finalized month are snapshotted
// into the Statement, so renames/changes never rewrite history.

const policyVersionSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        version: { type: Number, required: true },
        effectiveFrom: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // month "2026-11"
        // meal slot weights as integer ratios out of 1000 (breakfast 500 = half unit)
        mealWeights: {
            breakfast: { type: Number, default: 500, min: 0, max: 1000 },
            lunch: { type: Number, default: 1000, min: 0, max: 1000 },
            snacks: { type: Number, default: 1000, min: 0, max: 1000 },
            dinner: { type: Number, default: 1000, min: 0, max: 1000 },
        },
        allowedPortions: { type: [Number], default: [0, 0.5, 1, 1.5, 2] },
        entryCutoffHour: { type: Number, default: 23, min: 0, max: 23 }, // Dhaka-time hour after which edits are blocked
        currency: { type: String, default: 'BDT' },
        timezone: { type: String, default: 'Asia/Dhaka' },
        rounding: { type: String, enum: ['largest_remainder'], default: 'largest_remainder' },
        requireExpenseApproval: { type: Boolean, default: true },
        reviewGraceDays: { type: Number, default: 3 },
        publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

policyVersionSchema.index({ groupId: 1, version: 1 }, { unique: true });
policyVersionSchema.index({ groupId: 1, effectiveFrom: -1 });

const PolicyVersion = mongoose.model('PolicyVersion', policyVersionSchema);
export default PolicyVersion;
