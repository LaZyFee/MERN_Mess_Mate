import Dispute from '../models/Dispute.js';
import { audit } from '../models/AuditEvent.js';
import { MEMBER_VISIBLE_FIELDS } from '../middleware/privacy.js';

// Disputes — open/list/respond/resolve against a source or statement item.

/** POST /api/groups/:groupId/disputes */
export const openDispute = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { targetType, targetId, reason, statementId = null, membershipId = null } = req.body;
        if (!['expense', 'money_transaction', 'statement_item'].includes(targetType)) {
            return res.status(400).json({ msg: 'targetType must be expense | money_transaction | statement_item' });
        }
        const dispute = await Dispute.create({
            groupId, raisedBy: req.user.id, targetType, targetId, reason, statementId, membershipId,
        });
        await audit({ groupId, actorId: req.user.id, action: 'dispute.opened', targetType, targetId, reason: reason.slice(0, 200) });
        res.status(201).json({ msg: 'Dispute opened', dispute });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/disputes?status= */
export const listDisputes = async (req, res, next) => {
    try {
        const filter = { groupId: req.params.groupId };
        if (req.validated?.query?.status) filter.status = req.validated.query.status;
        const disputes = await Dispute.find(filter)
            .populate('raisedBy', MEMBER_VISIBLE_FIELDS)
            .sort({ createdAt: -1 }).limit(100).lean();
        res.json({ disputes });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/disputes/:disputeId/respond */
export const respondToDispute = async (req, res, next) => {
    try {
        const dispute = await Dispute.findOne({ _id: req.params.disputeId, groupId: req.params.groupId });
        if (!dispute) return res.status(404).json({ msg: 'Dispute not found' });
        if (!req.body?.text) return res.status(400).json({ msg: 'Response text required' });
        dispute.responses.push({ userId: req.user.id, text: String(req.body.text).slice(0, 1000) });
        await dispute.save();
        res.json({ msg: 'Response recorded', dispute });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/disputes/:disputeId/resolve */
export const resolveDispute = async (req, res, next) => {
    try {
        const dispute = await Dispute.findOne({ _id: req.params.disputeId, groupId: req.params.groupId });
        if (!dispute) return res.status(404).json({ msg: 'Dispute not found' });
        if (dispute.status !== 'open') return res.status(409).json({ msg: 'Dispute already closed' });

        dispute.status = req.body?.rejected ? 'rejected' : 'resolved';
        dispute.resolvedBy = req.user.id;
        dispute.resolvedAt = new Date();
        dispute.resolutionNote = req.body?.note || '';
        dispute.correctionJournalId = req.body?.correctionJournalId || null;
        await dispute.save();

        await audit({
            groupId: dispute.groupId, actorId: req.user.id,
            action: 'dispute.resolved', targetType: dispute.targetType, targetId: dispute.targetId,
            reason: dispute.resolutionNote, after: { status: dispute.status },
        });
        res.json({ msg: 'Dispute closed', dispute });
    } catch (err) { next(err); }
};
