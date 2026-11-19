import { listSessions, revokeSession, revokeAllSessions } from '../services/sessionService.js';
import { audit } from '../models/AuditEvent.js';

// Session endpoints — device list + explicit revocation.

/** GET /api/users/sessions — active devices */
export const getSessions = async (req, res, next) => {
    try {
        const sessions = await listSessions({ userId: req.user.id });
        res.json({ sessions });
    } catch (err) { next(err); }
};

/** DELETE /api/users/sessions/:familyId — revoke one device */
export const revokeOne = async (req, res, next) => {
    try {
        const ok = await revokeSession({ userId: req.user.id, familyId: req.params.familyId });
        if (!ok) return res.status(404).json({ msg: 'Active session not found' });
        await audit({ actorId: req.user.id, action: 'session.revoked', targetType: 'session', targetId: req.params.familyId });
        res.json({ msg: 'Session revoked' });
    } catch (err) { next(err); }
};

/** DELETE /api/users/sessions — revoke all other devices */
export const revokeAll = async (req, res, next) => {
    try {
        const count = await revokeAllSessions({ userId: req.user.id, exceptFamilyId: req.body?.exceptFamilyId || null });
        await audit({ actorId: req.user.id, action: 'session.revoked_all', after: { count } });
        res.json({ msg: `${count} session(s) revoked` });
    } catch (err) { next(err); }
};
