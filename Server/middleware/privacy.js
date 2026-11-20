import Membership from '../models/Membership.js';

// PRIVACY GUARD (platform rule):
//  1. No user may see ANY other user's info unless they share a group.
//  2. No one may see group counts or any group's data without being (or having
//     been) a member — ex-members see history ONLY inside their interval.
//  3. Groups can only be joined via shareable invite code/link.

/**
 * requireGroupMembership — hard gate for any group-scoped read/write.
 * Loads the requester's ACTIVE membership; non-members and departed members
 * get the same generic 404 as a missing group (existence not confirmed).
 * Sets req.groupId, req.myMembership (null for legacy-admin fallback pass).
 */
export const requireGroupMembership = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const now = new Date();
        const membership = await Membership.findOne({
            groupId,
            user: req.user.id,
            startDate: { $lte: now },
            $or: [{ endDate: null }, { endDate: { $gt: now } }],
        }).sort({ startDate: -1 });

        if (!membership) {
            return res.status(404).json({ msg: 'Group not found' });
        }
        req.groupId = groupId;
        req.myMembership = membership;
        next();
    } catch (err) { next(err); }
};

/**
 * historyCutoff — for READ endpoints. Former members may read history that
 * falls INSIDE their membership interval only. Uses req.myMembership from
 * requireGroupMembership, or falls back to interval lookup for ex-members
 * (query param `history=true` routes through this path).
 *
 * Sets req.historyFrom / req.historyTo (Dates or null). Controllers apply:
 *   date filters = { $gte: req.historyFrom ?? from, $lte: req.historyTo ?? to }
 */
export const resolveHistoryWindow = async (req, res, next) => {
    try {
        if (req.myMembership) {
            // active member: full visibility within any requested range
            req.historyFrom = null;
            req.historyTo = null;
            return next();
        }
        const { groupId } = req.params;
        const rows = await Membership.find({ groupId, user: req.user.id }).sort({ startDate: 1 });
        if (rows.length === 0) return res.status(404).json({ msg: 'Group not found' });

        // Ex-member: clamp to [first join, last departure]
        req.historyFrom = rows[0].startDate;
        const ends = rows.map(r => r.endDate).filter(Boolean);
        req.historyTo = ends.length ? new Date(Math.max(...ends.map(d => new Date(d).getTime()))) : new Date();
        req.isFormerMember = true;
        next();
    } catch (err) { next(err); }
};

/**
 * membershipScopedUserFields — the ONLY user fields members may see about
 * each other. Emails/phones/whatsapp NEVER cross this boundary.
 */
export const MEMBER_VISIBLE_FIELDS = 'username profilePic';

/** Public profile projection builder — enforce field allowlist centrally. */
export const publicProfile = (user) => user && ({
    _id: user._id ?? user.id,
    username: user.username,
    profilePic: user.profilePic,
});
