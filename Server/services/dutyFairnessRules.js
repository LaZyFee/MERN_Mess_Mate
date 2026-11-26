// Duty fairness rules (S5.4) — pure functions, no DB access.
// Duties are not equal work: a bazar run or a full-day cooking shift costs more
// than wiping the table. Each taskKey carries a weight in "duty units"; a member's
// rolling share is their weighted completed units over the group total, and the
// Gini coefficient measures how unevenly those units are spread (0 = equal).

export const DEFAULT_TASK_WEIGHTS = {
    bazar: 3,
    cooking: 3,
    cleaning: 1,
    dishwashing: 1,
    'cleaning:kitchen': 1,
    'cleaning:dining': 1,
    'cleaning:bathroom': 2,
    default: 1,
};

/** Weight for a taskKey: exact match → prefix match ('cooking:lunch') → default. */
export const taskWeight = (taskKey, weights = DEFAULT_TASK_WEIGHTS) => {
    const key = String(taskKey || '').trim().toLowerCase();
    if (!key) return weights.default ?? 1;
    if (weights[key] !== undefined) return weights[key];
    const prefix = key.split(':')[0];
    if (weights[prefix] !== undefined) return weights[prefix];
    return weights.default ?? 1;
};

/** Weighted units a member earned: done duties count, missed count 0, others 0 (not completed). */
export const weightedUnits = (duties = [], weights = DEFAULT_TASK_WEIGHTS) => {
    let units = 0;
    for (const duty of duties) {
        if (duty.status !== 'done') continue;
        units += taskWeight(duty.taskKey, weights);
    }
    return units;
};

/** Gini coefficient of a non-negative number array (0 = perfectly equal, →1 = one holds all). */
export const giniCoefficient = (values = []) => {
    const xs = values.map(v => Number(v) || 0);
    const n = xs.length;
    if (n === 0) return 0;
    const sorted = [...xs].sort((a, b) => a - b);
    const total = sorted.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let weighted = 0;
    for (let i = 0; i < n; i++) weighted += (i + 1) * sorted[i];
    return Math.max(0, Math.min(1, (2 * weighted) / (n * total) - (n + 1) / n));
};

/**
 * Build the fairness board rows.
 *   members: [{ membershipId, displayName, role }]
 *   duties:  [{ membershipId, taskKey, status }]
 * Returns { rows, totalUnits, fairness }
 *   rows[].sharePct  — percentage of the group's weighted units (0 when total 0)
 *   rows[].fairSharePct — 100 / activeMembers (the equal split)
 *   rows[].balance   — sharePct − fairSharePct (negative = carries less than their share)
 */
export const buildFairnessBoard = ({ members = [], duties = [], weights = DEFAULT_TASK_WEIGHTS }) => {
    const byMember = new Map(members.map(m => [String(m.membershipId), []]));
    for (const duty of duties) {
        const key = String(duty.membershipId);
        if (!byMember.has(key)) continue; // duty for a departed membership
        byMember.get(key).push(duty);
    }

    const unitById = new Map();
    for (const [id, list] of byMember) unitById.set(id, weightedUnits(list, weights));
    const totalUnits = [...unitById.values()].reduce((s, v) => s + v, 0);
    const activeCount = [...unitById.values()].filter(v => v > 0).length || members.length;
    const fairSharePct = members.length ? 100 / members.length : 0;

    const rows = members.map(m => {
        const id = String(m.membershipId);
        const list = byMember.get(id) || [];
        const units = unitById.get(id) || 0;
        const sharePct = totalUnits > 0 ? (units * 100) / totalUnits : 0;
        return {
            membershipId: m.membershipId,
            displayName: m.displayName,
            role: m.role,
            total: list.length,
            done: list.filter(d => d.status === 'done').length,
            missed: list.filter(d => d.status === 'missed').length,
            scheduled: list.filter(d => d.status === 'scheduled').length,
            swapped: list.filter(d => d.status === 'swapped').length,
            skipped: list.filter(d => d.status === 'skipped').length,
            bazarCount: list.filter(d => d.taskKey === 'bazar' && d.status === 'done').length,
            cleaningCount: list.filter(d => String(d.taskKey).startsWith('cleaning') && d.status === 'done').length,
            cookingCount: list.filter(d => String(d.taskKey).startsWith('cooking') && d.status === 'done').length,
            weightedUnits: units,
            sharePct: Math.round(sharePct * 10) / 10,
            fairSharePct: Math.round(fairSharePct * 10) / 10,
            balance: Math.round((sharePct - fairSharePct) * 10) / 10,
        };
    });

    rows.sort((a, b) => b.weightedUnits - a.weightedUnits || b.done - a.done);

    const values = rows.map(r => r.weightedUnits);
    return {
        rows,
        totalUnits,
        activeMembers: activeCount,
        fairness: {
            gini: Math.round(giniCoefficient(values) * 1000) / 1000,
            level: ratioLevel(giniCoefficient(values)),
            mostLoaded: rows[0]?.displayName || null,
            leastLoaded: rows[rows.length - 1]?.displayName || null,
        },
    };
};

/** Coarse label for UI badges. */
export const ratioLevel = (gini) => {
    const g = Number(gini) || 0;
    if (g < 0.1) return 'balanced';
    if (g < 0.25) return 'slightly_uneven';
    if (g < 0.45) return 'uneven';
    return 'very_uneven';
};
