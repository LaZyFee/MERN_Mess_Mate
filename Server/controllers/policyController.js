import PolicyVersion from '../models/PolicyVersion.js';
import { audit } from '../models/AuditEvent.js';

// Policy endpoints — publish new immutable versions; future-effective only.

/** GET /api/groups/:groupId/policies — version history */
export const listPolicies = async (req, res, next) => {
    try {
        const policies = await PolicyVersion.find({ groupId: req.params.groupId }).sort({ effectiveFrom: -1, version: -1 }).lean();
        res.json({ policies });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/policies — publish a new version */
export const publishPolicy = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { effectiveFrom, mealWeights, allowedPortions, entryCutoffHour, currency, timezone, requireExpenseApproval, reviewGraceDays } = req.body;

        // effectiveFrom must be current or future (a month cannot silently switch policy retroactively)
        const current = new Date();
        const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        if (effectiveFrom < currentMonth) {
            return res.status(422).json({ msg: 'Policy can only take effect from the current or a future month' });
        }

        const latest = await PolicyVersion.findOne({ groupId }).sort({ version: -1 });
        const policy = await PolicyVersion.create({
            groupId,
            version: (latest?.version || 0) + 1,
            effectiveFrom,
            mealWeights,
            allowedPortions,
            entryCutoffHour,
            currency,
            timezone,
            requireExpenseApproval,
            reviewGraceDays,
            publishedBy: req.user.id,
        });

        await audit({
            groupId, actorId: req.user.id,
            action: 'policy.published', targetType: 'policy', targetId: policy._id,
            after: { version: policy.version, effectiveFrom },
        });

        res.status(201).json({ msg: 'Policy version published', policy });
    } catch (err) { next(err); }
};
