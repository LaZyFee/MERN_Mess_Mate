import Expense from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Membership from '../models/Membership.js';
import { audit } from '../models/AuditEvent.js';
import { ensureOpen } from '../services/periodService.js';
import { normalizeHeader, mapRows, diffAgainstExisting, previewHash } from '../services/expenseImportRules.js';
import { parseImportFile } from '../services/expenseImportFile.js';

// Excel/CSV expense import (S5.7): upload → preview (validate + dry-run diff) →
// apply. Apply re-runs the preview and refuses when the hash no longer matches the
// approved one, so a row added by someone else in between is never silently skipped.
// Imported rows land as `draft` expenses — approval stays a separate human step.

const loadContext = async ({ groupId }) => {
    const [categories, memberships] = await Promise.all([
        ExpenseCategory.find({ groupId, isArchived: false }).select('name splitMode').lean(),
        Membership.find({ groupId }).select('displayName role').lean(),
    ]);
    const categoriesByName = new Map(categories.map(c => [normalizeHeader(c.name), c]));
    const memberByLabel = new Map();
    for (const m of memberships) {
        const id = String(m._id);
        memberByLabel.set(normalizeHeader(m.displayName), id);
        memberByLabel.set(normalizeHeader(id), id);
    }
    return { categoriesByName, memberByLabel };
};

const loadFileRows = async (req) => {
    let buffer; let originalname; let mimetype;
    if (req.file) {
        ({ buffer, originalname, mimetype } = req.file);
    } else {
        const { rows } = req.body || {};
        if (!Array.isArray(rows) || !rows.length) {
            throw Object.assign(new Error('Upload a .xlsx/.csv file (field "file") or send rows[]'), { status: 422 });
        }
        if (rows.length > 2000) throw Object.assign(new Error('At most 2000 rows per import'), { status: 422 });
        return { rows, source: 'json' };
    }
    return { rows: await parseImportFile({ buffer, originalname, mimetype }), source: 'file' };
};

const buildPreview = async ({ groupId, rows }) => {
    const ctx = await loadContext({ groupId });
    const defaultCategory = [...ctx.categoriesByName.values()].find(c => c.splitMode === 'meal_units')
        || [...ctx.categoriesByName.values()][0] || null;
    const mapped = mapRows({ ...ctx, rows, defaultCategoryId: defaultCategory?._id || null });

    const months = mapped.stats.months;
    const existing = months.length
        ? await Expense.find({ groupId, costPeriod: { $in: months } })
            .select('date amount supplierName receiptReference').lean()
        : [];
    const diff = diffAgainstExisting(mapped.drafts, existing);
    return {
        errors: mapped.errors,
        stats: mapped.stats,
        toCreate: diff.toCreate.map(d => ({ row: d._row, ...d.payload, amountPoisha: d.payload.lines[0].amount })),
        duplicates: diff.duplicates,
        previewHash: previewHash(mapped.drafts),
        _drafts: mapped.drafts,
    };
};

const publicPreview = (preview) => {
    const { _drafts, ...rest } = preview;
    return rest;
};

/** POST /api/expenses/groups/:groupId/import/preview — multipart "file" or JSON { rows } */
export const previewExpenseImport = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { rows } = await loadFileRows(req);
        const preview = await buildPreview({ groupId, rows });
        res.json({ msg: 'Preview ready — nothing was written', source: req.file ? 'file' : 'rows', ...publicPreview(preview) });
    } catch (err) {
        if (err.status === 422) return res.status(422).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/expenses/groups/:groupId/import/apply — { previewHash } */
export const applyExpenseImport = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { previewHash: approvedHash } = req.body || {};
        if (!approvedHash) return res.status(422).json({ msg: 'previewHash is required — run preview first' });

        const { rows } = await loadFileRows(req);
        const preview = await buildPreview({ groupId, rows });
        if (preview.previewHash !== approvedHash) {
            return res.status(409).json({ msg: 'The file changed since the preview; re-run the preview', previewHash: preview.previewHash });
        }
        if (!preview.toCreate.length) return res.json({ msg: 'Nothing to import', created: 0, duplicates: preview.duplicates.length });

        for (const draft of preview.toCreate) {
            await ensureOpen({ groupId, month: draft.payload.costPeriod });
        }

        const created = [];
        for (const draft of preview._drafts) {
            if (!preview.toCreate.some(c => c.row === draft._row)) continue;
            const p = draft.payload;
            const expense = await Expense.create({
                groupId, createdBy: req.user.id, status: 'draft',
                supplierName: p.supplierName, description: p.description,
                date: new Date(p.date), costPeriod: p.costPeriod, month: p.costPeriod,
                amount: p.lines[0].amount, lines: p.lines, payers: p.payers,
                isPayable: false, paidTotal: 0, receiptReference: p.receiptReference,
                categoryId: p.lines[0].categoryId, // legacy back-compat
            });
            created.push({ row: draft._row, expenseId: expense._id });
        }

        await audit({
            groupId, actorId: req.user.id, action: 'expense.import_applied', targetType: 'expense',
            after: { created: created.length, duplicates: preview.duplicates.length, totalPoisha: preview.stats.totalPoisha },
        });
        res.status(201).json({ msg: `Imported ${created.length} draft expense(s)`, created: created.length, duplicates: preview.duplicates.length, rows: created });
    } catch (err) {
        if ([409, 422].includes(err.status)) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};
