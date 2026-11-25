import mongoose from 'mongoose';

// Quick polls for the menu. Members vote on options; results are visible to all
// group members. Polls auto-close after expiresAt.
//
// NOTE: option ids are INTENTIONALLY disabled (`_id: false`). Poll votes are cast
// by option INDEX (POST /api/polls/:pollId/vote { optionIndex }), so subdocument
// ids would only add noise. Do not "fix" this back to _id:true without also
// updating pollController.votePoll.
const optionSchema = new mongoose.Schema({
    text: { type: String, trim: true, required: true, maxlength: 120 },
    voteCount: { type: Number, default: 0 },
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const pollSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
    question: { type: String, trim: true, required: true, maxlength: 200 },
    options: [optionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    expiresAt: { type: Date, required: true },
    relatedMenuItem: { type: String, trim: true, maxlength: 120, default: '' }, // e.g. "Friday dinner"
}, { timestamps: true, optimisticConcurrency: true });

pollSchema.index({ groupId: 1, status: 1 });
pollSchema.index({ expiresAt: 1 });

const Poll = mongoose.model('Poll', pollSchema);
export default Poll;
