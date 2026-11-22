import mongoose from 'mongoose';

// MenuPlan — weekly cooking schedule: per weekday × meal slot items, optional cook, cost.
// Unique (groupId, weekStart). A concrete week overrides the template.
const menuItemSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, maxlength: 60, required: true },
        qtyHint: { type: String, trim: true, maxlength: 30, default: '' },
    },
    { _id: false }
);

const menuSlotSchema = new mongoose.Schema(
    {
        items: [menuItemSchema],
    },
    { _id: false }
);

const menuDaySchema = new mongoose.Schema(
    {
        weekday: { type: Number, min: 0, max: 6, required: true }, // 0=Sun..6=Sat
        slots: {
            breakfast: { type: menuSlotSchema, default: {} },
            lunch: { type: menuSlotSchema, default: {} },
            snacks: { type: menuSlotSchema, default: {} },
            dinner: { type: menuSlotSchema, default: {} },
        },
        cookMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
        estCostPoisha: { type: Number, default: 0 },
        note: { type: String, trim: true, maxlength: 300, default: '' },
    },
    { _id: false }
);

const menuPlanSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        weekStart: { type: String, required: true, index: true }, // 'YYYY-MM-DD' Dhaka date (week start)
        isTemplate: { type: Boolean, default: false, index: true },
        days: [menuDaySchema],
        revision: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

menuPlanSchema.index({ groupId: 1, weekStart: 1 }, { unique: true });

const MenuPlan = mongoose.model('MenuPlan', menuPlanSchema);
export default MenuPlan;
