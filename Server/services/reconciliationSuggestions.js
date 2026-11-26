// Reconciliation suggestions (S5.5) — read-only gathering for the panel. Rules are
// pure (reconciliationSuggestionRules.js); this module only runs the queries.

import Expense from '../models/Expense.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import Attachment from '../models/Attachment.js';
import {
    expenseSuggestions, transactionSuggestions, rankSuggestions, summarizeSuggestions,
} from './reconciliationSuggestionRules.js';

const monthRange = (month) => ({
    from: new Date(`${month}-01T00:00:00.000Z`),
    to: (() => { const d = new Date(`${month}-01T00:00:00.000Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d; })(),
});

/**
 * Collect suggestions for one group/month (or all time when month is omitted).
 * Returns { suggestions, summary, scanned }.
 */
export const collectReconciliationSuggestions = async ({ groupId, month = null, now = new Date(), staleHours = 48 }) => {
    const expenseFilter = { groupId, status: 'approved', isReversal: { $ne: true } };
    if (month) {
        const { from, to } = monthRange(month);
        expenseFilter.$or = [
            { costPeriod: month },
            { costPeriod: { $in: [null, undefined] }, date: { $gte: from, $lt: to } },
        ];
    }

    const txFilter = { groupId, status: 'submitted' };
    if (month) {
        const { from, to } = monthRange(month);
        txFilter.paidAt = { $gte: from, $lt: to };
    }

    const [expenses, transactions] = await Promise.all([
        Expense.find(expenseFilter)
            .select('_id amount paidTotal isPayable receiptUrl supplierName date')
            .limit(500).lean(),
        MoneyTransaction.find(txFilter)
            .select('_id kind amount paidAt submittedBy createdAt')
            .limit(500).lean(),
    ]);

    const idsWithAttachment = await Attachment.find({
        groupId, targetType: 'expense_receipt', targetId: { $in: expenses.map(e => e._id) },
    }).distinct('targetId');
    const attached = new Set(idsWithAttachment.map(String));

    const suggestions = [];
    for (const expense of expenses) {
        suggestions.push(...expenseSuggestions(expense, { hasReceiptAttachment: attached.has(String(expense._id)), today: now }));
    }
    for (const tx of transactions) {
        suggestions.push(...transactionSuggestions(tx, { now, staleHours }));
    }

    const ranked = rankSuggestions(suggestions);
    return {
        groupId,
        month,
        suggestions: ranked,
        summary: summarizeSuggestions(ranked),
        scanned: { expenses: expenses.length, submittedTransactions: transactions.length },
    };
};
