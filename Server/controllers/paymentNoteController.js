import PaymentNote from '../models/PaymentNote.js';
import MessGroup from '../models/MessGroup.js';
import { paymentNoteSchema, noteParamSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import { publicProfile } from '../middleware/privacy.js';

// Helper: month param validation is done here when combined with groupId+userId params
const validateParams = (req, res) => {
    const parsed = noteParamSchema.safeParse(req.params);
    if (!parsed.success) {
        res.status(400).json({
            msg: 'Validation failed',
            errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
        });
        return null;
    }
    return parsed.data;
};

// PUT /api/messgroups/payment-note/:groupId/:userId/:month
// Admin creates OR edits the month's note for a member (upsert).
export const upsertPaymentNote = [
    validate(paymentNoteSchema),
    async (req, res, next) => {
        try {
            const params = validateParams(req, res);
            if (!params) return;
            const { groupId, userId, month } = params;

            // authorization: caller must be group admin (member(userId) check too)
            const group = await MessGroup.findById(groupId);
            if (!group) return res.status(404).json({ msg: 'Group not found' });
            if (!group.admin.equals(req.user.id)) {
                return res.status(403).json({ msg: 'Only admin can create or edit payment notes' });
            }
            if (!group.members.some(m => m.user.equals(userId))) {
                return res.status(404).json({ msg: 'User is not a member of this group' });
            }

            const { note, amountDue = 0, isPaid = false } = req.body;

            const paymentNote = await PaymentNote.findOneAndUpdate(
                { groupId, userId, month },
                {
                    note,
                    amountDue,
                    isPaid,
                    paidAt: isPaid ? new Date() : null,
                    createdBy: req.user.id,
                },
                { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
            );

            res.status(201).json({ msg: 'Payment note saved', paymentNote });
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/messgroups/payment-note/:groupId/:userId/:month
// Admin: any member's note. Member: only their own.
export const getPaymentNote = async (req, res, next) => {
    try {
        const params = validateParams(req, res);
        if (!params) return;
        const { groupId, userId, month } = params;

        const group = await MessGroup.findById(groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        const isAdmin = group.admin.equals(req.user.id);
        const isSelf = req.user.id === userId;
        if (!isAdmin && !isSelf) {
            return res.status(403).json({ msg: 'Members can only view their own payment note' });
        }

        const paymentNote = await PaymentNote.findOne({ groupId, userId, month })
            .populate('userId', '_id username profilePic')
            .populate('createdBy', 'username');

        if (!paymentNote) return res.status(404).json({ msg: 'No payment note for this month' });
        res.json(paymentNote);
    } catch (err) {
        next(err);
    }
};

// GET /api/messgroups/payment-notes/:groupId/:month  (admin: all members' notes for a month)
export const getAllPaymentNotes = async (req, res, next) => {
    try {
        const groupId = req.params.groupId;
        const month = req.params.month;
        if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ msg: 'Month must be YYYY-MM' });

        const notes = await PaymentNote.find({ groupId, month })
            .populate('userId', '_id username profilePic')
            .populate('createdBy', 'username')
            .sort({ 'userId': 1 });

        res.json(notes);
    } catch (err) {
        next(err);
    }
};





