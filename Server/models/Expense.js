import mongoose from 'mongoose';

// Expense — full workflow model:
//   draft → submitted → approved | rejected; approved → reversed (never erased)
// Line items let one receipt contain bazar food + detergent + a personal item,
// each with its own category and split policy. Payers[] supports multiple payers
// and partial supplier payments. Amounts are integer poisha.

const expenseLineSchema = new mongoose.Schema({
    description: { type: String, trim: true, maxlength: 200, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    amount: { type: Number, required: true, min: 1 }, // poisha
    // overrides the category's default split for this line
    splitMode: {
        type: String,
        enum: ['meal_units', 'equal_all', 'equal_selected', 'member_days', 'fixed_amounts', 'weighted', 'usage', 'personal'],
        default: null,
    },
    beneficiaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membership' }],
    fixedAmounts: [{ membershipId: mongoose.Schema.Types.ObjectId, amount: Number, _id: false }],
    weights: [{ membershipId: mongoose.Schema.Types.ObjectId, weight: Number, _id: false }],
    usageQuantities: [{ membershipId: mongoose.Schema.Types.ObjectId, quantity: Number, _id: false }],
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
});

const expensePayerSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    amount: { type: Number, required: true, min: 1 }, // poisha this payer covered
    fundAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAccount', default: null }, // null = personal pocket
    _id: false,
});

const expenseSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        // legacy single-payer field kept for old rows; new rows use payers[]
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'approved', 'rejected', 'reversed'],
            default: 'draft',
            index: true,
        },
        // workflow metadata
        submittedAt: { type: Date, default: null },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        rejectionReason: { type: String, trim: true, maxlength: 300, default: '' },
        reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reversalReason: { type: String, trim: true, maxlength: 300, default: '' },
        reversedExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null }, // reversal row links here
        isReversal: { type: Boolean, default: false },
        supplierName: { type: String, trim: true, maxlength: 100, default: '' },
        receiptUrl: { type: String, trim: true, maxlength: 500, default: '' },
        receiptReference: { type: String, trim: true, maxlength: 100, default: '' }, // invoice no / TrxID
        // supplier payable: approved but not yet (fully) paid
        isPayable: { type: Boolean, default: false },
        paidTotal: { type: Number, default: 0 }, // poisha actually settled with the supplier
        date: { type: Date, required: true },           // purchase/invoice date
        serviceStart: { type: Date, default: null },    // service period for bills
        serviceEnd: { type: Date, default: null },
        costPeriod: { type: String, match: /^\d{4}-\d{2}$/, required: true }, // month being charged
        // legacy aggregate amount (sum of lines for new rows); poisha
        amount: { type: Number, required: true, min: 0 },
        // legacy free-text label, derived from first line's category for back-compat
        description: { type: String, trim: true, maxlength: 200, default: '' },
        category: { type: String, trim: true, maxlength: 50, default: '' },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', default: null },
        month: { type: String, match: /^\d{4}-\d{2}$/, default: null }, // legacy; equals costPeriod for new rows
        lines: { type: [expenseLineSchema], default: [] },
        payers: { type: [expensePayerSchema], default: [] },
        revision: { type: Number, default: 0 },
        schemaVersion: { type: Number, default: 2 },
    },
    { timestamps: true }
);

expenseSchema.index({ groupId: 1, status: 1, costPeriod: 1 });
expenseSchema.index({ groupId: 1, costPeriod: 1 });
expenseSchema.index({ groupId: 1, categoryId: 1, costPeriod: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
