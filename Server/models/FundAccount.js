import mongoose from 'mongoose';

// FundAccount — group-owned cash / mobile wallet / bank. Custodian history is
// recorded; the ledger balance is computed from Journal postings, not stored here.
// Private identifiers (wallet numbers) are stored masked.

const fundAccountSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        name: { type: String, trim: true, maxlength: 60, required: true }, // "Common cash", "bKash merchant"…
        kind: { type: String, enum: ['cash', 'wallet', 'bank'], required: true },
        currency: { type: String, default: 'BDT' },
        // masked identifier — "•••• 1234"; raw identifiers are never stored
        maskedIdentifier: { type: String, trim: true, maxlength: 40, default: '' },
        currentCustodian: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        custodianHistory: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            from: { type: Date },
            to: { type: Date, default: null },
            _id: false,
        }],
        isArchived: { type: Boolean, default: false },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

fundAccountSchema.index({ groupId: 1, kind: 1 });

const FundAccount = mongoose.model('FundAccount', fundAccountSchema);
export default FundAccount;
