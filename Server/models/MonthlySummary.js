import mongoose from 'mongoose';

const monthSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // "2024-08"
        totalMeals: { type: Number, default: 0 },
        totalExpenses: { type: Number, default: 0 },
        mealRate: { type: Number, default: 0 }, // totalExpenses / totalMeals
        userSummaries: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                totalMeals: { type: Number, default: 0 },
                totalExpenses: { type: Number, default: 0 },
                mealCost: { type: Number, default: 0 }, // totalMeals * mealRate
                balance: { type: Number, default: 0 }, // totalExpenses - mealCost
                status: { type: String, enum: ['owes', 'receives', 'settled'], default: 'settled' },
                _id: false,
            },
        ],
        extras: [
            {
                name: { type: String },
                amount: { type: Number },
                _id: false,
            },
        ],
        isFinalized: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// One summary per group per month
monthSchema.index({ groupId: 1, month: 1 }, { unique: true });

const MonthlySummary = mongoose.model('MonthlySummary', monthSchema);
export default MonthlySummary;
