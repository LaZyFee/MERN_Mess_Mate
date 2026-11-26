import Membership from '../models/Membership.js';
import { assertNoOverlap, activeMemberships, membershipsInMonth } from '../services/membershipService.js';
import { audit } from '../models/AuditEvent.js';
import { auditRoleChange, assertOwnerTransfer } from '../middleware/roles.js';
import { reassignDepartedMemberDuties } from '../services/routineJobs.js';
import { paginateQuery } from '../utils/pagination.js';

// Membership endpoints — effective-dated intervals, placeholder accounts,
// role assignment, departure with preserved balances.

/** GET /api/groups/:groupId/memberships — history + active (cursor; `?all=true` for exports) */
export const listMemberships = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const q = req.validated?.query || {};
        // no cursor/limit ⇒ return every membership (SSR screens and clients that
        // render the whole roster keep working); paginate only when asked (S4.2)
        if (q.all === 'true' || (!q.cursor && !q.limit)) {
            const rows = await Membership.find({ groupId }).sort({ startDate: -1 }).lean();
            const active = rows.filter(m => !m.endDate || new Date(m.endDate) > new Date());
            return res.json({ memberships: rows, active, hasMore: false, nextCursor: null });
        }
        const page = await paginateQuery({
            model: Membership, filter: { groupId },
            cursor: q.cursor || null, limit: q.limit || 50,
            sortField: '_id', sortOrder: 1,
        });
        res.json({
            memberships: page.items,
            active: page.items.filter(m => !m.endDate || new Date(m.endDate) > new Date()),
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
        });
    } catch (err) { next(err); }
};

/** POST /api/groups/:groupId/memberships — create (member or placeholder) */
export const createMembership = [
    async (req, res, next) => {
        try {
            const { groupId } = req.params;
            const {
                userId = null, displayName, startDate, endDate = null,
                role = 'member', room = '', weight = 1, isPlaceholder = false,
            } = req.body;

            if (userId && userId !== req.user.id) {
                // adding someone else requires manager+ (checked by route middleware)
            }

            const membership = await Membership.create({
                groupId,
                user: userId,
                displayName,
                isPlaceholder: isPlaceholder || !userId,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                role,
                room,
                weight,
                createdBy: req.user.id,
            });

            await audit({
                groupId, actorId: req.user.id,
                action: 'membership.created', targetType: 'membership', targetId: membership._id,
                after: { displayName, role, startDate, endDate },
            });

            res.status(201).json({ msg: 'Membership created', membership });
        } catch (err) {
            if (err.message?.includes('Overlapping')) return res.status(422).json({ msg: err.message });
            next(err);
        }
    },
];

/** PATCH /api/groups/:groupId/memberships/:membershipId — effective-dated update */
export const updateMembership = [
    async (req, res, next) => {
        try {
            const { groupId, membershipId } = req.params;
            const membership = await Membership.findOne({ _id: membershipId, groupId });
            if (!membership) return res.status(404).json({ msg: 'Membership not found' });

            const { role, room, weight, endDate, displayName, linkUserId } = req.body;
            const before = { role: membership.role, endDate: membership.endDate };

            if (role && role !== membership.role) {
                await auditRoleChange({
                    groupId, actorId: req.user.id, membershipId: membership._id,
                    from: membership.role, to: role, reason: req.body.reason || '',
                });
                membership.role = role;
            }
            if (room !== undefined) membership.room = room;
            if (weight !== undefined) membership.weight = weight;
            if (displayName !== undefined) membership.displayName = displayName;
            if (endDate !== undefined) {
                membership.endDate = endDate ? new Date(endDate) : null;
                if (endDate) membership.leftAt = new Date(endDate);
            }
            if (linkUserId) {
                // placeholder → verified account: preserve history
                membership.user = linkUserId;
                membership.isPlaceholder = false;
                membership.replacedBy = membership._id; // self-reference marker
            }

            await membership.save();
            await audit({
                groupId, actorId: req.user.id,
                action: 'membership.updated', targetType: 'membership', targetId: membership._id,
                before, after: { role: membership.role, endDate: membership.endDate },
            });

            res.json({ msg: 'Membership updated', membership });
        } catch (err) { next(err); }
    },
];

/** POST /api/groups/:groupId/memberships/:membershipId/depart — leave/kick with balance preserved */
export const departMembership = async (req, res, next) => {
    try {
        const { groupId, membershipId } = req.params;
        const membership = await Membership.findOne({ _id: membershipId, groupId });
        if (!membership) return res.status(404).json({ msg: 'Membership not found' });

        if (membership.role === 'owner' && membership.user) {
            await assertOwnerTransfer({ groupId, departingUserId: membership.user });
        }

        const at = req.body?.at ? new Date(req.body.at) : new Date();
        membership.endDate = at;
        membership.leftAt = at;
        await membership.save();
        if (membership.user) {
            req.app.get('io')?.in(`user:${membership.user}`).disconnectSockets();
            req.app.get('io')?.in(`group:${groupId}`).disconnectSockets();
        }

        await audit({
            groupId, actorId: req.user.id,
            action: 'membership.departed', targetType: 'membership', targetId: membership._id,
            reason: req.body?.reason || '', after: { endDate: at },
        });

        // Reassign future duties of the departed member and notify managers
        try { await reassignDepartedMemberDuties(groupId, membershipId); } catch { /* non-blocking */ }

        res.json({ msg: 'Departure recorded; account and balances preserved', membership });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/memberships/active?at=ISO — eligibility lookup */
export const listActive = async (req, res, next) => {
    try {
        const at = req.query?.at ? new Date(req.query.at) : new Date();
        res.json({ memberships: await activeMemberships({ groupId: req.params.groupId, at }) });
    } catch (err) { next(err); }
};

/** GET /api/groups/:groupId/memberships/month/:month */
export const listForMonth = async (req, res, next) => {
    try {
        res.json({ memberships: await membershipsInMonth({ groupId: req.params.groupId, month: req.params.month }) });
    } catch (err) { next(err); }
};
