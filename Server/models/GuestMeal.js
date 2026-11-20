import mongoose from 'mongoose';

const guestMealSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
    hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hostMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null },
    guestName: { type: String, trim: true, maxlength: 80, default: '' },
    localDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    slot: { type: String, enum: ['breakfast', 'lunch', 'snacks', 'dinner'], required: true },
    portionSubunits: { type: Number, required: true, min: 1, max: 1000 },
    poolMode: { type: String, enum: ['individual', 'universal'], required: true },
    eventPoolRef: { type: String, trim: true, maxlength: 120, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'void'], default: 'active' },
}, { timestamps: true });

guestMealSchema.index({ groupId: 1, localDate: 1, hostUserId: 1, slot: 1 });

const GuestMeal = mongoose.model('GuestMeal', guestMealSchema);
export default GuestMeal;
