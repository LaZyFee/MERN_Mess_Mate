import mongoose from 'mongoose';

// Kitchen inventory tracker for staples (LPG, rice, oil, etc.).
// Tracks current stock, reorder threshold, and refill history so the cook /
// manager knows when to restock.
const refillSchema = new mongoose.Schema({
    refilledAt: { type: Date, default: Date.now },
    quantity: { type: Number, required: true },
    unit: { type: String, trim: true, default: '' }, // e.g. "kg", "cylinder", "liter"
    costPoisha: { type: Number, min: 0, default: 0 },
    refilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, max: 200, default: '' },
}, { _id: true });

const kitchenItemSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
    name: { type: String, trim: true, required: true, max: 80 }, // e.g. "LPG", "Rice", "Cooking Oil"
    unit: { type: String, trim: true, default: '' }, // e.g. "kg", "cylinder", "liter"
    currentStock: { type: Number, default: 0 },
    reorderThreshold: { type: Number, default: 0 }, // alert when stock <= threshold
    averageConsumptionPerDay: { type: Number, default: 0 }, // for estimated days remaining
    lastRefill: { type: Date, default: null },
    refills: [refillSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

kitchenItemSchema.index({ groupId: 1, isActive: 1 });
kitchenItemSchema.index({ groupId: 1, name: 1 }, { unique: true });

const KitchenItem = mongoose.model('KitchenItem', kitchenItemSchema);
export default KitchenItem;