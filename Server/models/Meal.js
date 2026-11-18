import mongoose from 'mongoose';

// Meal counts per meal slot, per plan: 0, 0.5, 1, 1.5, 2
const MEAL_VALUES = [0, 0.5, 1, 1.5, 2];

const mealSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, required: true },
        lunch: { type: Number, default: 0, enum: MEAL_VALUES },
        dinner: { type: Number, default: 0, enum: MEAL_VALUES },
        totalMeals: { type: Number, default: 0 },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // "2024-08"
    },
    { timestamps: true }
);

// One document per user per day per group
mealSchema.index({ groupId: 1, userId: 1, date: 1 }, { unique: true });

// Keep totalMeals in sync
mealSchema.pre('validate', function (next) {
    this.totalMeals = (this.lunch || 0) + (this.dinner || 0);
    next();
});

const Meal = mongoose.model('Meal', mealSchema);
export default Meal;
