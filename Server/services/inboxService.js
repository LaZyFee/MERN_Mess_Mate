import InboxNotification from '../models/InboxNotification.js';
import User from '../models/User.js';
import { computeExpiry, buildDedupeKey } from './inboxService.rules.js';

// Inbox service — inserts notification rows (with dedupe) and emits realtime
// `inbox-new` events to the per-user socket room `user:<id>`.

let socketIo = null;
/** Call this from index.js once the Socket.IO server exists so every notify()
 *  call emits `inbox-new` to the joined `user:<id>` rooms. */
export const setSocketIo = (io) => {
    socketIo = io;
};

const MAX_USERIDS = 500;

export const notify = async ({
    userIds,
    scope = 'user',
    groupId = null,
    type,
    title,
    body = '',
    link = null,
    dedupeKey = null,
    io = null,
    now = new Date(),
}) => {
    if (!type || !title) throw new Error('notify: type and title are required');
    const ids = [...new Set((userIds || []).map(String))].slice(0, MAX_USERIDS);
    if (ids.length === 0) return [];

    const expiresAt = computeExpiry(now);
    const docs = ids.map(userId => ({
        userId, scope, groupId, type,
        title: String(title).slice(0, 120),
        body: String(body || '').slice(0, 300),
        link: link ? { kind: link.kind || null, id: link.id || null } : undefined,
        dedupeKey: dedupeKey ? buildDedupeKey(scope, type, dedupeKey) : undefined,
        expiresAt,
    }));

    const created = await InboxNotification.insertMany(docs, { ordered: false })
        .then(res => res)
        .catch(err => {
            // Duplicate-key (dedupe hit) or ordered:false partial failures:
            // fall back to fetching whatever rows exist for this dedupeKey batch.
            if (err.code === 11000 || err.writeErrors) {
                return InboxNotification.find({
                    userId: { $in: ids },
                    ...(dedupeKey ? { dedupeKey: buildDedupeKey(scope, type, dedupeKey) } : {}),
                    createdAt: { $gte: new Date(now.getTime() - 60_000) },
                }).lean();
            }
            throw err;
        });

    // Realtime push, never blocking the caller on socket errors
    const effectiveIo = io || socketIo;
    if (effectiveIo) {
        for (const n of created) {
            try {
                effectiveIo.to(`user:${n.userId}`).emit('inbox-new', {
                    id: n._id, type: n.type, title: n.title, link: n.link || null,
                });
            } catch { /* socket failures must not break the request path */ }
        }
    }
    return created;
};

export const notifyAdmins = async (payload) => {
    const emails = (process.env.ADMIN_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (emails.length === 0) return [];
    const admins = await User.find({ email: { $in: emails } }).select('_id').lean();
    if (admins.length === 0) return [];
    return notify({ ...payload, userIds: admins.map(a => a._id), scope: 'admin' });
};
