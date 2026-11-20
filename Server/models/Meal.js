import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
    state: { type: String, enum: ['unknown', 'confirmed_zero', 'consumed'], default: 'unknown' },
    portionSubunits: { type: Number, min: 0, max: 1000, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: ['member', 'absence', 'default', 'admin'], default: 'member' },
}, { _id: false });

const mealSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, required: true },
        breakfast: { type: slotSchema, default: () => ({}) },
        lunch: { type: slotSchema, default: () => ({}) },
        snacks: { type: slotSchema, default: () => ({}) },
        dinner: { type: slotSchema, default: () => ({}) },
        totalMealSubunits: { type: Number, default: 0 },
        totalMeals: { type: Number, default: 0 }, // compatibility/display value in portions
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    },
    { timestamps: true }
); 

// One document per user per day per group
mealSchema.index({ groupId: 1, userId: 1, date: 1 }, { unique: true });

// Unknown and confirmed-zero both contribute zero; unknown remains explicit and
// blocks statement finalization rather than being silently treated as absent.
mealSchema.pre('validate', function (next) {
    const slots = ['breakfast', 'lunch', 'snacks', 'dinner'];
    this.totalMealSubunits = slots.reduce((sum, name) => {
        const slot = this[name];
        if (!slot || slot.state !== 'consumed') return sum;
        return sum + (slot.portionSubunits || 0);
    }, 0);
    this.totalMeals = this.totalMealSubunits / 1000;
    next();
});

mealSchema.index({ groupId: 1, date: 1, 'breakfast.state': 1, 'lunch.state': 1, 'snacks.state': 1, 'dinner.state': 1 });

const Meal = mongoose.model('Meal', mealSchema);
export default Meal;
