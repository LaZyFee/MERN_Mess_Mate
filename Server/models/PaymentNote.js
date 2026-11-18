import mongoose from 'mongoose';

// Payment notes: admin-authored notes attached to a member's month-end payment.
// Admins can create/edit; members can only view their own (admin sees all).
const paymentNoteSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // "2024-08"
        note: { type: String, trim: true, maxlength: 1000, required: true },
        // amountDue snapshot at the time the note was written (optional context)
        amountDue: { type: Number, default: 0 },
        // has the member settled this month's payment?
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

// One note per member per month — admin edits the same note instead of stacking
paymentNoteSchema.index({ groupId: 1, userId: 1, month: 1 }, { unique: true });

const PaymentNote = mongoose.model('PaymentNote', paymentNoteSchema);
export default PaymentNote;
