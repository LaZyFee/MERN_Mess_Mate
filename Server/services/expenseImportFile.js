import ExcelJS from 'exceljs';
import { normalizeHeader } from './expenseImportRules.js';

// Sheet reading for expense import (S5.7). .xlsx via ExcelJS, .csv via a small
// RFC-4180 reader. Returns [{ <normalised header>: value }] — no validation here.

const MAX_ROWS = 2000;

const csvCell = (text, index) => {
    let out = '';
    let inQuotes = false;
    for (let i = index; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') { out += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else out += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') return { value: out, next: i + 1 };
        else if (ch === '\n') return { value: out, next: i };
        else if (ch !== '\r') out += ch;
    }
    return { value: out, next: text.length };
};

export const parseCsv = (text) => {
    const rows = [];
    let i = 0;
    while (i < text.length && rows.length < MAX_ROWS + 1) {
        const cells = [];
        let done = false;
        while (!done) {
            const cell = csvCell(text, i);
            cells.push(cell.value);
            i = cell.next;
            if (i >= text.length || text[i] === '\n') { done = true; i++; }
        }
        if (cells.some(c => c.trim() !== '')) rows.push(cells);
    }
    if (!rows.length) return [];
    const header = rows[0].map(h => normalizeHeader(h.replace(/^\uFEFF/, '')));
    return rows.slice(1).map(cells => Object.fromEntries(header.map((h, idx) => [h, cells[idx] ?? ''])));
};

const cellValue = (cell) => {
    const v = cell?.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        if (v.richText) return v.richText.map(t => t.text).join('');
        if (v.text !== undefined) return v.text;      // hyperlink
        if (v.result !== undefined) return v.result;   // formula
        if (v instanceof Date) return v;
    }
    return v;
};

export const parseXlsx = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const headerRow = sheet.getRow(1);
    const header = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, col) => { header[col] = normalizeHeader(cellValue(cell)); });
    const rows = [];
    for (let r = 2; r <= sheet.rowCount && rows.length < MAX_ROWS; r++) {
        const row = sheet.getRow(r);
        const obj = {};
        let empty = true;
        header.forEach((key, col) => {
            if (!key) return;
            const value = cellValue(row.getCell(col));
            if (value !== '' && value !== null && value !== undefined) empty = false;
            obj[key] = value;
        });
        if (!empty) rows.push(obj);
    }
    return rows;
};

/** Dispatch by extension/mimetype. Rejects anything that is not xlsx/csv. */
export const parseImportFile = async ({ buffer, originalname = '', mimetype = '' }) => {
    const name = String(originalname).toLowerCase();
    if (name.endsWith('.csv') || mimetype === 'text/csv') return parseCsv(buffer.toString('utf8'));
    if (name.endsWith('.xlsx') || mimetype.includes('spreadsheetml')) return parseXlsx(buffer);
    throw Object.assign(new Error('Only .xlsx and .csv files are supported'), { status: 422 });
};
