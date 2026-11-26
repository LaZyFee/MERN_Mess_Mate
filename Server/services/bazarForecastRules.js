// Bazar budget forecast rules (S5.1) — pure functions, no DB access.
//
// Idea: what will the next N days of bazar cost? Two inputs we already have:
//   1. headcount: portions per day (member meals + universal guest meals)
//   2. history: approved food expenses per category over the trailing window
// Rule: price per portion = median(categoryTotal / unitsTouched) over the window,
// scaled by the forecast portions, with a confidence band from the quartiles.
// Integer poisha only; medians of even-length samples average the two middle
// values with Math.round (documented, deterministic).

export const DEFAULT_FORECAST_DAYS = 7;
export const DEFAULT_HISTORY_DAYS = 30;
export const MAX_FORECAST_DAYS = 60;

export const clampDays = (days, def = DEFAULT_FORECAST_DAYS, max = MAX_FORECAST_DAYS) => {
    const n = Number(days);
    if (!Number.isFinite(n)) return def;
    return Math.min(Math.max(1, Math.round(n)), max);
};

/** Median of a numeric sample. Empty → null. */
export const median = (values = []) => {
    const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/** Linear-interpolated quantile (0..1). Empty → null. */
export const quantile = (values = [], q = 0.5) => {
    const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const pos = Math.min(Math.max(0, q), 1) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
};

/**
 * Daily cost per portion for one category.
 * `samples` = [{ units, amount }] for days/months where the category was bought.
 * Returns integer poisha per 1000 subunits (one "portion"), or null with no data.
 */
export const costPerPortion = (samples = []) => {
    const rates = samples
        .filter(s => Number(s.units) > 0 && Number(s.amount) >= 0)
        .map(s => Math.round((Number(s.amount) * 1000) / Number(s.units)));
    return median(rates);
};

/**
 * Full forecast.
 *   headcount: { breakfast, lunch, snacks, dinner } in subunit totals for ONE day
 *   history:   [{ categoryId, name, units, amount }] per purchase window sample
 *   days:      forecast horizon
 * Returns per-category { pricePerPortion, expected, low, high } and a total band.
 */
export const buildBazarForecast = ({ headcount = {}, history = [], days = DEFAULT_FORECAST_DAYS }) => {
    const horizon = clampDays(days);
    const dailyUnits = Object.values(headcount).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const totalUnits = dailyUnits * horizon;

    const byCategory = new Map();
    for (const row of history) {
        const key = String(row.categoryId || 'uncategorized');
        if (!byCategory.has(key)) byCategory.set(key, { categoryId: row.categoryId || null, name: row.name || 'Uncategorized', samples: [] });
        byCategory.get(key).samples.push({ units: row.units, amount: row.amount });
    }

    const categories = [];
    let expectedTotal = 0;
    let lowTotal = 0;
    let highTotal = 0;

    for (const [, cat] of byCategory) {
        const rates = cat.samples
            .filter(s => Number(s.units) > 0 && Number(s.amount) >= 0)
            .map(s => Math.round((Number(s.amount) * 1000) / Number(s.units)));
        const price = median(rates);
        if (price === null) continue;
        const share = dailyUnits > 0 ? totalUnits : 0;
        const expected = Math.round((price * share) / 1000);
        const low = share > 0 ? Math.round((quantile(rates, 0.25) * share) / 1000) : 0;
        const high = share > 0 ? Math.round((quantile(rates, 0.75) * share) / 1000) : 0;
        categories.push({
            categoryId: cat.categoryId,
            name: cat.name,
            pricePerPortionPoisha: price,
            samples: rates.length,
            expectedPoisha: expected,
            lowPoisha: low,
            highPoisha: high,
        });
        expectedTotal += expected;
        lowTotal += low;
        highTotal += high;
    }

    // A group with no approved food expenses gets an explicit "insufficient data".
    const confidence = categories.length === 0 ? 'none'
        : categories.every(c => c.samples >= 7) ? 'high'
            : categories.every(c => c.samples >= 3) ? 'medium' : 'low';

    return {
        days: horizon,
        dailyUnits,
        totalUnits,
        categories: categories.sort((a, b) => b.expectedPoisha - a.expectedPoisha),
        expectedPoisha: expectedTotal,
        band: { lowPoisha: lowTotal, highPoisha: highTotal },
        confidence,
        insufficientData: categories.length === 0,
    };
};

/** Open/close a forecast window (trailing N days) for the query layer. */
export const historyWindow = ({ now = new Date(), days = DEFAULT_HISTORY_DAYS }) => {
    const to = new Date(now);
    const from = new Date(now.getTime() - days * 86400_000);
    return { from, to, days };
};
