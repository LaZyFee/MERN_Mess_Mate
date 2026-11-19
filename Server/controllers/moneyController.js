import MoneyTransaction from '../models/MoneyTransaction.js';
import FundAccount from '../models/FundAccount.js';
import { postJournal, reverseJournal, getMemberBalance, getFundBalance } from '../services/ledgerService.js';
import Journal from '../models/Journal.js';
import { audit } from '../models/AuditEvent.js';
import { withTransaction } from '../utils/transaction.js';
import { paginateQuery } from '../utils/pagination.js';

// Money endpoints — deposits/contributions, payouts, supplier payments,
// member-to-member settlements, fund transfers, with confirm/reject/reverse.

const assertPoisha = (v) => {
    const n = typeof v === 'string' ? Number(v) : v;
    if (!Number.isSafeInteger(n) || n < 1) {
        throw Object.assign(new Error('Amount must be integer poisha ≥ 1'), { status: 400 });
    }
    return n;
};

/** POST /api/groups/:groupId/money — submit a transaction (status: submitted) */
export const submitTransaction = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const {
            kind, amount, fromMember = null, toMember = null,
            fromAccount = null, toAccount = null, supplierName = '',
            method = 'cash', reference = '', paidAt, evidenceUrl = '',
        } = req.body;

        assertPoisha(amount);

        // sender's own assertion: member contributions submitted by the member are pending
        const tx = await MoneyTransaction.create({
            groupId, kind, amount,
            fromMember, toMember, fromAccount, toAccount,
            supplierName, method, reference,
            paidAt: new Date(paidAt || Date.now()),
            submittedBy: req.user.id,
            status: 'submitted',
            evidenceUrl,
        });

        await audit({ groupId, actorId: req.user.id, action: 'money.submitted', targetType: 'money_transaction', targetId: tx._id, after: { kind, amount } });
        res.status(201).json({ msg: 'Transaction submitted — awaiting confirmation by receiver/treasurer', transaction: tx });
    } catch (err) {
        if (err.status === 400) return res.status(400).json({ msg: err.message });
        next(err);
    }
};

const buildJournalLines = (tx) => {
    // posting conventions per doc §7 table
    const L = (accountType, extra, direction, memo) => ({ accountType, ...extra, direction, amount: tx.amount, memo });
    switch (tx.kind) {
        case 'contribution':
            return [
                L('fund', { accountId: tx.toAccount }, 'debit', 'Contribution into fund'),
                L('member', { memberId: tx.fromMember }, 'credit', 'Member contributed'),
            ];
        case 'payout':
            return [
                L('member', { memberId: tx.toMember }, 'debit', 'Payout to member'),
                L('fund', { accountId: tx.fromAccount }, 'credit', 'Fund pays member'),
            ];
        case 'supplier_payment':
            return [
                L('clearing', { clearingName: 'supplier_payable' }, 'debit', `Pay supplier ${tx.supplierName}`),
                tx.fromMember
                    ? L('member', { memberId: tx.fromMember }, 'credit', 'Member paid supplier personally')
                    : L('fund', { accountId: tx.fromAccount }, 'credit', 'Fund paid supplier'),
            ];
        case 'member_settlement':
            return [
                L('member', { memberId: tx.toMember }, 'debit', 'Received settlement'),
                L('member', { memberId: tx.fromMember }, 'credit', 'Paid settlement'),
            ];
        case 'transfer':
            return [
                L('fund', { accountId: tx.toAccount }, 'debit', 'Transfer in'),
                L('fund', { accountId: tx.fromAccount }, 'credit', 'Transfer out'),
            ];
        case 'fee':
            return [
                L('clearing', { clearingName: 'fees' }, 'debit', 'Transaction fee'),
                tx.fromAccount ? L('fund', { accountId: tx.fromAccount }, 'credit', 'Fee paid')
                    : L('member', { memberId: tx.fromMember }, 'credit', 'Fee borne by member'),
            ];
        default:
            throw Object.assign(new Error(`Unknown transaction kind: ${tx.kind}`), { status: 422 });
    }
};

/** POST /api/groups/:groupId/money/:txId/confirm — receiver/treasurer confirms actual receipt */
export const confirmTransaction = async (req, res, next) => {
    try {
        const { groupId, txId } = req.params;
        const result = await withTransaction(async (session) => {
            const tx = await MoneyTransaction.findOne({ _id: txId, groupId }).session(session);
            if (!tx) throw Object.assign(new Error('Transaction not found'), { status: 404 });
            if (tx.status !== 'submitted') throw Object.assign(new Error(`Cannot confirm from state: ${tx.status}`), { status: 409 });

            // resolve missing fund account for contributions
            if (tx.kind === 'contribution' && !tx.toAccount) {
                const fund = await FundAccount.findOne({ groupId, kind: 'cash', isArchived: false }).session(session);
                tx.toAccount = fund?._id || null;
            }

            const lines = buildJournalLines(tx);
            const journal = await postJournal({
                groupId,
                sourceType: 'money_transaction',
                sourceId: tx._id,
                costPeriod: `${new Date(tx.paidAt).getFullYear()}-${String(new Date(tx.paidAt).getMonth() + 1).padStart(2, '0')}`,
                lines,
                postedBy: req.user.id,
                memo: `${tx.kind} ${tx.reference || ''}`.trim(),
                session,
            });

            tx.status = 'confirmed';
            tx.confirmedBy = req.user.id;
            tx.confirmedAt = new Date();
            await tx.save({ session });

            await audit({ groupId, actorId: req.user.id, action: 'money.confirmed', targetType: 'money_transaction', targetId: tx._id });
            return { transaction: tx, journalId: journal._id };
        });

        res.json({ msg: 'Transaction confirmed and posted to ledger', ...result });
    } catch (err) {
        if (err.status === 409 || err.status === 422 || err.status === 404) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

/** POST /api/groups/:groupId/money/:txId/reject */
export const rejectTransaction = async (req, res, next) => {
    try {
        const tx = await MoneyTransaction.findOne({ _id: req.params.txId, groupId: req.params.groupId });
        if (!tx) return res.status(404).json({ msg: 'Transaction not found' });
        if (tx.status !== 'submitted') return res.status(409).json({ msg: 'Only submitted transactions can be rejected' });

        tx.status = 'rejected';
        tx.rejectionReason = req.body?.reason || '';
        await tx.save();
        await audit({ groupId: tx.groupId, actorId: req.user.id, action: 'money.rejected', targetType: 'money_transaction', targetId: tx._id, reason: tx.rejectionReason });
        res.json({ msg: 'Transaction rejected', transaction: tx });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/money/:txId/reverse — confirmed → linked reversal */
export const reverseTransaction = async (req, res, next) => {
    try {
        const { groupId, txId } = req.params;
        const result = await withTransaction(async (session) => {
            const tx = await MoneyTransaction.findOne({ _id: txId, groupId }).session(session);
            if (!tx) throw Object.assign(new Error('Transaction not found'), { status: 404 });
            if (tx.status !== 'confirmed') throw Object.assign(new Error('Only confirmed transactions can be reversed'), { status: 409 });
            if (!req.body?.reason) throw Object.assign(new Error('Reversal requires a reason'), { status: 422 });

            const original = await Journal.findOne({ sourceType: 'money_transaction', sourceId: tx._id, postingKind: 'original' }).session(session);
            if (original) await reverseJournal({ journal: original, reason: req.body.reason, postedBy: req.user.id, session });

            const reversal = await MoneyTransaction.create([{
                groupId, kind: tx.kind, amount: tx.amount,
                fromMember: tx.fromMember, toMember: tx.toMember,
                fromAccount: tx.fromAccount, toAccount: tx.toAccount,
                supplierName: tx.supplierName, method: tx.method,
                paidAt: new Date(), submittedBy: req.user.id,
                status: 'reversed', reversalOf: tx._id,
                reversalReason: req.body.reason,
            }], { session });

            tx.status = 'reversed';
            tx.reversalReason = req.body.reason;
            await tx.save({ session });

            await audit({ groupId, actorId: req.user.id, action: 'money.reversed', targetType: 'money_transaction', targetId: tx._id, reason: req.body.reason });
            return { reversalId: reversal[0]._id };
        });

        res.json({ msg: 'Transaction reversed (mirrored journal posted)', ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ msg: err.message });
        next(err);
    }
};

/** GET /api/groups/:groupId/money?status=&kind=&cursor=&limit= */
export const listTransactions = async (req, res, next) => {
    try {
        const filter = { groupId: req.params.groupId };
        const q = req.validated?.query || {};
        if (q.status) filter.status = q.status;
        if (q.kind) filter.kind = q.kind;

        const { cursor, limit } = req.query;
        if (cursor || limit) {
            const page = await paginateQuery({
                model: MoneyTransaction,
                filter,
                cursor,
                limit,
                sortField: '_id',
                sortOrder: -1,
                populate: 'fromMember toMember',
            });
            return res.json({ transactions: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore });
        }

        const transactions = await MoneyTransaction.find(filter)
            .populate('fromMember toMember', 'displayName')
            .sort({ paidAt: -1 })
            .limit(200)
            .lean();
        res.json({ transactions });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/memberships/:membershipId/balance — computed from ledger */
export const getBalance = async (req, res, next) => {
    try {
        const balance = await getMemberBalance({ groupId: req.params.groupId, memberId: req.params.membershipId });
        res.json({
            membershipId: req.params.membershipId,
            balancePoisha: balance,
            balanceTaka: (balance / 100).toFixed(2),
            meaning: balance > 0 ? 'group owes member' : balance < 0 ? 'member owes group' : 'settled',
        });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/funds — fund accounts with ledger balances */
export const listFunds = async (req, res, next) => {
    try {
        const funds = await FundAccount.find({ groupId: req.params.groupId, isArchived: false }).lean();
        const withBalances = [];
        for (const f of funds) {
            const balance = await getFundBalance({ groupId: f.groupId, accountId: f._id });
            withBalances.push({ ...f, balancePoisha: balance, balanceTaka: (balance / 100).toFixed(2) });
        }
        res.json({ funds: withBalances });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/funds — create a fund account */
export const createFund = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { name, kind, maskedIdentifier = '' } = req.body;
        const fund = await FundAccount.create({
            groupId, name, kind, maskedIdentifier,
            currentCustodian: req.user.id,
            custodianHistory: [{ userId: req.user.id, from: new Date(), to: null }],
            createdBy: req.user.id,
        });
        await audit({ groupId, actorId: req.user.id, action: 'fund.created', targetType: 'fund_account', targetId: fund._id, after: { name, kind } });
        res.status(201).json({ msg: 'Fund account created', fund });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/funds/:fundId/custodian — handover custody */
export const changeCustodian = async (req, res, next) => {
    try {
        const { groupId, fundId } = req.params;
        const fund = await FundAccount.findOne({ _id: fundId, groupId });
        if (!fund) return res.status(404).json({ msg: 'Fund account not found' });

        const history = fund.custodianHistory || [];
        if (history.length && history[history.length - 1] && !history[history.length - 1].to) {
            history[history.length - 1].to = new Date();
        }
        history.push({ userId: req.body.newCustodianId, from: new Date(), to: null });
        fund.custodianHistory = history;
        fund.currentCustodian = req.body.newCustodianId;
        await fund.save();

        await audit({ groupId, actorId: req.user.id, action: 'fund.custodian_changed', targetType: 'fund_account', targetId: fund._id, after: { custodian: req.body.newCustodianId } });
        res.json({ msg: 'Custody transferred (no income/expense created)', fund });
    } catch (err) { next(err); }
};
