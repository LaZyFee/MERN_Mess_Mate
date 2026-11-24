import Period from '../models/Period.js';
import { getOrCreatePeriod, beginReview, returnToOpen, ensureOpen } from '../services/periodService.js';
import { buildStatementDraft } from '../services/statementService.js';
import { getAccountingEquation } from '../services/ledgerService.js';
import { audit } from '../models/AuditEvent.js';

// Period endpoints — state machine transitions + preview.

/** GET /api/groups/:groupId/periods — all periods */
export const listPeriods = async (req, res, next) => {
    try {
        res.json({ periods: await Period.find({ groupId: req.params.groupId }).sort({ month: -1 }).lean() });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/periods/:month */
export const getPeriod = async (req, res, next) => {
    try {
        const period = await Period.findOne({ groupId: req.params.groupId, month: req.params.month }).lean();
        res.json({ period });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/periods/:month/preview — versioned draft, no persistence */
export const previewStatement = async (req, res, next) => {
    try {
        const draft = await buildStatementDraft({ groupId: req.params.groupId, month: req.params.month });
        const items = draft.items.map(({ membershipId, displayName, mealUnits, mealCost, otherCost, totalCharge, contributions, personalPayments, settlementsPaid, settlementsReceived, payoutsReceived, openingCredit, closingCredit, status }) => ({
            membershipId, displayName, mealUnits, mealCost, otherCost, totalCharge,
            contributions, personalPayments, settlementsPaid, settlementsReceived, payoutsReceived,
            openingCredit, closingCredit, status,
        }));
        res.json({
            month: req.params.month,
            totalMeals: draft.totalUnits,
            mealExpenses: draft.mealExpenses,
            otherExpenses: draft.otherExpenses,
            totalExpenses: draft.totalExpenses,
            mealRate: draft.mealRate,
            items,
        });
    } catch (err) {
        if (err.status === 422 || err.status === 409) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/groups/:groupId/periods/:month/begin-review */
export const startReview = async (req, res, next) => {
    try {
        const period = await beginReview({ groupId: req.params.groupId, month: req.params.month, userId: req.user.id });
        res.json({ msg: 'Review started', period });
    } catch (err) {
        if (err.status === 409) return res.status(409).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/groups/:groupId/periods/:month/return-to-open */
export const reopenPeriod = async (req, res, next) => {
    try {
        const period = await returnToOpen({
            groupId: req.params.groupId, month: req.params.month,
            userId: req.user.id, reason: req.body?.reason || '',
        });
        res.json({ msg: 'Returned to open', period });
    } catch (err) {
        if (err.status === 409) return res.status(409).json({ msg: err.message });
        next(err);
    }
};

/** GET /api/groups/:groupId/periods/:month/checklist — pre-close checks */
export const closeChecklist = async (req, res, next) => {
    try {
        const equation = await getAccountingEquation({ groupId: req.params.groupId });
        const period = await ensureOpen({ groupId: req.params.groupId, month: req.params.month, allowReview: true });
        res.json({
            accountingEquation: equation,
            checks: [
                { name: 'journals_balanced', ok: equation.balanced },
                { name: 'period_editable', ok: Boolean(period), state: period?.state || 'missing' },
            ],
        });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/periods/:month/correct — prior-period adjustment marker (audit trail) */
export const recordCorrection = async (req, res, next) => {
    try {
        await audit({
            groupId: req.params.groupId, actorId: req.user.id,
            action: 'period.correction_recorded', targetType: 'period',
            reason: req.body?.reason || '',
            after: req.body?.adjustment || null,
        });
        res.status(201).json({ msg: 'Correction recorded in audit trail' });
    } catch (err) { next(err); }
};
