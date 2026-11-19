import Journal from '../models/Journal.js';
import { sumPoisha } from '../utils/money.js';

// Ledger service — the only code allowed to write Journal documents.
// Journals are immutable: posting and reversing only.

/**
 * Post a balanced journal entry. Throws if debits !== credits.
 * lines: [{ accountType, memberId?, accountId?, clearingName?, direction, amount, memo? }]
 * amount in integer poisha (strictly positive; direction encodes the sign).
 */
export const postJournal = async ({
    groupId, sourceType, sourceId, sourceRevision = 0, postingKind = 'original',
    reversalOf = null, costPeriod = null, lines, postedBy, memo = '', session = null,
}) => {
    if (!lines || lines.length < 2) throw Object.assign(new Error('Journal needs at least 2 lines'), { status: 422 });

    const debits = sumPoisha(lines.filter(l => l.direction === 'debit').map(l => l.amount));
    const credits = sumPoisha(lines.filter(l => l.direction === 'credit').map(l => l.amount));
    if (debits !== credits) {
        throw Object.assign(new Error(`Unbalanced journal: debits ${debits} != credits ${credits}`), { status: 422 });
    }
    if (debits === 0) throw Object.assign(new Error('Journal has zero value'), { status: 422 });

    try {
        const docs = await Journal.create([{
            groupId, sourceType, sourceId, sourceRevision, postingKind,
            reversalOf, costPeriod, lines, postedBy, memo,
        }], session ? { session } : {});
        return docs[0];
    } catch (err) {
        if (err.code === 11000) {
            // exactly-once posting — return the existing entry instead of failing
            const q = Journal.findOne({ groupId, sourceType, sourceId, sourceRevision, postingKind });
            if (session) q.session(session);
            const existing = await q;
            if (existing) return existing;
        }
        throw err;
    }
};

/**
 * Post an exact mirror-image reversal of an existing journal (once only).
 */
export const reverseJournal = async ({ journal, reason, postedBy, session = null }) => {
    const q = Journal.findOne({ groupId: journal.groupId, reversalOf: journal._id, postingKind: 'reversal' });
    if (session) q.session(session);
    const existing = await q;
    if (existing) return existing; // idempotent

    return postJournal({
        groupId: journal.groupId,
        sourceType: 'reversal',
        sourceId: journal._id,
        postingKind: 'reversal',
        reversalOf: journal._id,
        costPeriod: journal.costPeriod,
        postedBy,
        memo: reason ? `Reversal: ${reason}` : 'Reversal',
        lines: journal.lines.map(l => ({
            ...l.toObject(),
            direction: l.direction === 'debit' ? 'credit' : 'debit',
        })),
        session,
    });
};

/**
 * Compute a member's control-account balance in poisha from confirmed journals.
 * Credit balance (positive) = the mess owes the member; debit (negative) = member owes.
 * Uses confirmed MoneyTransaction postings (sourceType 'money_transaction').
 * Reversals are netted in because reversal lines are mirrored.
 */
export const getMemberBalance = async ({ groupId, memberId, asOf = null }) => {
    const filter = { groupId, sourceType: 'money_transaction' };
    if (asOf) filter.createdAt = { $lte: asOf };
    const journals = await Journal.find(filter).lean();

    let balance = 0;
    for (const j of journals) {
        for (const line of j.lines) {
            if (line.accountType !== 'member' || String(line.memberId) !== String(memberId)) continue;
            // money INTO the member's control (contribution, personal payment) = credit
            balance += line.direction === 'credit' ? line.amount : -line.amount;
        }
    }
    return balance;
};

/**
 * Compute a fund account's ledger balance in poisha (debits - credits).
 */
export const getFundBalance = async ({ groupId, accountId, asOf = null }) => {
    const filter = { groupId };
    if (asOf) filter.createdAt = { $lte: asOf };
    const journals = await Journal.find(filter).lean();

    let balance = 0;
    for (const j of journals) {
        for (const line of j.lines) {
            if (line.accountType !== 'fund' || String(line.accountId) !== String(accountId)) continue;
            // asset account: debit increases, credit decreases
            balance += line.direction === 'debit' ? line.amount : -line.amount;
        }
    }
    return balance;
};

/**
 * Sum of member closing credits (simple closed-mess accounting identity check):
 * fund assets - supplier payables should equal sum of member credits.
 */
export const getAccountingEquation = async ({ groupId }) => {
    const journals = await Journal.find({ groupId }).lean();
    const memberCredits = new Map();
    let fundAssets = 0;
    const clearing = new Map();

    for (const j of journals) {
        for (const line of j.lines) {
            const signed = line.direction === 'debit' ? line.amount : -line.amount;
            if (line.accountType === 'member') {
                memberCredits.set(String(line.memberId), (memberCredits.get(String(line.memberId)) || 0) - signed);
            } else if (line.accountType === 'fund') {
                fundAssets += signed;
            } else if (line.accountType === 'clearing') {
                clearing.set(line.clearingName, (clearing.get(line.clearingName) || 0) + signed);
            }
        }
    }
    const totalMemberCredits = [...memberCredits.values()].reduce((a, b) => a + b, 0);
    const supplierPayable = -(clearing.get('supplier_payable') || 0);
    return {
        fundAssets,
        supplierPayable,
        totalMemberCredits,
        balanced: fundAssets - supplierPayable === totalMemberCredits,
        clearing: Object.fromEntries(clearing),
        memberCredits: Object.fromEntries(memberCredits),
    };
};
