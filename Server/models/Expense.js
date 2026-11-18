import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who paid
        date: { type: Date, required: true },
        amount: { type: Number, required: true, min: 0 },
        description: { type: String, trim: true, maxlength: 200 },
        // Legacy free-text category. New code should use `categoryId` referencing
        // the group's admin-managed ExpenseCategory collection instead.
        category: { type: String, trim: true, maxlength: 50, default: '' },
        // reference to a group-managed ExpenseCategory (admin-created).
        // When set, month-end summary splits this expense per that category's rules.
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', default: null },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // "2024-08"
    },
    { timestamps: true }
);

expenseSchema.index({ groupId: 1, month: 1 });
expenseSchema.index({ groupId: 1, userId: 1 });
expenseSchema.index({ groupId: 1, categoryId: 1, month: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
