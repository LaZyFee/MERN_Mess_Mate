import User from '../models/User.js';
import Membership from '../models/Membership.js';
import MessGroup from '../models/MessGroup.js';
import AuditEvent from '../models/AuditEvent.js';
import { audit } from '../models/AuditEvent.js';

// ADMIN-ONLY control plane. Never exposed in any user-facing route, sitemap,
// or API listing. Guard fails CLOSED and responses are intentionally generic.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_HEADER_SECRET = process.env.ADMIN_PANEL_KEY || '';

/**
 * requirePlatformAdmin — mount BEFORE any /api/admin route.
 * Verifies the caller is on the platform-admin allowlist (ADMIN_EMAILS env,
 * comma-separated). Optionally also requires the X-Admin-Key header when
 * ADMIN_PANEL_KEY is set (defense-in-depth against a stolen access token).
 * Denied requests are audit-logged and answered with a generic 404 so the
 * endpoint's existence is not confirmed to non-admins.
 */
export const requirePlatformAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('email role').lean();
        const isAllowed = user && ADMIN_EMAILS.includes(String(user.email).toLowerCase());
        const keyOk = !ADMIN_HEADER_SECRET || req.header('X-Admin-Key') === ADMIN_HEADER_SECRET;

        if (!isAllowed || !keyOk) {
            await audit({
                actorId: req.user.id, action: 'admin.access_denied',
                targetType: 'admin_panel', reason: `path=${req.originalUrl}`,
            });
            return res.status(404).json({ msg: 'Route not found' }); // same as global 404
        }
        req.isAdminPanel = true;
        next();
    } catch (err) { next(err); }
};

/** Mark admin actions in the audit trail. */
const alog = (req, action, extra = {}) =>
    audit({ actorId: req.user.id, action, targetType: 'admin_panel', ...extra });

// ---------------- Traffic & analytics ----------------

/** GET /api/admin/overview — counts + headline metrics */
export const getOverview = async (req, res, next) => {
    try {
        const since24h = new Date(Date.now() - 24 * 3600 * 1000);
        const since7d = new Date(Date.now() - 7 * 86400_000);

        const [users, groups, membershipsActive, audits24h, statements] = await Promise.all([
            User.countDocuments({}),
            MessGroup.countDocuments({}),
            Membership.countDocuments({ $or: [{ endDate: null }, { endDate: { $gt: new Date() } }] }),
            AuditEvent.countDocuments({ createdAt: { $gte: since24h } }),
            (await import('../models/Statement.js')).default.countDocuments({}),
        ]);

        const newUsers24h = await User.countDocuments({ createdAt: { $gte: since24h } });
        const newUsers7d = await User.countDocuments({ createdAt: { $gte: since7d } });
        const verified = await User.countDocuments({ isVerified: true });

        res.json({
            totals: { users, groups, membershipsActive, statements },
            traffic: { newUsers24h, newUsers7d, verifiedUsers: verified, auditEvents24h: audits24h },
            generatedAt: new Date(),
        });
    } catch (err) { next(err); }
};

/** GET /api/admin/traffic?days=30 — daily signup/activity buckets */
export const getTraffic = async (req, res, next) => {
    try {
        const days = Math.min(Math.max(1, Number(req.query.days) || 30), 120);
        const since = new Date(Date.now() - days * 86400_000);
        const [signups, actions] = await Promise.all([
            User.aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            AuditEvent.aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({ days, signups, auditActions: actions });
    } catch (err) { next(err); }
};

/** GET /api/admin/audit?limit=100&action=&groupId= — latest audit events */
export const listAuditEvents = async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.groupId) filter.groupId = req.query.groupId;
        const events = await AuditEvent.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
        res.json({ events });
    } catch (err) { next(err); }
};

// ---------------- Global user directory (admin-only) ----------------

/** GET /api/admin/users?q=&limit=&cursor= — all users, paginated */
export const adminListUsers = async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const filter = {};
        if (req.query.q) {
            const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ username: rx }, { email: rx }, { phone: rx }];
        }
        if (req.query.cursor) filter._id = { $lt: req.query.cursor };

        const users = await User.find(filter)
            .sort({ _id: -1 }).limit(limit + 1)
            .select('username email phone whatsapp isVerified createdAt googleId')
            .lean();

        const hasMore = users.length > limit;
        const items = hasMore ? users.slice(0, limit) : users;
        res.json({ items, nextCursor: hasMore ? items[items.length - 1]._id : null, hasMore });
    } catch (err) { next(err); }
};

/** GET /api/admin/users/:userId — full profile incl. group memberships */
export const adminGetUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password -refreshToken -resetPasswordToken -verifyEmailToken').lean();
        if (!user) return res.status(404).json({ msg: 'Not found' });
        const memberships = await Membership.find({ user: user._id })
            .populate('groupId', 'name code').lean();
        res.json({ user, memberships });
    } catch (err) { next(err); }
};

/** PATCH /api/admin/users/:userId — suspend/verify/flip admin allowlist flags */
export const adminUpdateUser = async (req, res, next) => {
    try {
        const { isVerified, suspended } = req.body;
        const update = {};
        if (typeof isVerified === 'boolean') update.isVerified = isVerified;
        if (typeof suspended === 'boolean') update.suspended = suspended;
        const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true })
            .select('-password -refreshToken').lean();
        if (!user) return res.status(404).json({ msg: 'Not found' });
        await alog(req, 'admin.user_updated', { targetId: req.params.userId, after: update });
        res.json({ user });
    } catch (err) { next(err); }
};

// ---------------- Global group directory (admin-only) ----------------

/** GET /api/admin/groups?q=&limit= — ALL groups with member counts */
export const adminListGroups = async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const filter = {};
        if (req.query.q) filter.name = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        const groups = await MessGroup.find(filter).sort({ createdAt: -1 }).limit(limit)
            .populate('admin', 'username email')
            .lean();
        const counts = await Membership.aggregate([
            { $match: { $or: [{ endDate: null }, { endDate: { $gt: new Date() } }] } },
            { $group: { _id: '$groupId', activeMembers: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map(c => [String(c._id), c.activeMembers]));

        res.json({
            items: groups.map(g => ({ ...g, activeMembers: countMap.get(String(g._id)) || 0 })),
        });
    } catch (err) { next(err); }
};

/** GET /api/admin/groups/:groupId — deep inspection of any group */
export const adminGetGroup = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('admin', 'username email').lean();
        if (!group) return res.status(404).json({ msg: 'Not found' });
        const memberships = await Membership.find({ groupId: group._id }).populate('user', 'username email').lean();
        res.json({ group, memberships });
    } catch (err) { next(err); }
};

/** DELETE /api/admin/groups/:groupId — archive/danger zone (ownerless groups only) */
export const adminDeleteGroup = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId);
        if (!group) return res.status(404).json({ msg: 'Not found' });
        group.isArchived = true;
        await group.save();
        await alog(req, 'admin.group_archived', { targetId: group._id, reason: req.body?.reason || '' });
        res.json({ msg: 'Group archived' });
    } catch (err) { next(err); }
};


