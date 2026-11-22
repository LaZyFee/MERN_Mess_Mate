import mongoose from 'mongoose';

// SwapRequest — a member asks to swap or give away a duty; target accepts/declines.
// Manager can override. Accepting writes a new assignment origin:'swap' and marks
// the old one 'swapped' (no in-place overwrite).
const swapRequestSchema = new mongoose.Schema(
    {
        assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DutyAssignment', required: true, index: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessGroup', required: true, index: true },
        fromMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
        toMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', default: null }, // null = open offer
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
            default: 'pending',
            index: true,
        },
        reason: { type: String, trim: true, maxlength: 500, default: '' },
        respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        respondedAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true }, // TTL = the duty date end
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

swapRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup
swapRequestSchema.index({ status: 1, expiresAt: 1 });
swapRequestSchema.index({ fromMembershipId: 1, status: 1 });

const SwapRequest = mongoose.model('SwapRequest', swapRequestSchema);
export default SwapRequest;
