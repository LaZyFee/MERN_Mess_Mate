import mongoose from 'mongoose';

// Reconciliation — counted/statement balance vs ledger-expected balance for a
// fund account at a cutoff. Variances are explained/resolved, never hidden.

const reconciliationSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAccount', required: true },
        asOf: { type: Date, required: true },
        expectedBalance: { type: Number, required: true }, // poisha — from journals
        actualBalance: { type: Number, required: true },   // poisha — counted / statement
        variance: { type: Number, required: true },        // poisha — actual - expected
        status: { type: String, enum: ['open', 'resolved'], default: 'open' },
        explanation: { type: String, trim: true, maxlength: 500, default: '' },
        resolution: { type: String, enum: ['none', 'adjusted', 'accepted_shortage', 'found_cash'], default: 'none' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

reconciliationSchema.index({ groupId: 1, accountId: 1, asOf: -1 });

const Reconciliation = mongoose.model('Reconciliation', reconciliationSchema);
export default Reconciliation;
