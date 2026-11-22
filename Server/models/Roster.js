import mongoose from 'mongoose';

// Roster — a named rotation for one duty type (bazar | cleaning | cooking | custom).
// Cleaning rosters can carry areas[] (kitchen, bathroom, floor, trash).
const rosterSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        title: { type: String, trim: true, maxlength: 80, required: true },
        type: {
            type: String,
            enum: ['bazar', 'cleaning', 'cooking', 'custom'],
            required: true,
        },
        areas: [{ type: String, trim: true, maxlength: 40 }], // for cleaning rosters
        rotation: {
            mode: {
                type: String,
                enum: ['round_robin', 'weekly_template', 'fair', 'manual'],
                required: true,
            },
            memberOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Membership' }],
            weeklyTemplate: {
                type: Map,
                of: [mongoose.Schema.Types.ObjectId], // weekday name -> membershipIds
                default: new Map(),
            },
            daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sun..6=Sat
        },
        skipWhenAbsent: { type: Boolean, default: true },
        weekStartsOn: { type: Number, min: 0, max: 6, default: 6 }, // 6=Saturday
        horizonDays: { type: Number, min: 7, max: 90, default: 30 },
        state: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
        revision: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

rosterSchema.index({ groupId: 1, title: 1 }, { unique: true });
rosterSchema.index({ groupId: 1, state: 1 });
rosterSchema.index({ groupId: 1, type: 1 });

const Roster = mongoose.model('Roster', rosterSchema);
export default Roster;
