// Budget variance rules (S5.2) — pure, no DB. All amounts integer poisha.

/**
 * Merge planned budgets with actual approved spend.
 *   budgets: [{ categoryId, amountPoisha }]  (categoryId null = group total)
 *   actualByCategory: Map<string, number>    ('__total__' = everything)
 * Returns per-line usage with a status and the remaining amount.
 */
export const computeVariance = ({ budgets = [], actualByCategory = new Map() }) => {
    const lines = budgets.map(b => {
        const key = b.categoryId ? String(b.categoryId) : '__total__';
        const actual = Number(actualByCategory.get(key) || 0);
        const planned = Number(b.amountPoisha) || 0;
        const remaining = planned - actual;
        const usedPct = planned > 0 ? Math.round((actual * 100) / planned) : (actual > 0 ? 100 : 0);
        return {
            categoryId: b.categoryId || null,
            amountPoisha: planned,
            actualPoisha: actual,
            remainingPoisha: remaining,
            usedPct,
            status: planned === 0 && actual > 0 ? 'over'
                : usedPct >= 100 ? 'over'
                    : usedPct >= 80 ? 'near'
                        : 'on_track',
        };
    });
    const plannedTotal = lines.reduce((s, l) => s + l.amountPoisha, 0);
    const actualTotal = lines.reduce((s, l) => s + l.actualPoisha, 0);
    return {
        lines,
        plannedTotalPoisha: plannedTotal,
        actualTotalPoisha: actualTotal,
        remainingTotalPoisha: plannedTotal - actualTotal,
        usedPctTotal: plannedTotal > 0 ? Math.round((actualTotal * 100) / plannedTotal) : 0,
        overBudget: lines.some(l => l.status === 'over'),
    };
};

/** Sum approved expense lines into a category map (and the grand total). */
export const actualSpendByCategory = (expenses = []) => {
    const map = new Map();
    for (const expense of expenses) {
        const lines = expense.lines?.length
            ? expense.lines
            : [{ categoryId: expense.categoryId || null, amount: expense.amount }];
        for (const line of lines) {
            const amount = Number(line.amount) || 0;
            const key = line.categoryId ? String(line.categoryId) : '__total__';
            if (key !== '__total__') map.set(key, (map.get(key) || 0) + amount);
            map.set('__total__', (map.get('__total__') || 0) + amount);
        }
    }
    return map;
};
