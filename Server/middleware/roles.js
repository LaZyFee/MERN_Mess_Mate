import MessGroup from '../models/MessGroup.js';
import Membership from '../models/Membership.js';
import { audit } from '../models/AuditEvent.js';

/**
 * Role-based access control for mess group routes (legacy).
 * Usage: requireGroupRole('admin') or requireGroupRole('member')
 * Must run AFTER auth. Reads groupId/userId from req.params.
 * Loads the group once and puts it on req.group for downstream handlers.
 */
export const requireGroupRole = (requiredRole = 'member') => async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        const userId = req.user.id;
        const isAdmin = group.admin.equals(userId);
        const isMember = group.members.some(m => m.user.equals(userId));

        // Admins implicitly satisfy any role; members must be a member
        const allowed =
            (requiredRole === 'admin' && isAdmin) ||
            (requiredRole === 'member' && (isAdmin || isMember));

        if (!allowed) {
            return res.status(403).json({ msg: `Forbidden: requires ${requiredRole} role` });
        }

        req.group = group; // reuse in controller, avoids duplicate query
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Guards write access on entry data: admins can edit anyone's rows;
 * members can only edit their own meals/costs.
 * Sets req.canEditOthers boolean.
 */
export const allowSelfOrAdmin = (req, res, next) => {
    if (!req.group) return res.status(500).json({ msg: 'requireGroupRole must run first' });
    req.canEditOthers = req.group.admin.equals(req.user.id);
    next();
};

// ============================================================
// v2 roles — Owner / Manager / Treasurer / Auditor / Member
// Resolved from the effective-dated Membership collection.
// Falls back to the legacy MessGroup.admin as owner.
// ============================================================
export const ROLES = ['owner', 'manager', 'treasurer', 'auditor', 'member'];
const RANK = { owner: 4, manager: 3, treasurer: 2, auditor: 1, member: 0 };

/**
 * Resolve the requester's effective role in req.params.groupId.
 * Sets req.groupRole, req.group, req.membership (own active membership).
 */
export const requireGroupRoleV2 = (minRole = 'member') => async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const now = new Date();
        const memberships = await Membership.find({
            groupId,
            user: req.user.id,
            startDate: { $lte: now },
            $or: [{ endDate: null }, { endDate: { $gt: now } }],
        }).sort({ startDate: -1 });

        let role = memberships[0]?.role || null;
        let membership = memberships[0] || null;

        // legacy fallback: group.admin is treated as owner
        if (!role) {
            const group = await MessGroup.findById(groupId).lean();
            if (!group) return res.status(404).json({ msg: 'Group not found' });
            if (group.admin?.equals?.(req.user.id) || String(group.admin) === req.user.id) {
                role = 'owner';
            }
            req.group = group;
        } else {
            req.group = await MessGroup.findById(groupId).lean();
            // Membership rows whose group was deleted must not grant access
            if (!req.group) return res.status(404).json({ msg: 'Group not found' });
        }

        if (!role) return res.status(403).json({ msg: 'Not a member of this group' });

        // Auditors are READ-ONLY across every group-scoped module (not just
        // routines). They can see everything a member sees, but no writes.
        const isReadMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
        if (role === 'auditor' && !isReadMethod) {
            return res.status(403).json({ msg: 'Auditor access is read-only' });
        }

        if (RANK[role] < RANK[minRole]) {
            return res.status(403).json({ msg: `Forbidden: requires ${minRole} role` });
        }

        req.groupRole = role;
        req.membership = membership;
        next();
    } catch (err) {
        next(err);
    }
};

/** Flag self-approval: manager approving their own expense needs a reason. */
export const flagSelfApproval = ({ targetMemberId }) => (req, res, next) => {
    if (req.membership && String(req.membership._id) === String(targetMemberId)) {
        req.selfApproval = true;
        if (!req.body?.reason) {
            return res.status(422).json({ msg: 'Self-approval requires a reason (field: reason)' });
        }
    }
    next();
};

/** Ownership transfer: last owner cannot leave without transferring. */
export const assertOwnerTransfer = async ({ groupId, departingUserId }) => {
    const owners = await Membership.find({
        groupId, role: 'owner',
        startDate: { $lte: new Date() },
        $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
    });
    if (owners.length === 1 && String(owners[0].user) === String(departingUserId)) {
        throw Object.assign(new Error('Last owner cannot leave without transferring ownership'), { status: 422 });
    }
};

export const auditRoleChange = async ({ groupId, actorId, membershipId, from, to, reason }) =>
    audit({ groupId, actorId, action: 'membership.role_changed', targetType: 'membership', targetId: membershipId, before: { role: from }, after: { role: to }, reason });
