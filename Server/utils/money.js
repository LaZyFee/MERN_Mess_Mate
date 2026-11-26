// Integer-poisha money utilities. 100 poisha = BDT 1.
// All financial math in the ledger uses these — never raw floats.
// API inputs are canonical decimal STRINGS with at most 2 decimal places;
// they are parsed here exactly (no binary float multiplication anywhere).

export const POISHA_PER_TAKA = 100;

/** Validate + parse a decimal string like "1234.50" into integer poisha. */
export const parsePoisha = (input) => {
    if (typeof input !== 'string' && typeof input !== 'number') return null;
    const s = String(input).trim();
    // canonical: optional sign, digits, optional .d (1-2 digits) — no exponents
    if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
    const neg = s.startsWith('-');
    const body = neg ? s.slice(1) : s;
    const [taka, poisha = ''] = body.split('.');
    const p = poisha.length === 1 ? poisha + '0' : poisha;
    const value = Number(taka) * POISHA_PER_TAKA + Number(p || 0);
    if (!Number.isSafeInteger(value)) return null;
    return neg ? -value : value;
};

/** Format integer poisha back to a canonical decimal string ("1234.50"). */
export const toDecimalString = (poisha) => {
    if (!Number.isSafeInteger(poisha)) throw new Error('toDecimalString: not an integer poisha amount');
    const sign = poisha < 0 ? '-' : '';
    const abs = Math.abs(poisha);
    return `${sign}${Math.floor(abs / POISHA_PER_TAKA)}.${String(abs % POISHA_PER_TAKA).padStart(2, '0')}`;
};

/**
 * Response-boundary bridge for LEGACY takas values (S3.8).
 * The legacy summary/payment-note controllers compute in takas (floats); this
 * rounds a taka amount to integer poisha and renders the canonical string, so
 * the wire format never carries a raw float. Returns null when not a number.
 * Do NOT use this for ledger figures — those are already integer poisha.
 */
export const legacyTakaToDecimalString = (taka) => {
    if (taka === null || taka === undefined || !Number.isFinite(Number(taka))) return null;
    return toDecimalString(Math.round(Number(taka) * POISHA_PER_TAKA));
};

/** Sum a list of integer poisha amounts (exact). */
export const sumPoisha = (list) => {
    let t = 0;
    for (const n of list) {
        if (!Number.isSafeInteger(n)) throw new Error('sumPoisha: non-integer amount');
        t += n;
    }
    return t;
};

/**
 * Largest-remainder allocation of `total` poisha across `weights`.
 * Deterministic: ties broken by ascending index. Returns array of integer
 * poisha whose sum is exactly `total`.
 * weights: array of non-negative integers (weight units may be any scale, e.g.
 * meal subunits or integer weights). Zero total weight → returns all zeros.
 */
export const allocateByWeights = (total, weights) => {
    if (!Number.isSafeInteger(total)) throw new Error('allocateByWeights: total not integer');
    const n = weights.length;
    const out = new Array(n).fill(0);
    const wSum = weights.reduce((a, b) => a + b, 0);
    if (!Number.isSafeInteger(wSum) || wSum <= 0) return out;

    let allocated = 0;
    const remainders = [];
    for (let i = 0; i < n; i++) {
        const exact = (total * weights[i]) / wSum; // rational
        const floor = Math.floor(exact);
        out[i] = floor;
        allocated += floor;
        remainders.push({ index: i, frac: exact - floor });
    }
    let leftover = total - allocated; // 0..n-1 poisha
    remainders.sort((a, b) => b.frac - a.frac || a.index - b.index);
    for (let i = 0; leftover > 0; i = (i + 1) % n) {
        out[remainders[i].index] += 1;
        leftover -= 1;
    }
    return out;
};

/** Equal split with largest-remainder determinism (special case of weights). */
export const allocateEqual = (total, n) => allocateByWeights(total, new Array(n).fill(1));

/** Validate an allocation sums exactly to its source total. */
export const allocationsBalanced = (allocations, total) =>
    sumPoisha(allocations) === total;
