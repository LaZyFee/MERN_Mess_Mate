// Excel/CSV expense import rules (S5.7) — pure, no DB, no file parsing.
// Pipeline: rows (from .xlsx or .csv) → normalize → validate → map to an expense
// payload → diff against existing expenses (dry-run) → apply only with a fresh
// preview hash. Every amount is integer poisha; money never goes through floats.

import crypto from 'crypto';

export const EXPENSE_IMPORT_COLUMNS = [
    'date', 'supplier', 'description', 'category', 'amount', 'receiptref', 'paidby',
];

/** Fold header spellings to column keys ('Supplier Name' → 'supplier'). */
export const normalizeHeader = (header) => String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Parse "1,250.50" | "৳1250.5" | 125050 (poisha int) → integer poisha, or null. */
export const parsePoisha = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value : Math.round(value * 100);
    }
    const cleaned = String(value).replace(/[৳,\s]/g, '');
    if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
    return Math.round(Number(cleaned) * 100);
};

/** Accept 'YYYY-MM-DD', 'DD/MM/YYYY' and Excel serial day numbers. */
export const parseDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    if (typeof value === 'number' && value > 20000 && value < 80000) {
        // Excel epoch (1899-12-30) serial day
        const ms = Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000;
        return new Date(ms).toISOString().slice(0, 10);
    }
    const s = String(value).trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return validDay(m[1], m[2], m[3]);
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) return validDay(m[3], m[2], m[1]); // Dhaka sheets write dd/mm/yyyy
    return null;
};

const validDay = (y, mo, d) => {
    const date = new Date(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00.000Z`);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
};

/**
 * Validate + map raw rows to expense drafts.
 *   rows: [{ <column>: value, ... }] already keyed by normalised header
 *   categoriesByName: Map<normalisedName, { _id, splitMode }>
 *   memberByLabel: Map<normalisedName, membershipId> (for 'paidBy', optional)
 * Returns { drafts, errors, stats } — drafts carry `_row` and a `payload` ready for POST /expenses.
 */
export const mapRows = ({ rows = [], categoriesByName = new Map(), memberByLabel = new Map(), defaultCategoryId = null }) => {
    const drafts = [];
    const errors = [];
    const seen = new Map();

    rows.forEach((row, index) => {
        const rowNo = index + 2; // +1 for header, +1 for 1-based
        const get = (key) => row[normalizeHeader(key)] ?? row[key];

        const date = parseDate(get('date'));
        const amount = parsePoisha(get('amount'));
        const categoryName = normalizeHeader(get('category'));
        const category = categoryName ? categoriesByName.get(categoryName) : null;

        if (!date) { errors.push({ row: rowNo, field: 'date', msg: 'Missing or invalid date' }); return; }
        if (!amount || amount <= 0) { errors.push({ row: rowNo, field: 'amount', msg: 'Amount must be a positive number' }); return; }

        const categoryId = category?._id || (categoryName ? null : defaultCategoryId);
        if (!categoryId) { errors.push({ row: rowNo, field: 'category', msg: `Unknown category "${get('category') || ''}"` }); return; }

        const paidBy = get('paidBy') || get('paidby') || get('paid by');
        let payers = [];
        if (paidBy) {
            const membershipId = memberByLabel.get(normalizeHeader(paidBy));
            if (!membershipId) { errors.push({ row: rowNo, field: 'paidBy', msg: `Unknown payer "${paidBy}"` }); return; }
            payers = [{ memberId: membershipId, amount }];
        }

        const supplier = String(get('supplier') || '').trim().slice(0, 100);
        const description = String(get('description') || get('supplier') || '').trim().slice(0, 200);
        const receiptReference = String(get('receiptReference') || get('receiptRef') || '').trim().slice(0, 100);

        const fingerprint = `${date}|${amount}|${normalizeHeader(supplier)}|${normalizeHeader(receiptReference)}`;
        if (seen.has(fingerprint)) {
            errors.push({ row: rowNo, field: 'duplicate', msg: `Identical to row ${seen.get(fingerprint)}` });
            return;
        }
        seen.set(fingerprint, rowNo);

        drafts.push({
            _row: rowNo,
            _fingerprint: fingerprint,
            payload: {
                date,
                supplierName: supplier,
                description,
                costPeriod: date.slice(0, 7),
                isPayable: false,
                receiptReference,
                payers,
                lines: [{ categoryId, amount, description, splitMode: category?.splitMode || null }],
            },
        });
    });

    const total = drafts.reduce((s, d) => s + d.payload.lines[0].amount, 0);
    const months = [...new Set(drafts.map(d => d.payload.costPeriod))].sort();
    return {
        drafts,
        errors,
        stats: { rows: rows.length, valid: drafts.length, invalid: errors.length, totalPoisha: total, months },
    };
};

/**
 * Diff the drafts against existing expenses (from GET /expenses for the same months).
 * A row is considered already imported when date+amount+supplier+receipt match.
 * Returns { toCreate, duplicates, conflicts } — apply only `toCreate`.
 */
export const diffAgainstExisting = (drafts = [], existingExpenses = []) => {
    const existingKeys = new Set(existingExpenses.map(e => [
        e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date || '').slice(0, 10),
        Number(e.amount) || 0,
        normalizeHeader(e.supplierName),
        normalizeHeader(e.receiptReference),
    ].join('|')));

    const toCreate = [];
    const duplicates = [];
    for (const draft of drafts) {
        const key = `${draft.payload.date}|${draft.payload.lines[0].amount}|${normalizeHeader(draft.payload.supplierName)}|${normalizeHeader(draft.payload.receiptReference)}`;
        if (existingKeys.has(key)) duplicates.push({ row: draft._row, key });
        else toCreate.push(draft);
    }
    return { toCreate, duplicates, toCreateCount: toCreate.length };
};

/** Stable hash of the preview so apply can prove the diff the user approved is unchanged. */
export const previewHash = (drafts = []) => crypto.createHash('sha256')
    .update(JSON.stringify(drafts.map(d => d._fingerprint).sort()))
    .digest('hex');
