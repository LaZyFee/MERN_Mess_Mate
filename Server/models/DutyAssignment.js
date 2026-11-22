import mongoose from 'mongoose';

// DutyAssignment — one member + one Dhaka civil day + one task.
// The row members actually see and tick off.
const dutyAssignmentSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        rosterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roster', required: true, index: true },
        taskKey: { type: String, trim: true, maxlength: 60, required: true, index: true }, // e.g. 'bazar', 'cleaning:kitchen'
        localDate: { type: String, required: true, index: true }, // 'YYYY-MM-DD' (Asia/Dhaka civil date)
        membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true, index: true },
        status: {
            type: String,
            enum: ['scheduled', 'done', 'missed', 'swapped', 'skipped', 'cancelled'],
            default: 'scheduled',
            index: true,
        },
        doneAt: { type: Date, default: null },
        doneNote: { type: String, trim: true, maxlength: 200, default: '' },
        linkedExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null }, // bazar -> expense draft
        origin: {
            type: String,
            enum: ['generated', 'manual', 'swap', 'reassign'],
            default: 'generated',
        },
        revision: { type: Number, default: 0 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

dutyAssignmentSchema.index({ rosterId: 1, taskKey: 1, localDate: 1 }, { unique: true });
dutyAssignmentSchema.index({ groupId: 1, localDate: 1 });
dutyAssignmentSchema.index({ membershipId: 1, localDate: 1 });
dutyAssignmentSchema.index({ status: 1, localDate: 1 });

const DutyAssignment = mongoose.model('DutyAssignment', dutyAssignmentSchema);
export default DutyAssignment;
