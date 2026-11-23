import mongoose from 'mongoose';

// Shared shopping list for a mess group. Any member can add items; the
// bazar-duty person ticks them off. Completed items can be converted into an
// expense draft (prefilled with Bazar category) via /api/shopping-list/:listId/to-expense.
const itemSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true, maxlength: 120 },
    quantity: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: '' },
    estimatedPricePoisha: { type: Number, min: 0, default: 0 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    addedByName: { type: String, trim: true, default: '' },
    checked: { type: Boolean, default: false },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkedAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 300, default: '' },
}, { _id: true, timestamps: true });

const shoppingListSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
    title: { type: String, trim: true, required: true, default: 'Bazar List' },
    items: [itemSchema],
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expenseDraftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

shoppingListSchema.index({ groupId: 1, status: 1 });
shoppingListSchema.index({ createdAt: -1 });

const ShoppingList = mongoose.model('ShoppingList', shoppingListSchema);
export default ShoppingList;