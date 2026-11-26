import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { toDecimalString } from '../utils/money.js';

// Export service (S3.7) — PDF/Excel for the legacy mess sheet.
// All money formatting goes through toDecimalString(poisha) so exports cannot
// drift from the stored integer values with float maths.



/**
 * Pure aggregation of the legacy group sheet: per-member meals + paid costs and
 * the derived meal rate. Amounts stay in poisha (integers) wherever possible.
 * `members` = [{ id, user }] where id is the legacy member row id used by entries.
 */
export const computeLegacyTotals = (members, { entries = [], extras = [] } = {}) => {
    const totals = members.map(m => ({ user: m.user, meals: 0, costs: 0 }));
    let totalMeals = 0;
    let totalBazar = 0;

    for (const entry of entries || []) {
        for (const meal of entry.meals || []) {
            const idx = members.findIndex(m => String(m.id) === String(meal.userId));
            if (idx > -1) { totals[idx].meals += Number(meal.count) || 0; totalMeals += Number(meal.count) || 0; }
        }
        for (const cost of entry.costs || []) {
            const idx = members.findIndex(m => String(m.id) === String(cost.userId));
            if (idx > -1) { totals[idx].costs += Number(cost.amount) || 0; totalBazar += Number(cost.amount) || 0; }
        }
    }
    for (const extra of extras || []) totalBazar += Number(extra.amount) || 0;

    const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;
    const summaries = totals.map(t => {
        const mealCost = Math.round(t.meals * mealRate);
        return { user: t.user, meals: t.meals, costs: Math.round(t.costs), mealCost, balance: Math.round(t.costs) - mealCost };
    });
    return { totalMeals, totalBazar, mealRate, totals, summaries };
};

// Legacy members are populated docs ({ user: {_id, username} }) or plain rows.
const memberRows = (group) => (group.members || []).map(m => ({
    id: m.user?._id || m._id || m.user,
    user: m.user?.username || m.username || String(m.user || m._id),
}));

const legacySheet = (group) => computeLegacyTotals(memberRows(group), {
    entries: group.entries || [],
    extras: group.extras || [],
});

/** Poisha → "x.xx" string (no inline /100 in the exporters). */
export const formatRate = (mealRate) => toDecimalString(Math.round(mealRate));

export const writeExcelExport = async ({ group, res }) => {
    const sheet = legacySheet(group);
    const memberOf = (userId) => group.members.find(m => String(m.user?._id || m.user) === String(userId));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Mess Data');
    const headers = [
        'Date',
        ...group.members.map(m => `${m.user?.username} Meals`),
        ...group.members.map(m => `${m.user?.username} Costs`),
    ];
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };

    if ((group.entries || []).length === 0) {
        ws.addRow(['No entries available']);
    } else {
        [...group.entries].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(entry => {
            const row = [new Date(entry.date).toDateString()];
            group.members.forEach(member => {
                const meal = (entry.meals || []).find(m => String(m.userId) === String((member.user?._id || member.user)));
                row.push(meal ? meal.count : '');
            });
            group.members.forEach(member => {
                const cost = (entry.costs || []).find(c => String(c.userId) === String((member.user?._id || member.user)));
                row.push(cost ? toDecimalString(Math.round(Number(cost.amount) || 0)) : '');
            });
            ws.addRow(row);
        });
    }

    ws.addRow([]);
    ws.addRow(['TOTAL MEALS', sheet.totalMeals]);
    ws.addRow(['TOTAL BAZAR', toDecimalString(Math.round(sheet.totalBazar))]);
    ws.addRow(['MEAL RATE', formatRate(sheet.mealRate)]);
    ws.addRow([]);
    ws.addRow(['Member', 'Meals', 'Costs', 'Meal Cost', 'Balance']);
    sheet.summaries.forEach(s => {
        ws.addRow([s.user, s.meals, toDecimalString(s.costs), toDecimalString(s.mealCost), toDecimalString(s.balance)]);
    });

    res.setHeader('Content-Disposition', 'attachment; filename="mess_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await wb.xlsx.write(res);
    res.end();
    return sheet;
};

export const writePdfExport = async ({ group, res }) => {
    const sheet = legacySheet(group);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="mess_report.pdf"');
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(20).text(group.name, { align: 'center' });
    doc.fontSize(12).text(`Mess Report — generated ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(14).text('Daily Entries', { underline: true });
    doc.moveDown(0.5);
    const entries = [...(group.entries || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (entries.length === 0) {
        doc.fontSize(10).text('No entries recorded.');
    } else {
        entries.forEach(entry => {
            doc.fontSize(10).text(new Date(entry.date).toDateString());
            (entry.meals || []).forEach(m => {
                const mem = memberOf(m.userId);
                doc.text(`   ${mem ? mem.user.username : 'Unknown'}: ${m.count} meals`, { indent: 10 });
            });
            (entry.costs || []).forEach(c => {
                const mem = memberOf(c.userId);
                doc.text(`   ${mem ? mem.user.username : 'Unknown'}: ${toDecimalString(Math.round(Number(c.amount) || 0))} (${c.description || 'cost'})`, { indent: 10 });
            });
            doc.moveDown(0.3);
        });
    }

    doc.addPage();
    doc.fontSize(14).text('Monthly Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Total Meals: ${sheet.totalMeals}`);
    doc.text(`Total Bazar: ${toDecimalString(Math.round(sheet.totalBazar))}`);
    doc.text(`Meal Rate: ${formatRate(sheet.mealRate)}`);
    doc.moveDown();
    doc.fontSize(12).text('Member Balances', { underline: true });
    doc.moveDown(0.3);
    sheet.summaries.forEach(s => {
        doc.fontSize(10).text(
            `${s.user}: meals=${s.meals}, paid=${toDecimalString(s.costs)}, mealCost=${toDecimalString(s.mealCost)}, balance=${toDecimalString(s.balance)} ${s.balance >= 0 ? '(receives)' : '(owes)'}`
        );
    });
    doc.end();
};
