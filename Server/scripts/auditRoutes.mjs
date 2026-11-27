// Route <-> documentation audit: compare documented endpoints in
// Server/docs/API_DOCUMENTATION.md against the actual Express router table.
// Run from Server/:  node scripts/auditRoutes.mjs
// Exits non-zero when the doc and the routers disagree.
import fs from 'node:fs';
import path from 'node:path';

const doc = fs.readFileSync(path.join('docs', 'API_DOCUMENTATION.md'), 'utf8');
const documented = new Set();
// Endpoints appear as markdown headings (`### GET `/api/...`` / `#### ...`) or inline in tables.
for (const m of doc.matchAll(/^#{3,4} (GET|POST|PUT|PATCH|DELETE) `([^`]+)`/gm)) {
    documented.add(`${m[1]} ${m[2]}`);
}
for (const m of doc.matchAll(/`(GET|POST|PUT|PATCH|DELETE) (\/api\/[A-Za-z0-9_\-\/:]+)`/g)) {
    documented.add(`${m[1]} ${m[2]}`);
}
// Generated route table rows: | `GET` | `/api/path` |
for (const m of doc.matchAll(/\|\s*`(GET|POST|PUT|PATCH|DELETE)`\s*\|\s*`(\/api\/[^`]+)`\s*\|/g)) {
    documented.add(`${m[1]} ${m[2]}`);
}

const fileToMount = (name) => ({
    totpRoutes: '/api/users', userRoutes: '/api/users',
    adminRoutes: '/api/admin', supportAdminRoutes: '/api/admin/support',
    messGroupRoutes: '/api/messgroups', mealRoutes: '/api/meals', expenseRoutes: '/api/expenses',
    summaryRoutes: '/api/summary', statsRoutes: '/api/stats', membershipRoutes: '/api/memberships',
    policyRoutes: '/api/policies', periodRoutes: '/api/periods', moneyRoutes: '/api/money',
    statementRoutes: '/api/statements', recurringRoutes: '/api/recurring',
    reconciliationRoutes: '/api/reconciliation', disputeRoutes: '/api/disputes',
    notificationRoutes: '/api/notifications', sessionRoutes: '/api/sessions',
    attachmentRoutes: '/api/attachments', depositAssetRoutes: '/api/assets', inboxRoutes: '/api/inbox',
    supportRoutes: '/api/support', routinesRoutes: '/api/routines', shoppingListRoutes: '/api/shopping-list',
    kitchenInventoryRoutes: '/api/kitchen-inventory', pollRoutes: '/api/polls', inviteRoutes: '/api/invite',
    healthRoutes: '/api/health',
    budgetRoutes: '/api/budgets',
})[name];

const routeDir = path.resolve('routes');
const actual = new Set();
for (const file of fs.readdirSync(routeDir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(routeDir, file), 'utf8');
    // routes declare their own `router`; identify the router by mount key from the filename
    const fileName = file.replace(/\.js$/, '');
    const mount = fileToMount(fileName);
    if (!mount) { console.log('!! no mount for', file); continue; }
    for (const m of src.matchAll(/(?:router|expenseRouter)\.(get|post|put|patch|delete)\(\s*\n?\s*'([^']+)'/g)) {
        const p = m[2] === '/' ? '' : m[2];
        actual.add(`${m[1].toUpperCase()} ${mount}${p}`);
    }
}

const missingInDoc = [...actual].filter(a => !documented.has(a)).sort();
const missingInCode = [...documented].filter(d => !actual.has(d)).sort();

console.log('ACTUAL:', actual.size, 'DOCUMENTED:', documented.size);
console.log('\n--- IN CODE, NOT DOCUMENTED (' + missingInDoc.length + ') ---');
missingInDoc.forEach(x => console.log('  ', x));
console.log('\n--- IN DOC, NOT IN CODE (' + missingInCode.length + ') ---');
missingInCode.forEach(x => console.log('  ', x));
if (missingInDoc.length || missingInCode.length) process.exitCode = 1;

// ---------------------------------------------------------------------------
// `--write-table`: regenerate the machine-checked part of the API reference.
// Prose is never touched: only the generated block between the markers below is
// replaced. Section numbering mirrors the doc's grouping prefixes (§7.x).
//   node scripts/auditRoutes.mjs --write-table        (rewrite in place)
//   node scripts/auditRoutes.mjs --write-table --check (fail if stale)
// ---------------------------------------------------------------------------
const BEGIN = '<!-- BEGIN:generated:routes -->';
const END = '<!-- END:generated:routes -->';

const SECTION_ORDER = [
    ['/api/health', 'Health probe (unauthenticated)'],
    ['/api/users', 'Authentication, users & 2FA'],
    ['/api/admin/support', 'Admin support desk'],
    ['/api/admin', 'Platform administration (hidden)'],
    ['/api/messgroups', 'Mess groups, join codes, categories & extras'],
    ['/api/meals', 'Meals & guest meals'],
    ['/api/expenses', 'Expenses (V2) & legacy entries'],
    ['/api/summary', 'Legacy monthly summary'],
    ['/api/stats', 'Statistics'],
    ['/api/memberships', 'Memberships'],
    ['/api/policies', 'Policy versions'],
    ['/api/periods', 'Periods'],
    ['/api/money', 'Money & funds'],
    ['/api/statements', 'Statements'],
    ['/api/recurring', 'Recurring rules'],
    ['/api/reconciliation', 'Reconciliation'],
    ['/api/disputes', 'Disputes'],
    ['/api/notifications', 'Notifications & outbox'],
    ['/api/sessions', 'Sessions'],
    ['/api/attachments', 'Attachments'],
    ['/api/assets', 'Deposit assets'],
    ['/api/inbox', 'Inbox'],
    ['/api/support', 'Support tickets'],
    ['/api/routines', 'Routines, board, duties'],
    ['/api/shopping-list', 'Shopping list'],
    ['/api/kitchen-inventory', 'Kitchen inventory'],
    ['/api/polls', 'Polls'],
    ['/api/budgets', 'Budgets'],
    ['/api/invite', 'Invite codes'],
];

const sectionFor = (route) => {
    const [method, path] = route.split(' ');
    // longest prefix wins so /api/admin/support never lands in /api/admin
    const prefix = [...SECTION_ORDER]
        .map(([p]) => p)
        .filter(p => path.startsWith(p))
        .sort((a, b) => b.length - a.length)[0] || '/api';
    return { method, path, title: SECTION_ORDER.find(([p]) => p === prefix)?.[1] || 'Other' };
};

const buildGeneratedBlock = () => {
    const rows = [...actual].sort().map(sectionFor);
    const groups = new Map();
    for (const r of rows) {
        if (!groups.has(r.title)) groups.set(r.title, []);
        groups.get(r.title).push(r);
    }
    const lines = [BEGIN, '', `<!-- generated from routes/ by scripts/auditRoutes.mjs — ${actual.size} routes -->`, ''];
    for (const [, title] of SECTION_ORDER) {
        const group = groups.get(title);
        if (!group) continue;
        lines.push(`### ${title}`, '', '| Method | Path |', '|---|---|');
        for (const r of group) lines.push(`| \`${r.method}\` | \`${r.path}\` |`);
        lines.push('');
        groups.delete(title);
    }
    for (const [title, group] of groups) {
        lines.push(`### ${title}`, '', '| Method | Path |', '|---|---|');
        for (const r of group) lines.push(`| \`${r.method}\` | \`${r.path}\` |`);
        lines.push('');
    }
    lines.push(END);
    return lines.join('\n');
};

const writeTableArg = process.argv.includes('--write-table');
const checkOnly = process.argv.includes('--check');
if (writeTableArg) {
    const block = buildGeneratedBlock();
    const hasMarkers = doc.includes(BEGIN) && doc.includes(END);
    let next;
    if (hasMarkers) {
        next = doc.slice(0, doc.indexOf(BEGIN)) + block + doc.slice(doc.indexOf(END) + END.length);
    } else {
        next = `${doc.trimEnd()}\n\n## 11. Generated route table (machine-checked)\n\n${block}\n`;
    }
    if (next === doc) {
        console.log(`route table up to date (${actual.size} routes)`);
    } else if (checkOnly) {
        console.error('route table is STALE — run: node scripts/auditRoutes.mjs --write-table');
        process.exitCode = 1;
    } else {
        fs.writeFileSync(path.join('docs', 'API_DOCUMENTATION.md'), next);
        console.log(`route table written (${actual.size} routes)${hasMarkers ? '' : ' (new §11 section created)'}`);
    }
}
