import mongoose from 'mongoose';

// Journal — immutable, balanced double-entry postings. The monetary source of
// truth. Every line is a debit or credit in integer poisha; total debits must
// equal total credits per entry. Lines are embedded (bounded by design: one
// journal per source event). Reversals reference the original and never delete it.

const journalLineSchema = new mongoose.Schema({
    accountType: {
        type: String,
        required: true,
        // member: a member control account (memberId required)
        // fund: a group-owned FundAccount (accountId required)
        // clearing: cost clearing / payable / adjustment bucket (name required)
        enum: ['member', 'fund', 'clearing'],
    },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAccount', default: null },
    clearingName: { type: String, default: null }, // e.g. 'supplier_payable', 'food_clearing', 'adjustment'
    direction: { type: String, enum: ['debit', 'credit'], required: true },
    amount: { type: Number, required: true, min: 1 }, // integer poisha, strictly positive
    memo: { type: String, trim: true, maxlength: 200, default: '' },
    _id: false,
});

const journalSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        // provenance: what business event posted this
        sourceType: {
            type: String,
            required: true,
            enum: ['expense', 'money_transaction', 'recurring', 'adjustment', 'reversal', 'opening'],
        },
        sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
        sourceRevision: { type: Number, default: 0 },
        postingKind: { type: String, enum: ['original', 'reversal'], default: 'original' },
        reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Journal', default: null },
        costPeriod: { type: String, match: /^\d{4}-\d{2}$/, default: null },
        lines: { type: [journalLineSchema], required: true, validate: v => v.length >= 2 },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        memo: { type: String, trim: true, maxlength: 200, default: '' },
    },
    { timestamps: true }
);

// exactly-once posting per source event
journalSchema.index(
    { groupId: 1, sourceType: 1, sourceId: 1, sourceRevision: 1, postingKind: 1 },
    { unique: true }
);
journalSchema.index({ groupId: 1, costPeriod: 1 });

const Journal = mongoose.model('Journal', journalSchema);
export default Journal;
