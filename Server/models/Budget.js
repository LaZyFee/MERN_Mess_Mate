import mongoose from 'mongoose';

// Budget (S5.2) — a planned monthly ceiling per expense category, in integer
// poisha. One row per (groupId, month, categoryId); `categoryId: null` is the
// group-wide total budget for the month. Variance is computed on read from
// approved, non-reversal expenses so the plan can never drift from the ledger.

const budgetSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', default: null },
        amountPoisha: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
        note: { type: String, trim: true, maxlength: 200, default: '' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

budgetSchema.index({ groupId: 1, month: 1, categoryId: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
