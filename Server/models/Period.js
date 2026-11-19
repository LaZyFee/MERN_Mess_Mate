import mongoose from 'mongoose';

// Period — one calendar month per group with a state machine:
//   open → review → finalized
// `revision` increments on every cost-affecting mutation while open; finalization
// writes with expectedRevision so a concurrent edit/finalize race conflicts (409).

const periodSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
        state: { type: String, enum: ['open', 'review', 'finalized'], default: 'open' },
        revision: { type: Number, default: 0 },
        policyVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'PolicyVersion', default: null },
        statement: { type: mongoose.Schema.Types.ObjectId, ref: 'Statement', default: null }, // set at finalize
        reviewStartedAt: { type: Date, default: null },
        finalizedAt: { type: Date, default: null },
        finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

periodSchema.index({ groupId: 1, month: 1 }, { unique: true });

const Period = mongoose.model('Period', periodSchema);
export default Period;
