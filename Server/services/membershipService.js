import Membership from '../models/Membership.js';

// Membership service — effective-dated eligibility and interval helpers.

/**
 * All memberships active for the group at a given date (default now).
 * Interval semantics: [startDate, endDateExclusive or ∞)
 */
export const activeMemberships = async ({ groupId, at = new Date() }) => {
    const rows = await Membership.find({
        groupId,
        startDate: { $lte: at },
        $or: [{ endDate: null }, { endDate: { $gt: at } }],
    }).sort({ startDate: 1, createdAt: 1 });
    return rows;
};

/** Memberships overlapping any part of a month (YYYY-MM string). */
export const membershipsInMonth = async ({ groupId, month }) => {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const rows = await Membership.find({
        groupId,
        startDate: { $lt: end },
        $or: [{ endDate: null }, { endDate: { $gt: start } }],
    }).sort({ startDate: 1, createdAt: 1 });
    return rows;
};

/** Is a membership eligible (has an active interval) on a given date? */
export const isEligibleOn = (membership, date) => {
    const d = new Date(date);
    const start = new Date(membership.startDate);
    if (d < start) return false;
    if (membership.endDate && d >= new Date(membership.endDate)) return false;
    return true;
};

/** Number of eligible days a membership has within [from, to). */
export const eligibleDaysIn = (membership, from, to) => {
    const s = Math.max(from.getTime(), new Date(membership.startDate).getTime());
    const e = Math.min(to.getTime(), membership.endDate ? new Date(membership.endDate).getTime() : to.getTime());
    const days = Math.ceil((e - s) / 86400000);
    return Math.max(0, days);
};

/** Prevent overlapping intervals for the same user+group. */
export const assertNoOverlap = async ({ groupId, userId, startDate, endDate, excludeId = null }) => {
    const overlapping = await Membership.find({
        groupId,
        user: userId,
        _id: { $ne: excludeId },
        startDate: { $lt: endDate || new Date('9999-12-31') },
        $or: [{ endDate: null }, { endDate: { $gt: startDate } }],
    });
    if (overlapping.length > 0) {
        throw Object.assign(new Error('Overlapping membership interval for this user'), { status: 422 });
    }
};

/** Resolve role for a user in a group from Membership intervals (fallback: legacy group.admin). */
export const resolveRole = async ({ groupId, userId }) => {
    const ms = await Membership.find({ groupId, user: userId }).sort({ startDate: -1 });
    const now = new Date();
    const active = ms.find(m => isEligibleOn(m, now));
    return active ? active.role : null;
};
