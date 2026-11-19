import mongoose from 'mongoose';

// MoneyTransaction — real-world money movement with a confirmation lifecycle:
//   submitted → confirmed | rejected; confirmed entries are reversed (never deleted).
// Kinds: contribution (member→fund), payout (fund→member), supplier_payment
// (fund or member pays a supplier), member_settlement (member→member), transfer
// (between two fund accounts). Amounts are integer poisha.

const moneyTransactionSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        kind: {
            type: String,
            required: true,
            enum: ['contribution', 'payout', 'supplier_payment', 'member_settlement', 'transfer', 'fee'],
        },
        status: { type: String, enum: ['submitted', 'confirmed', 'rejected', 'reversed'], default: 'submitted' },
        amount: { type: Number, required: true, min: 1 }, // integer poisha
        // participants (depending on kind some are null)
        fromMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        toMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAccount', default: null },
        toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAccount', default: null },
        supplierName: { type: String, trim: true, maxlength: 100, default: '' }, // for supplier_payment
        method: {
            type: String,
            enum: ['cash', 'bkash', 'nagad', 'rocket', 'bank', 'other'],
            default: 'cash',
        },
        reference: { type: String, trim: true, maxlength: 100, default: '' }, // TrxID etc.
        paidAt: { type: Date, required: true },
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // receiver/treasurer
        confirmedAt: { type: Date, default: null },
        rejectionReason: { type: String, trim: true, maxlength: 200, default: '' },
        reversalReason: { type: String, trim: true, maxlength: 200, default: '' },
        reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'MoneyTransaction', default: null },
        evidenceUrl: { type: String, trim: true, maxlength: 500, default: '' },
        schemaVersion: { type: Number, default: 1 },
    },
    { timestamps: true }
);

moneyTransactionSchema.index({ groupId: 1, status: 1, paidAt: 1 });
moneyTransactionSchema.index({ groupId: 1, fromMember: 1 });
moneyTransactionSchema.index({ groupId: 1, toMember: 1 });

const MoneyTransaction = mongoose.model('MoneyTransaction', moneyTransactionSchema);
export default MoneyTransaction;
