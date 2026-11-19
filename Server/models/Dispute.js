import mongoose from 'mongoose';

// Dispute — a member challenges a source item (expense/transaction) or a
// statement item. Resolved by a manager with a link to any resulting correction.

const disputeSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        targetType: { type: String, enum: ['expense', 'money_transaction', 'statement_item'], required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
        // for statement_item disputes
        statementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Statement', default: null },
        membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        reason: { type: String, trim: true, maxlength: 1000, required: true },
        status: { type: String, enum: ['open', 'resolved', 'rejected'], default: 'open' },
        responses: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            text: { type: String, maxlength: 1000 },
            at: { type: Date, default: Date.now },
            _id: false,
        }],
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        resolvedAt: { type: Date, default: null },
        resolutionNote: { type: String, trim: true, maxlength: 500, default: '' },
        correctionJournalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Journal', default: null },
    },
    { timestamps: true }
);

disputeSchema.index({ groupId: 1, status: 1 });
disputeSchema.index({ groupId: 1, targetType: 1, targetId: 1 });

const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;
