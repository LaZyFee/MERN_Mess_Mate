import Membership from '../models/Membership.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import FundAccount from '../models/FundAccount.js';

const unique = (values = []) => [...new Set(values.filter(Boolean).map(String))];

const fail = (field, id) => Object.assign(
    new Error(`Invalid ${field} ${id} for this group`),
    { status: 422 }
);

export const resolveGroupRefs = async ({
    groupId,
    membershipIds = [],
    categoryIds = [],
    accountIds = [],
    effectiveDate = new Date(),
    effectiveRange = null,
    session = null,
} = {}) => {
    // effectiveRange ({from, to}) = membership must be active somewhere inside the
    // range, not necessarily at its first instant (mid-month joins).
    if (!groupId) throw Object.assign(new Error('groupId is required'), { status: 400 });

    const date = effectiveDate ? new Date(effectiveDate) : new Date();
    const memberships = unique(membershipIds);
    const categories = unique(categoryIds);
    const accounts = unique(accountIds);

    const from = effectiveRange?.from ? new Date(effectiveRange.from) : date;
    const to = effectiveRange?.to ? new Date(effectiveRange.to) : null;
    const interval = to
        ? { startDate: { $lt: to }, endDate: { $gt: from } }
        : { startDate: { $lte: from }, endDate: { $gt: from } };

    const membershipQuery = memberships.length
        ? Membership.find({
            _id: { $in: memberships },
            groupId,
            startDate: interval.startDate,
            // endDate is never empty-string: null means open-ended interval
            $or: [{ endDate: null }, { endDate: interval.endDate }],
        })
        : null;
    if (membershipQuery) {
        if (session) membershipQuery.session(session);
        const found = await membershipQuery.select('_id').lean();
        if (found.length !== memberships.length) {
            const foundIds = new Set(found.map(m => String(m._id)));
            throw fail('membershipId', memberships.find(id => !foundIds.has(id)));
        }
    }

    if (categories.length) {
        const query = ExpenseCategory.find({ _id: { $in: categories }, groupId, isArchived: false });
        if (session) query.session(session);
        const found = await query.select('_id').lean();
        if (found.length !== categories.length) {
            const foundIds = new Set(found.map(c => String(c._id)));
            throw fail('categoryId', categories.find(id => !foundIds.has(id)));
        }
    }

    if (accounts.length) {
        const query = FundAccount.find({ _id: { $in: accounts }, groupId, isArchived: false });
        if (session) query.session(session);
        const found = await query.select('_id').lean();
        if (found.length !== accounts.length) {
            const foundIds = new Set(found.map(a => String(a._id)));
            throw fail('accountId', accounts.find(id => !foundIds.has(id)));
        }
    }

    return { memberships, categories, accounts };
};
