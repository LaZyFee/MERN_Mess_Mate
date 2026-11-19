import RecurringRule from '../models/RecurringRule.js';
import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import { ensureOpen } from '../services/periodService.js';
import { audit } from '../models/AuditEvent.js';

// Recurring rules — generate expense DRAFTS (never auto-approved) with a
// unique (ruleId, costPeriod) generation key to prevent duplicates.

/** GET /api/groups/:groupId/recurring */
export const listRules = async (req, res, next) => {
    try {
        res.json({ rules: await RecurringRule.find({ groupId: req.params.groupId }).sort({ createdAt: -1 }).lean() });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/recurring */
export const createRule = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const rule = await RecurringRule.create({
            groupId,
            name: req.body.name,
            categoryId: req.body.categoryId || null,
            amount: req.body.amount, // poisha
            splitMode: req.body.splitMode || 'equal_all',
            beneficiaries: req.body.beneficiaries || [],
            fixedAmounts: req.body.fixedAmounts || [],
            weights: req.body.weights || [],
            supplierName: req.body.supplierName || '',
            dueDayOfMonth: req.body.dueDayOfMonth || 5,
            effectiveFrom: req.body.effectiveFrom,
            effectiveTo: req.body.effectiveTo || null,
            createdBy: req.user.id,
        });
        await audit({ groupId, actorId: req.user.id, action: 'recurring.created', targetType: 'recurring_rule', targetId: rule._id, after: { name: rule.name, amount: rule.amount } });
        res.status(201).json({ msg: 'Recurring rule created', rule });
    } catch (err) { next(err); }
};

/** PUT /api/groups/:groupId/recurring/:ruleId */
export const updateRule = async (req, res, next) => {
    try {
        const rule = await RecurringRule.findOne({ _id: req.params.ruleId, groupId: req.params.groupId });
        if (!rule) return res.status(404).json({ msg: 'Rule not found' });
        for (const k of ['name', 'categoryId', 'amount', 'splitMode', 'dueDayOfMonth', 'isActive', 'effectiveTo']) {
            if (req.body[k] !== undefined) rule[k] = req.body[k];
        }
        await rule.save();
        await audit({ groupId: rule.groupId, actorId: req.user.id, action: 'recurring.updated', targetType: 'recurring_rule', targetId: rule._id, after: { isActive: rule.isActive } });
        res.json({ msg: 'Rule updated', rule });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/recurring/:ruleId/generate — draft for a cost period */
export const generateDraft = async (req, res, next) => {
    try {
        const { groupId, ruleId } = req.params;
        const costPeriod = req.body?.costPeriod;
        if (!/^\d{4}-\d{2}$/.test(costPeriod || '')) {
            return res.status(400).json({ msg: 'costPeriod (YYYY-MM) required' });
        }

        const rule = await RecurringRule.findOne({ _id: ruleId, groupId });
        if (!rule) return res.status(404).json({ msg: 'Rule not found' });
        if (!rule.isActive) return res.status(409).json({ msg: 'Rule is inactive' });
        if (costPeriod < rule.effectiveFrom || (rule.effectiveTo && costPeriod > rule.effectiveTo)) {
            return res.status(422).json({ msg: 'Cost period outside rule effective range' });
        }

        await ensureOpen({ groupId, month: costPeriod });

        // unique generation key prevents duplicates
        if (rule.generatedKeys.includes(costPeriod)) {
            return res.status(409).json({ msg: `Draft already generated for ${costPeriod}` });
        }

        const category = rule.categoryId ? await ExpenseCategory.findById(rule.categoryId).lean() : null;
        const draft = await Expense.create({
            groupId,
            createdBy: req.user.id,
            status: 'draft',
            supplierName: rule.supplierName,
            description: rule.name,
            date: new Date(`${costPeriod}-01`),
            costPeriod,
            month: costPeriod,
            amount: rule.amount,
            lines: [{
                description: rule.name,
                categoryId: rule.categoryId,
                amount: rule.amount,
                splitMode: rule.splitMode,
                beneficiaries: rule.beneficiaries,
                fixedAmounts: rule.fixedAmounts,
                weights: rule.weights,
            }],
            categoryId: rule.categoryId,
            category: category?.name || '',
            isPayable: true, // recurring bills are drafts awaiting supplier payment
        });

        rule.generatedKeys.push(costPeriod);
        await rule.save();

        await audit({ groupId, actorId: req.user.id, action: 'recurring.draft_generated', targetType: 'expense', targetId: draft._id, after: { costPeriod, ruleId } });
        res.status(201).json({ msg: `Draft generated for ${costPeriod}`, expense: draft });
    } catch (err) {
        if (err.status === 409) return res.status(409).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/recurring/groups/:groupId/generate-all — generate drafts for all active rules */
export const generateAllDrafts = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const now = new Date();
        const costPeriod = req.body?.costPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        await ensureOpen({ groupId, month: costPeriod });

        const rules = await RecurringRule.find({
            groupId,
            isActive: true,
            effectiveFrom: { $lte: costPeriod },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: costPeriod } }],
            generatedKeys: { $ne: costPeriod },
        });

        const generated = [];
        for (const rule of rules) {
            const category = rule.categoryId ? await ExpenseCategory.findById(rule.categoryId).lean() : null;
            const draft = await Expense.create({
                groupId,
                createdBy: req.user.id,
                status: 'draft',
                supplierName: rule.supplierName,
                description: rule.name,
                date: new Date(`${costPeriod}-01`),
                costPeriod,
                month: costPeriod,
                amount: rule.amount,
                lines: [{
                    description: rule.name,
                    categoryId: rule.categoryId,
                    amount: rule.amount,
                    splitMode: rule.splitMode,
                    beneficiaries: rule.beneficiaries,
                    fixedAmounts: rule.fixedAmounts,
                    weights: rule.weights,
                }],
                categoryId: rule.categoryId,
                category: category?.name || '',
                isPayable: true,
            });

            rule.generatedKeys.push(costPeriod);
            await rule.save();
            generated.push({ ruleId: rule._id, expenseId: draft._id });
        }

        res.status(201).json({ msg: `Generated ${generated.length} drafts for ${costPeriod}`, generated });
    } catch (err) {
        if (err.status === 409) return res.status(409).json({ msg: err.message });
        next(err);
    }
};
