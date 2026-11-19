import mongoose from 'mongoose';

// ExpenseCategory — per-group, admin-managed, with 7 allocation modes
// (doc $6). Renames never rewrite snapshots; archive instead of delete.
//
// Modes:
//   meal_units     — bazar/food, split by weighted meal units of beneficiaries
//   equal_all      — equal among all eligible members (rent)
//   equal_selected — equal among explicit beneficiaries (Wi-Fi)
//   member_days    — eligible days intersecting the service period (electricity)
//   fixed_amounts  — exact poisha per beneficiary (room rents)
//   weighted       — integer weights (bigger room = 2 shares)
//   usage          — approved meter/usage quantities (submeter)
//   personal       — one named beneficiary (personal snacks)
// (personal is an 8th convenience mode mapped to equal_selected n=1 semantics)

const expenseCategorySchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        name: { type: String, trim: true, maxlength: 50, required: true },
        icon: { type: String, trim: true, maxlength: 20, default: '' },
        splitMode: {
            type: String,
            enum: ['meal_units', 'equal_all', 'equal_selected', 'member_days', 'fixed_amounts', 'weighted', 'usage', 'personal', 'meal', 'equal'],
            default: 'equal_all',
        },
        // legacy values map: 'meal'→meal_units, 'equal'→equal_all
        defaultBeneficiaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membership' }],
        isFoodPool: { type: Boolean, default: false }, // food lines feed the meal rate
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        isArchived: { type: Boolean, default: false },
        schemaVersion: { type: Number, default: 2 },
    },
    { timestamps: true }
);

expenseCategorySchema.index({ groupId: 1, name: 1 }, { unique: true });

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
export default ExpenseCategory;

// Normalize legacy split modes
export const normalizeSplitMode = (mode) =>
    mode === 'meal' ? 'meal_units' : mode === 'equal' ? 'equal_all' : mode;
