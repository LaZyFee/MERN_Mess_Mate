import User from '../models/User.js';
import Membership from '../models/Membership.js';
import MessGroup from '../models/MessGroup.js';
import AuditEvent from '../models/AuditEvent.js';
import { audit } from '../models/AuditEvent.js';
import { revokeAllSessions } from '../services/sessionService.js';
import { publicProfile, MEMBER_VISIBLE_FIELDS } from '../middleware/privacy.js';
import NotificationOutbox from '../models/NotificationOutbox.js';
import Attachment from '../models/Attachment.js';
import Reconciliation from '../models/Reconciliation.js';
import Expense from '../models/Expense.js';
import { JobLock, JobRun } from '../models/JobRun.js';
import { getSchedulerHeartbeat } from '../services/schedulerService.js';
import { cacheInvalidateUser } from '../services/authCache.js';

// ADMIN-ONLY control plane. Never exposed in any user-facing route, sitemap,
// or API listing. Guard fails CLOSED and responses are intentionally generic.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_HEADER_SECRET = process.env.ADMIN_PANEL_KEY || '';

/**
 * requirePlatformAdmin â€” mount BEFORE any /api/admin route.
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

        // 2FA mandatory for platform admins: access token must carry amr: otp
        const amr = req.user?.amr || [];
        if (!Array.isArray(amr) || !amr.includes('otp')) {
            await audit({
                actorId: req.user.id, action: 'admin.2fa_required',
                targetType: 'admin_panel', reason: `path=${req.originalUrl}`,
            });
            return res.status(404).json({ msg: 'Route not found' });
        }
        req.isAdminPanel = true;
        next();
    } catch (err) { next(err); }
};

/** Mark admin actions in the audit trail. */
const alog = (req, action, extra = {}) =>
    audit({ actorId: req.user.id, action, targetType: 'admin_panel', ...extra });

// ---------------- Traffic & analytics ----------------

/** GET /api/admin/overview â€” counts + headline metrics */
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

/** GET /api/admin/traffic?days=30 â€” daily signup/activity buckets */
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

/** GET /api/admin/audit?limit=100&action=&groupId= â€” latest audit events */
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

/** GET /api/admin/users?q=&limit=&cursor= â€” all users, paginated */
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
        // Sensitive read: this directory exposes email/phone/whatsapp — always audit.
        await alog(req, 'admin.users.list', { after: { count: items.length, q: req.query.q || '' } });
        res.json({ items, nextCursor: hasMore ? items[items.length - 1]._id : null, hasMore });
    } catch (err) { next(err); }
};

/** GET /api/admin/users/:userId â€” full profile incl. group memberships */
export const adminGetUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-twoFactor.secretEnc -twoFactor.recoveryCodesHash -password -refreshToken -resetPasswordToken -verifyEmailToken').lean();
        if (!user) return res.status(404).json({ msg: 'Not found' });
        await alog(req, 'admin.users.view', { targetId: user._id });
        const memberships = await Membership.find({ user: user._id })
            .populate('groupId', 'name code').lean();
        res.json({ user: publicProfile(user), memberships });
    } catch (err) { next(err); }
};

/** PATCH /api/admin/users/:userId â€” suspend/verify/flip admin allowlist flags */
export const adminUpdateUser = async (req, res, next) => {
    try {
        const { isVerified, suspended } = req.body;
        const update = {};
        if (typeof isVerified === 'boolean') update.isVerified = isVerified;
        if (typeof suspended === 'boolean') update.suspended = suspended;
        const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true })
            .select('-twoFactor.secretEnc -twoFactor.recoveryCodesHash -password -refreshToken -resetPasswordToken -verifyEmailToken').lean();
        if (!user) return res.status(404).json({ msg: 'Not found' });
        // The auth middleware caches {suspended} for ~30 s (S4.1): drop it so the
        // change takes effect on the next request, not after the TTL.
        cacheInvalidateUser(req.params.userId);
        if (update.suspended === true) {
            await revokeAllSessions({ userId: req.params.userId }); // kill all refresh families on suspend
            await User.findByIdAndUpdate(req.params.userId, { refreshToken: null }); // clear legacy hash
            req.app.get('io')?.in(`user:${req.params.userId}`).disconnectSockets();
        }
        await alog(req, 'admin.users.view', { targetId: user._id });
        await alog(req, 'admin.user_updated', { targetId: req.params.userId, after: update });
        res.json({ user });
    } catch (err) { next(err); }
};

// ---------------- Global group directory (admin-only) ----------------

/** GET /api/admin/groups?q=&limit= â€” ALL groups with member counts */
export const adminListGroups = async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const filter = {};
        if (req.query.q) filter.name = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        const groups = await MessGroup.find(filter).sort({ createdAt: -1 }).limit(limit)
            .populate('admin', '_id username profilePic')
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

/** GET /api/admin/groups/:groupId â€” deep inspection of any group */
export const adminGetGroup = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('admin', '_id username profilePic').lean();
        if (!group) return res.status(404).json({ msg: 'Not found' });
        const memberships = await Membership.find({ groupId: group._id }).populate('user', MEMBER_VISIBLE_FIELDS).lean();
        await alog(req, 'admin.groups.view', { targetId: group._id });
        res.json({ group, memberships });
    } catch (err) { next(err); }
};

/** DELETE /api/admin/groups/:groupId â€” archive/danger zone (ownerless groups only) */
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

// ---------------- Operational health (S3.4) ----------------

/** GET /api/admin/health — what is stuck: job age, outbox depth, variance, scans, locks */
export const getHealth = async (req, res, next) => {
    try {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 86400_000);

        const [lastRuns, locks, outboxByState, oldestPending, scanAgg, varianceAgg, expiringJobs] = await Promise.all([
            JobRun.aggregate([
                { $sort: { startedAt: -1 } },
                { $group: { _id: '$name', run: { $first: '$$ROOT' } } },
            ]),
            JobLock.find({}).lean(),
            NotificationOutbox.aggregate([{ $group: { _id: '$state', count: { $sum: 1 } } }]),
            NotificationOutbox.findOne({ state: 'pending' }).sort({ createdAt: 1 }).select('createdAt updatedAt').lean(),
            Attachment.aggregate([{ $group: { _id: '$scanStatus', count: { $sum: 1 } } }]),
            Reconciliation.aggregate([
                { $match: { status: 'open' } },
                { $group: { _id: null, varianceTotal: { $sum: '$variance' }, open: { $sum: 1 } } },
            ]),
            Expense.countDocuments({ status: 'submitted', createdAt: { $lt: dayAgo } }),
        ]);

        const jobs = lastRuns.map(r => ({
            name: r._id,
            status: r.run.status,
            startedAt: r.run.startedAt,
            finishedAt: r.run.finishedAt,
            ageMinutes: r.run.startedAt ? Math.round((now - new Date(r.run.startedAt)) / 60000) : null,
            failed: r.run.failed,
            error: r.run.error || null,
        })).sort((a, b) => (b.ageMinutes ?? 0) - (a.ageMinutes ?? 0));

        const outbox = Object.fromEntries(outboxByState.map(o => [o._id, o.count]));
        const scans = Object.fromEntries(scanAgg.map(s => [s._id, s.count]));
        const variance = varianceAgg[0] || { varianceTotal: 0, open: 0 };
        const heartbeat = getSchedulerHeartbeat();

        res.json({
            generatedAt: now,
            jobs: { count: jobs.length, stale: jobs.filter(j => j.ageMinutes !== null && j.ageMinutes > 36 * 60), recentFailures: jobs.filter(j => j.status === 'failed'), oldest: jobs.slice(0, 10) },
            outbox: {
                byState: outbox,
                pending: outbox.pending || 0,
                stuckProcessing: outbox.processing || 0,
                oldestPendingAgeMinutes: oldestPending ? Math.round((now - new Date(oldestPending.createdAt)) / 60000) : null,
            },
            reconciliation: { open: variance.open, varianceTotal: variance.varianceTotal },
            scans: { pending: scans.pending || 0, rejected: scans.rejected || 0, clean: scans.clean || 0 },
            stuckExpenses: expiringJobs,
            locks: locks.map(l => ({
                name: l.name,
                owner: l.owner,
                lockedUntil: l.lockedUntil,
                held: Boolean(l.lockedUntil && new Date(l.lockedUntil) > now),
            })),
            scheduler: {
                running: heartbeat.running,
                lastTickAt: heartbeat.lastTickAt,
                staleMinutes: heartbeat.lastTickAt ? Math.round((now - new Date(heartbeat.lastTickAt)) / 60000) : null,
            },
        });
    } catch (err) { next(err); }
};
