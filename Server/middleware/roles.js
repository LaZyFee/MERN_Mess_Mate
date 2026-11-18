import MessGroup from '../models/MessGroup.js';

/**
 * Role-based access control for mess group routes.
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
