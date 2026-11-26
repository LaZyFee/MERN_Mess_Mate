// Reconciliation suggestions (S5.5) — pure classification rules, no DB access.
// The ledger is the truth; these rules only point at rows that need a human look
// before a month is closed. They never mutate anything.

export const SUGGESTION_KINDS = ['unconfirmed_transaction', 'underpaid_expense', 'missing_receipt'];

/**
 * Classify one expense.
 *   expense: { _id, amount, paidTotal, isPayable, receiptUrl, status }
 *   hasReceiptAttachment: boolean — an Attachment row exists for this expense
 * Returns [] or one suggestion { kind, severity, expenseId, title, detail, amountPoisha }.
 */
export const expenseSuggestions = (expense, { hasReceiptAttachment = false, today = new Date() } = {}) => {
    const out = [];
    const amount = Number(expense.amount) || 0;
    const paid = Number(expense.paidTotal) || 0;

    if (expense.isPayable === true && paid < amount) {
        out.push({
            kind: 'underpaid_expense',
            severity: paid === 0 ? 'high' : 'medium',
            expenseId: expense._id,
            title: paid === 0 ? 'Payable expense with no payment recorded' : 'Payable expense partly paid',
            detail: `Paid ${paid} of ${amount} poisha`,
            amountPoisha: amount - paid,
            action: 'Record the supplier payment or adjust paidTotal',
        });
    }

    const noReceipt = !expense.receiptUrl && !hasReceiptAttachment;
    if (noReceipt) {
        out.push({
            kind: 'missing_receipt',
            severity: 'low',
            expenseId: expense._id,
            title: 'Expense without a receipt',
            detail: 'No receipt image or reference is attached',
            amountPoisha: amount,
            action: 'Ask the payer for the bill and upload it',
        });
    }
    return out;
};

/**
 * Classify one money transaction.
 *   tx: { _id, kind, status, amount, fromMember, submittedAt, paidAt }
 * Unconfirmed = still `submitted` after `staleHours` (default 48h).
 */
export const transactionSuggestions = (tx, { now = new Date(), staleHours = 48 } = {}) => {
    if (tx.status !== 'submitted') return [];
    const since = tx.submittedAt || tx.createdAt || null;
    const ageHours = since ? (now.getTime() - new Date(since).getTime()) / 3_600_000 : 0;
    if (ageHours < staleHours) return [];
    return [{
        kind: 'unconfirmed_transaction',
        severity: ageHours >= 7 * 24 ? 'high' : 'medium',
        transactionId: tx._id,
        title: `Unconfirmed ${String(tx.kind || 'money').replace(/_/g, ' ')}`,
        detail: `Submitted ${Math.floor(ageHours / 24)} day(s) ago and still awaiting confirmation`,
        amountPoisha: Number(tx.amount) || 0,
        ageHours: Math.round(ageHours),
        action: 'Confirm or reject the transaction',
    }];
};

/** Merge + rank suggestions: high → medium → low, then larger amounts first. */
export const rankSuggestions = (suggestions = []) => {
    const order = { high: 0, medium: 1, low: 2 };
    return [...suggestions].sort((a, b) => {
        const bySeverity = (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
        if (bySeverity !== 0) return bySeverity;
        return (Number(b.amountPoisha) || 0) - (Number(a.amountPoisha) || 0);
    });
};

/** Summary block for the panel header. */
export const summarizeSuggestions = (suggestions = []) => {
    const byKind = { unconfirmed_transaction: 0, underpaid_expense: 0, missing_receipt: 0 };
    for (const s of suggestions) if (s.kind in byKind) byKind[s.kind] += 1;
    return {
        total: suggestions.length,
        byKind,
        bySeverity: {
            high: suggestions.filter(s => s.severity === 'high').length,
            medium: suggestions.filter(s => s.severity === 'medium').length,
            low: suggestions.filter(s => s.severity === 'low').length,
        },
        atRiskPoisha: suggestions
            .filter(s => s.kind !== 'missing_receipt')
            .reduce((sum, s) => sum + (Number(s.amountPoisha) || 0), 0),
    };
};
