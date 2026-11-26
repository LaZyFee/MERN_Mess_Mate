import Statement from '../models/Statement.js';
import { finalizeStatement, buildStatementDraft } from '../services/statementService.js';
import { getOrCreatePeriod } from '../services/periodService.js';
import { audit } from '../models/AuditEvent.js';
import { enqueueNotification } from '../services/outboxWorker.js';

// Statement endpoints — versioned finalize, supersession history, delivery outbox.

/** POST /api/groups/:groupId/statements/:month/finalize — admin; creates version N+1 */
export const finalize = async (req, res, next) => {
    try {
        const { groupId, month } = req.params;
        const period = await getOrCreatePeriod({ groupId, month, userId: req.user.id });
        const expectedRevision = req.body?.expectedRevision;

        const statement = await finalizeStatement({
            groupId, month,
            expectedRevision: typeof expectedRevision === 'number' ? expectedRevision : period.revision,
            userId: req.user.id,
            reason: req.body?.reason || '',
        });

        // enqueue individual statement notifications via the outbox (per recipient)
        const { default: Membership } = await import('../models/Membership.js');
        const { default: User } = await import('../models/User.js');
        for (const item of statement.items) {
            const membership = await Membership.findById(item.membershipId).lean();
            if (!membership?.user) continue; // placeholders have no delivery target
            const user = await User.findById(membership.user).select('email whatsapp').lean();
            if (!user) continue;
            const text = buildStatementText(statement, item);
            if (user.whatsapp) {
                await enqueueNotification({
                    groupId, statementId: statement._id, membershipId: item.membershipId,
                    userId: user._id, channel: 'whatsapp', purpose: 'statement',
                    recipientWa: user.whatsapp,
                    payload: { text },
                });
            }
            if (user.email) {
                await enqueueNotification({
                    groupId, statementId: statement._id, membershipId: item.membershipId,
                    userId: user._id, channel: 'email', purpose: 'statement',
                    recipientEmail: user.email,
                    payload: {
                        subject: `MealMate statement — ${statement.month} (v${statement.version})`,
                        html: `<pre>${text}</pre>`,
                    },
                });
            }
        }

        await audit({ groupId, actorId: req.user.id, action: 'statement.finalized', targetType: 'statement', targetId: statement._id, after: { version: statement.version, month } });
        res.status(201).json({ msg: `Statement v${statement.version} finalized; deliveries queued`, statement });
    } catch (err) {
        if (err.status === 409 || err.status === 422) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

const taka = (p) => `৳${(p / 100).toFixed(2)}`;
const buildStatementText = (statement, item) => {
    const lines = [
        `📋 ${statement.month} statement (v${statement.version})`,
        `Meals: ${item.mealUnits} units × ${statement.mealRate != null ? taka(statement.mealRate) : 'n/a'} = ${taka(item.mealCost)}`,
        `Other charges: ${taka(item.otherCost)}`,
        `Total charge: ${taka(item.totalCharge)}`,
        `Contributions: ${taka(item.contributions)} | Personal payments: ${taka(item.personalPayments)}`,
        `Opening balance: ${taka(item.openingCredit)}`,
        `Closing: ${item.closingCredit >= 0 ? `you receive ${taka(item.closingCredit)}` : `you owe ${taka(-item.closingCredit)}`}`,
    ];
    return lines.join('\n');
};

/** GET /api/groups/:groupId/statements/:month — version history */
export const getStatement = async (req, res, next) => {
    try {
        const statements = await Statement.find({ groupId: req.params.groupId, month: req.params.month })
            .sort({ version: -1 }).lean();
        res.json({ statements, current: statements.find(s => s.state === 'current') || null });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/statements — all months (current versions) */
export const listStatements = async (req, res, next) => {
    try {
        const statements = await Statement.find({ groupId: req.params.groupId, state: 'current' })
            .sort({ month: -1 }).lean();
        res.json({ statements });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/statements/id/:statementId — single (member-scoped option) */
export const getStatementById = async (req, res, next) => {
    try {
        const statement = await Statement.findOne({ _id: req.params.statementId, groupId: req.params.groupId }).lean();
        if (!statement) return res.status(404).json({ msg: 'Statement not found' });
        res.json({ statement, superseded: statement.state === 'superseded' });
    } catch (err) { next(err); }
};

/**
 * POST /api/groups/:groupId/statements/:month/reminders — manually queue debtor
 * reminders for the current finalized statement (S5.3). Same rules + dedupe as the
 * scheduled job: quiet hours, consent and one reminder per revision+member+channel.
 */
export const remindDebtors = async (req, res, next) => {
    try {
        const { groupId, month } = req.params;
        const { sendDebtorReminders } = await import('../services/reminderService.js');
        const result = await sendDebtorReminders({ groupId, month });
        if (!result.targets && !result.queued) {
            return res.status(422).json({ msg: 'No owing members to remind (or already reminded this cycle)', ...result });
        }
        await audit({
            groupId, actorId: req.user.id, action: 'statement.reminders_queued',
            targetType: 'statement', targetId: null, after: { month, ...result },
        });
        res.status(202).json({ msg: `Queued ${result.queued} reminder(s)`, ...result });
    } catch (err) { next(err); }
};

/**
 * GET /api/groups/:groupId/statements/:month/explain?membershipId= (S5.6)
 * "Explain my bill": a structured en+bn breakdown of ONE frozen statement item.
 * Members may only explain their own item; treasurer+ may pass any membershipId.
 * The item is read from the frozen statement — no money is recomputed.
 */
export const explainBill = async (req, res, next) => {
    try {
        const { groupId, month } = req.params;
        const { membershipId } = req.validated?.query || {};
        const { default: Membership } = await import('../models/Membership.js');
        const { default: MessGroup } = await import('../models/MessGroup.js');
        const { buildBillExplanation } = await import('../services/billExplanationRules.js');

        const statement = await Statement.findOne({ groupId, month, state: 'current' }).lean();
        if (!statement) return res.status(404).json({ msg: 'No finalized statement for this month' });

        let targetId = membershipId;
        if (!targetId) {
            const own = await Membership.findOne({
                groupId, user: req.user.id, startDate: { $lt: new Date(`${month}-01T00:00:00.000Z`) },
                $or: [{ endDate: null }, { endDate: { $gt: new Date(`${month}-01T00:00:00.000Z`) } }],
            }).select('_id').lean();
            if (!own) return res.status(404).json({ msg: 'You were not a member in this month' });
            targetId = own._id;
        } else if (!['owner', 'manager', 'treasurer', 'auditor'].includes(req.groupRole)) {
            const own = await Membership.findOne({ _id: targetId, groupId, user: req.user.id }).lean();
            if (!own) return res.status(403).json({ msg: 'You can only explain your own bill' });
        }

        const item = (statement.items || []).find(i => String(i.membershipId) === String(targetId));
        if (!item) return res.status(404).json({ msg: 'This member is not in the statement' });
        const group = await MessGroup.findById(groupId).select('name').lean();

        const explanation = buildBillExplanation({
            month, item, mealRate: statement.mealRate, groupName: group?.name || '',
            lang: req.validated?.query?.lang || 'en',
        });
        res.json({ statementId: statement._id, version: statement.version, ...explanation });
    } catch (err) { next(err); }
};
