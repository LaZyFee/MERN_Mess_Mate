import mongoose from 'mongoose';

// Allocation — frozen per-line allocation produced at approval/close time.
// Stores the beneficiary list, weights and exact poisha charges with rounding
// evidence so any statement can be explained and audited.

const allocationEntrySchema = new mongoose.Schema({
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
    weight: { type: Number, default: 1 },        // frozen weight used
    charge: { type: Number, required: true },    // poisha, exact
    _id: false,
});

const allocationSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true },
        lineId: { type: mongoose.Schema.Types.ObjectId, default: null }, // null = whole expense (legacy single-line)
        poolKind: {
            type: String,
            enum: ['meal_units', 'equal_all', 'equal_selected', 'member_days', 'fixed_amounts', 'weighted', 'usage', 'personal'],
            required: true,
        },
        total: { type: Number, required: true },   // poisha allocated (must equal line total)
        entries: { type: [allocationEntrySchema], required: true },
        algorithmVersion: { type: String, default: 'largest_remainder_v1' },
        reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Allocation', default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

allocationSchema.index({ groupId: 1, expenseId: 1, lineId: 1 }, { unique: true });

const Allocation = mongoose.model('Allocation', allocationSchema);
export default Allocation;
