import mongoose from 'mongoose';

// DepositAsset — tracks recoverable landlord deposits, kitchen equipment assets,
// and exit/refund rules so these capital items are never confused with
// monthly food/meal costs (Doc §6, §10, §16).

const fundingShareSchema = new mongoose.Schema({
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    amount: { type: Number, required: true, min: 1 }, // poisha funded by this member
    refundedAmount: { type: Number, default: 0 },      // poisha returned on exit
    _id: false,
});

const assetRefundSchema = new mongoose.Schema({
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    amount: { type: Number, required: true, min: 1 }, // poisha
    refundedAt: { type: Date, default: Date.now },
    moneyTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoneyTransaction', default: null },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    _id: false,
});

const depositAssetSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        name: { type: String, trim: true, maxlength: 100, required: true },
        kind: {
            type: String,
            enum: ['landlord_deposit', 'kitchen_equipment', 'advance', 'other_asset'],
            default: 'landlord_deposit',
        },
        initialAmount: { type: Number, required: true, min: 1 },    // poisha
        currentValuation: { type: Number, required: true, min: 0 }, // poisha
        status: {
            type: String,
            enum: ['active', 'partially_refunded', 'fully_refunded', 'written_off'],
            default: 'active',
        },
        fundingShares: { type: [fundingShareSchema], required: true },
        refunds: { type: [assetRefundSchema], default: [] },
        custodianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        notes: { type: String, trim: true, maxlength: 500, default: '' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

depositAssetSchema.index({ groupId: 1, status: 1 });

const DepositAsset = mongoose.model('DepositAsset', depositAssetSchema);
export default DepositAsset;

