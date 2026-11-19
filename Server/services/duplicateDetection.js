import Expense from '../models/Expense.js';

/**
 * Duplicate expense detection (Doc §6, §16).
 *
 * Warns about likely duplicates based on:
 *  - Same supplier name (case-insensitive) + exact amount within ±3 days.
 *  - Identical receipt reference / invoice number in the group.
 * Does not block creation, but visibly flags the warning.
 */
export const checkDuplicateExpense = async ({ groupId, supplierName, amount, date, receiptReference = '', excludeExpenseId = null }) => {
    const warnings = [];
    const dateObj = new Date(date);
    const windowStart = new Date(dateObj.getTime() - 3 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(dateObj.getTime() + 3 * 24 * 60 * 60 * 1000);

    const baseFilter = {
        groupId,
        status: { $in: ['draft', 'submitted', 'approved'] },
    };
    if (excludeExpenseId) {
        baseFilter._id = { $ne: excludeExpenseId };
    }

    // 1. Check receipt reference duplicate
    if (receiptReference && receiptReference.trim().length > 2) {
        const refMatch = await Expense.findOne({
            ...baseFilter,
            receiptReference: receiptReference.trim(),
        }).select('_id supplierName amount date status receiptReference').lean();

        if (refMatch) {
            warnings.push({
                type: 'exact_receipt_reference',
                reason: `Another expense already has the receipt/invoice reference "${receiptReference}"`,
                matchedExpense: refMatch,
            });
        }
    }

    // 2. Check supplier + exact amount in ±3 days window
    if (supplierName && supplierName.trim().length > 1 && amount > 0) {
        const escapedSupplier = supplierName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const supplierMatch = await Expense.findOne({
            ...baseFilter,
            amount,
            supplierName: { $regex: new RegExp(`^${escapedSupplier}$`, 'i') },
            date: { $gte: windowStart, $lte: windowEnd },
        }).select('_id supplierName amount date status').lean();

        if (supplierMatch) {
            warnings.push({
                type: 'supplier_amount_date_match',
                reason: `Similar purchase from "${supplierName}" for ৳${(amount / 100).toFixed(2)} recorded on ${new Date(supplierMatch.date).toISOString().slice(0, 10)}`,
                matchedExpense: supplierMatch,
            });
        }
    }

    return {
        hasWarnings: warnings.length > 0,
        warnings,
    };
};

