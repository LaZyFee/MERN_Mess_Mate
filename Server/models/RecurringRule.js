import mongoose from 'mongoose';

// RecurringRule — generates expense DRAFTS (never auto-approved paid expenses).
// Unique schedule key prevents duplicate generation for the same cost period.

const recurringRuleSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        name: { type: String, trim: true, maxlength: 80, required: true }, // "Apartment rent"
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', default: null },
        amount: { type: Number, required: true, min: 1 }, // poisha
        splitMode: {
            type: String,
            enum: ['meal_units', 'equal_all', 'equal_selected', 'member_days', 'fixed_amounts', 'weighted', 'usage', 'personal'],
            default: 'equal_all',
        },
        beneficiaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membership' }], // for *_selected / fixed / personal
        fixedAmounts: [{ membershipId: mongoose.Schema.Types.ObjectId, amount: Number, _id: false }],
        weights: [{ membershipId: mongoose.Schema.Types.ObjectId, weight: Number, _id: false }],
        supplierName: { type: String, trim: true, maxlength: 100, default: '' },
        dueDayOfMonth: { type: Number, min: 1, max: 31, default: 5 },
        effectiveFrom: { type: String, match: /^\d{4}-\d{2}$/, required: true },
        effectiveTo: { type: String, match: /^\d{4}-\d{2}$/, default: null },
        // generation ledger: one entry per generated cost period (unique — no duplicates)
        generatedKeys: [{ type: String }], // `${costPeriod}`
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

recurringRuleSchema.index({ groupId: 1, isActive: 1 });
recurringRuleSchema.index({ groupId: 1, generatedKeys: 1 });

const RecurringRule = mongoose.model('RecurringRule', recurringRuleSchema);
export default RecurringRule;
