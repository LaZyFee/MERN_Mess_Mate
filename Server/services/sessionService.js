import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';

// Session service — per-device refresh-token families with rotation history,
// reuse detection (family-wide revocation) and explicit revocation lists.

export const REFRESH_TTL_DAYS = 7;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Create a new session (device login). Returns { rawToken, familyId, session }. */
export const createSession = async ({ user, deviceId = 'unknown', userAgent = '', ip = '' }) => {
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400000);
    const rawToken = jwt.sign(
        { user: { id: user.id }, type: 'refresh', jti: crypto.randomBytes(16).toString('hex'), fam: familyId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: `${REFRESH_TTL_DAYS}d` }
    );
    const session = await Session.create({
        userId: user.id, familyId, deviceId, userAgent, ip,
        currentTokenHash: hash(rawToken),
        expiresAt,
    });
    return { rawToken, familyId, session };
};

/**
 * Rotate: verify the presented refresh token against the family's current hash.
 * - valid → issue new token in the same family, push old hash to history
 * - token found in history (stale replay) → revoke the whole family, return null
 */
export const rotateSession = async ({ rawToken, ip = '' }) => {
    let decoded;
    try {
        decoded = jwt.verify(rawToken, process.env.JWT_REFRESH_SECRET);
    } catch {
        return null;
    }
    if (decoded.type !== 'refresh' || !decoded.fam) return null;

    const session = await Session.findOne({ familyId: decoded.fam });
    if (!session) return null;

    const h = hash(rawToken);

    // stale token replay → revoke family
    if (session.previousTokenHashes.includes(h)) {
        await Session.findByIdAndUpdate(session._id, { revokedAt: new Date(), revokedReason: 'refresh_token_reuse', reusedAt: new Date() });
        return null;
    }

    if (session.currentTokenHash !== h || session.revokedAt || session.expiresAt < new Date()) return null;

    const newToken = jwt.sign(
        { user: { id: decoded.user.id }, type: 'refresh', jti: crypto.randomBytes(16).toString('hex'), fam: decoded.fam },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: `${REFRESH_TTL_DAYS}d` }
    );

    session.previousTokenHashes.push(session.currentTokenHash);
    if (session.previousTokenHashes.length > 5) session.previousTokenHashes.shift();
    session.currentTokenHash = hash(newToken);
    session.ip = ip || session.ip;
    await session.save();

    const user = await User.findById(decoded.user.id);
    return { user, session, newToken };
};

/** Revoke one session (logout of a device). */
export const revokeSession = async ({ userId, familyId }) => {
    const result = await Session.findOneAndUpdate(
        { familyId, userId, revokedAt: null },
        { revokedAt: new Date(), revokedReason: 'user_logout' },
        { new: true }
    );
    return Boolean(result);
};

/** Revoke all sessions of a user (password change/reset). */
export const revokeAllSessions = async ({ userId, exceptFamilyId = null }) => {
    const filter = { userId, revokedAt: null };
    if (exceptFamilyId) filter.familyId = { $ne: exceptFamilyId };
    const result = await Session.updateMany(filter, { revokedAt: new Date(), revokedReason: 'revoked_all' });
    return result.modifiedCount;
};

/** List active sessions for the account page. */
export const listSessions = ({ userId, currentFamilyId = null }) =>
    Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
        .select('familyId deviceId userAgent ip createdAt expiresAt')
        .sort({ createdAt: -1 })
        .lean()
        .then((sessions) => sessions.map((session) => ({
            ...session,
            isCurrent: Boolean(currentFamilyId && session.familyId === currentFamilyId),
        })));
