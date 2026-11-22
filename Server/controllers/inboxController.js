import InboxNotification from '../models/InboxNotification.js';
import User from '../models/User.js';
import { paginateQuery } from '../utils/pagination.js';
import { inboxPrefsSchema } from '../validation/inboxSchemas.js';

// Inbox controller — the caller only ever touches their own rows.

const DEFAULT_PREF = { inApp: true, email: true };

/** GET /api/inbox?unread=1&cursor=&limit= */
export const listInbox = async (req, res, next) => {
    try {
        const q = req.validated?.query || {};
        const filter = { userId: req.user.id };
        if (q.unread === '1') filter.readAt = null;
        const page = await paginateQuery({
            model: InboxNotification,
            filter,
            cursor: q.cursor,
            limit: q.limit,
            sortField: '_id',
            sortOrder: -1,
        });
        res.json({ notifications: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore });
    } catch (err) { next(err); }
};

/** GET /api/inbox/unread-count */
export const unreadCount = async (req, res, next) => {
    try {
        const count = await InboxNotification.countDocuments({ userId: req.user.id, readAt: null });
        res.json({ count });
    } catch (err) { next(err); }
};

/** POST /api/inbox/read  { ids } | { all:true } */
export const markRead = async (req, res, next) => {
    try {
        const { ids, all } = req.body;
        const filter = { userId: req.user.id, readAt: null };
        if (!all) filter._id = { $in: ids };
        const result = await InboxNotification.updateMany(filter, { readAt: new Date() });
        res.json({ msg: 'Marked read', count: result.modifiedCount });
    } catch (err) { next(err); }
};

const mergePrefs = (prefs) => ({
    types: prefs?.types || {},
    quietHours: prefs?.quietHours || { from: '22:00', to: '07:00' },
});

/** GET /api/inbox/preferences */
export const getPreferences = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('notificationPrefs').lean();
        res.json({ preferences: mergePrefs(user?.notificationPrefs) });
    } catch (err) { next(err); }
};

/** PUT /api/inbox/preferences */
export const updatePreferences = async (req, res, next) => {
    try {
        const parsed = inboxPrefsSchema.parse(req.body);
        const user = await User.findById(req.user.id).select('notificationPrefs');
        const current = mergePrefs(user.notificationPrefs);
        current.types = { ...current.types, ...(parsed.types || {}) };
        if (parsed.quietHours) current.quietHours = parsed.quietHours;
        user.notificationPrefs = current;
        await user.save();
        res.json({ msg: 'Preferences updated', preferences: mergePrefs(user.notificationPrefs) });
    } catch (err) {
        if (err.name === 'ZodError') {
            return res.status(400).json({ msg: 'Validation failed', errors: err.issues });
        }
        next(err);
    }
};

export { DEFAULT_PREF };
