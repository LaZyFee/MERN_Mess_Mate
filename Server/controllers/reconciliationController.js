import Reconciliation from '../models/Reconciliation.js';
import FundAccount from '../models/FundAccount.js';
import { getFundBalance, getAccountingEquation } from '../services/ledgerService.js';
import { audit } from '../models/AuditEvent.js';

// Reconciliation — counted cash vs ledger expectation; variance is surfaced,
// explained and resolved (never hidden by editing an expense or balance).

/** POST /api/groups/:groupId/reconciliations */
export const createReconciliation = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { accountId, asOf, actualBalance } = req.body;

        const fund = await FundAccount.findOne({ _id: accountId, groupId });
        if (!fund) return res.status(404).json({ msg: 'Fund account not found' });

        const expectedBalance = await getFundBalance({ groupId, accountId, asOf: asOf ? new Date(asOf) : new Date() });
        const actual = typeof actualBalance === 'string' ? Number(actualBalance) : actualBalance;
        if (!Number.isSafeInteger(actual)) {
            return res.status(400).json({ msg: 'actualBalance must be integer poisha' });
        }

        const rec = await Reconciliation.create({
            groupId, accountId, asOf: asOf ? new Date(asOf) : new Date(),
            expectedBalance, actualBalance: actual,
            variance: actual - expectedBalance,
            reviewedBy: req.user.id,
        });

        await audit({ groupId, actorId: req.user.id, action: 'reconciliation.created', targetType: 'reconciliation', targetId: rec._id, after: { variance: rec.variance } });
        res.status(201).json({
            msg: rec.variance === 0 ? 'Reconciled exactly' : 'Variance recorded — resolve before close',
            reconciliation: rec,
        });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/reconciliations */
export const listReconciliations = async (req, res, next) => {
    try {
        const filter = { groupId: req.params.groupId };
        if (req.validated?.query?.accountId) filter.accountId = req.validated.query.accountId;
        const reconciliations = await Reconciliation.find(filter).sort({ asOf: -1 }).limit(100).lean();
        res.json({ reconciliations });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/reconciliations/:recId/resolve */
export const resolveReconciliation = async (req, res, next) => {
    try {
        const rec = await Reconciliation.findOne({ _id: req.params.recId, groupId: req.params.groupId });
        if (!rec) return res.status(404).json({ msg: 'Reconciliation not found' });
        if (rec.status === 'resolved') return res.status(409).json({ msg: 'Already resolved' });

        const { resolution, explanation } = req.body || {};
        if (!['adjusted', 'accepted_shortage', 'found_cash', 'none'].includes(resolution)) {
            return res.status(400).json({ msg: 'resolution must be adjusted | accepted_shortage | found_cash | none' });
        }

        rec.status = 'resolved';
        rec.resolution = resolution;
        rec.explanation = explanation || rec.explanation;
        rec.resolvedBy = req.user.id;
        rec.resolvedAt = new Date();
        await rec.save();

        await audit({
            groupId: rec.groupId, actorId: req.user.id,
            action: 'reconciliation.resolved', targetType: 'reconciliation', targetId: rec._id,
            reason: explanation || '', after: { resolution, variance: rec.variance },
        });

        res.json({ msg: 'Reconciliation resolved', reconciliation: rec });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/reconciliations/equation — accounting identity */
export const accountingEquation = async (req, res, next) => {
    try {
        res.json(await getAccountingEquation({ groupId: req.params.groupId }));
    } catch (err) { next(err); }
};

/**
 * GET /api/groups/:groupId/reconciliations/suggestions?month=YYYY-MM (S5.5)
 * Read-only: unconfirmed transactions, payable expenses not fully paid, and
 * expenses with no receipt. Never mutates anything; ranks by severity then amount.
 */
export const listReconciliationSuggestions = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const month = req.validated?.query?.month || null;
        const { collectReconciliationSuggestions } = await import('../services/reconciliationSuggestions.js');
        res.json(await collectReconciliationSuggestions({ groupId, month }));
    } catch (err) { next(err); }
};
