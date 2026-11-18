import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TTL = '1h';
const REFRESH_TTL_DAYS = 7;

export const signAccessToken = (user) =>
    jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

// jti (unique id) guarantees two refresh tokens signed in the same second differ,
// so rotation actually invalidates the old token
export const signRefreshToken = (user) =>
    jwt.sign({ user: { id: user.id }, type: 'refresh', jti: randomToken() }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: `${REFRESH_TTL_DAYS}d`,
    });

// Refresh tokens are stored HASHED (sha256) — a DB leak can't yield usable tokens
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const saveRefreshToken = async (User, userId, token) => {
    await User.findByIdAndUpdate(userId, { refreshToken: hashToken(token) });
};

export const clearRefreshToken = async (User, userId) => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
};

// Verify a refresh token: signature must be valid AND hash must match the stored one
export const verifyRefreshToken = async (User, token) => {
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
        return null;
    }
    if (decoded.type !== 'refresh') return null;

    const user = await User.findById(decoded.user.id);
    if (!user || !user.refreshToken) return null;
    if (user.refreshToken !== hashToken(token)) return null; // reuse/rotation guard

    return user;
};

export const randomToken = () => crypto.randomBytes(32).toString('hex');
