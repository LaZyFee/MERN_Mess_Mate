import mongoose from 'mongoose';

// Quick polls for the menu. Members vote on options; results are visible to all
// group members. Polls auto-close after expiresAt.
const optionSchema = new mongoose.Schema({
    text: { type: String, trim: true, required: true, max: 120 },
    voteCount: { type: Number, default: 0 },
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: true });

const pollSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
    question: { type: String, trim: true, required: true, max: 200 },
    options: [optionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    expiresAt: { type: Date, required: true },
    relatedMenuItem: { type: String, trim: true, max: 120, default: '' }, // e.g. "Friday dinner"
}, { timestamps: true, optimisticConcurrency: true });

pollSchema.index({ groupId: 1, status: 1 });
pollSchema.index({ expiresAt: 1 });

const Poll = mongoose.model('Poll', pollSchema);
export default Poll;