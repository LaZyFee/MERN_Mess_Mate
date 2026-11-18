import mongoose from 'mongoose';

// Expense categories are per-group and admin-managed.
// Members add expenses referencing a category by id; summary splits totals per category.
const expenseCategorySchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        name: { type: String, trim: true, maxlength: 50, required: true }, // "Home Rent", "Gas Bill"...
        icon: { type: String, trim: true, maxlength: 20, default: '' },    // optional emoji/icon for UI
        // how this category is shared across members:
        //   'meal'     — split by meal share (proportional to meals eaten)
        //   'equal'    — split equally among ALL active members (default; rent, bills)
        splitMode: { type: String, enum: ['meal', 'equal'], default: 'equal' },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        isArchived: { type: Boolean, default: false }, // archived categories stay in old summaries
    },
    { timestamps: true }
);

// One category name per group
expenseCategorySchema.index({ groupId: 1, name: 1 }, { unique: true });

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
export default ExpenseCategory;
