import mongoose from 'mongoose';

// Statement — immutable month-end snapshot with versioning/supersession.
// Finalizing creates version N; a correction creates version N+1 that
// supersedes N. Rows are never mutated after creation.

const statementItemSchema = new mongoose.Schema(
    {
        membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
        displayName: { type: String, required: true }, // snapshot (works for placeholders too)
        mealUnits: { type: Number, default: 0 },       // weighted chargeable units (raw portions kept in meals snapshot)
        rawPortions: { breakfast: Number, lunch: Number, dinner: Number },
        mealCost: { type: Number, default: 0 },        // poisha
        otherCost: { type: Number, default: 0 },       // poisha (non-food lines + adjustments)
        totalCharge: { type: Number, default: 0 },     // poisha
        contributions: { type: Number, default: 0 },   // poisha confirmed into fund
        personalPayments: { type: Number, default: 0 },// poisha paid to suppliers personally
        settlementsPaid: { type: Number, default: 0 },
        settlementsReceived: { type: Number, default: 0 },
        payoutsReceived: { type: Number, default: 0 },
        priorPeriodAdjustments: { type: Number, default: 0 },
        openingCredit: { type: Number, default: 0 },   // poisha carried from prior statements
        closingCredit: { type: Number, default: 0 },   // poisha — positive = group owes member
        status: { type: String, enum: ['owes', 'receives', 'settled'], default: 'settled' },
        _id: false,
    }
);

const statementSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
        version: { type: Number, required: true },
        state: { type: String, enum: ['current', 'superseded'], default: 'current' },
        supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'Statement', default: null },
        supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Statement', default: null },
        totalMeals: { type: Number, default: 0 },
        mealExpenses: { type: Number, default: 0 },  // poisha — food pool
        otherExpenses: { type: Number, default: 0 }, // poisha — everything else
        totalExpenses: { type: Number, default: 0 },
        fundBalance: { type: Number, default: 0 },   // poisha — computed assets minus liabilities at close
        mealRate: { type: Number, default: null },   // poisha per meal unit, null when not applicable
        policySnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },   // frozen PolicyVersion
        membershipSnapshot: [{ membershipId: mongoose.Schema.Types.ObjectId, userId: mongoose.Schema.Types.ObjectId, displayName: String, role: String, startDate: Date, endDate: Date }],
        items: [statementItemSchema],
        sourceHash: { type: String, default: '' },   // hash of frozen inputs
        finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        finalizedAt: { type: Date, required: true },
        reason: { type: String, trim: true, maxlength: 300, default: '' }, // correction reason on supersede
    },
    { timestamps: true }
);

statementSchema.index({ groupId: 1, month: 1, version: 1 }, { unique: true });
statementSchema.index({ groupId: 1, state: 1 });

const Statement = mongoose.model('Statement', statementSchema);
export default Statement;
