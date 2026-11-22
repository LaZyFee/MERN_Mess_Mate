import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TTL = '1h';
const REFRESH_TTL_DAYS = 7;

export const signAccessToken = (user) => {
    const payload = { user: { id: user.id } };
    if (user.amr) payload.user.amr = user.amr;
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
};

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

// Cookie helpers for HttpOnly, SameSite token transport (Doc §15)
export const getCookie = (req, name) => {
    const header = req.headers?.cookie;
    if (!header) return null;
    const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

export const setRefreshTokenCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = REFRESH_TTL_DAYS * 24 * 60 * 60; // seconds
    const sameSite = isProd ? 'Strict' : 'Lax';
    const flags = [
        `refreshToken=${encodeURIComponent(token)}`,
        'HttpOnly',
        'Path=/api/users',
        `Max-Age=${maxAge}`,
        `SameSite=${sameSite}`,
    ];
    if (isProd) flags.push('Secure');
    res.setHeader('Set-Cookie', flags.join('; '));
};

export const clearRefreshTokenCookie = (res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const flags = [
        'refreshToken=',
        'HttpOnly',
        'Path=/api/users',
        'Max-Age=0',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        `SameSite=${isProd ? 'Strict' : 'Lax'}`,
    ];
    if (isProd) flags.push('Secure');
    res.setHeader('Set-Cookie', flags.join('; '));
};

// ---- Access token cookie (mm_at) ----
export const setAccessTokenCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'Strict' : 'Lax';
    const maxAge = 60 * 60; // 1 hour
    const flags = [
        'mm_at=' + encodeURIComponent(token),
        'HttpOnly',
        'Path=/',
        `Max-Age=${maxAge}`,
        `SameSite=${sameSite}`,
    ];
    if (isProd) flags.push('Secure');
    res.setHeader('Set-Cookie', flags.join('; '));
};

export const clearAccessTokenCookie = (res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'Strict' : 'Lax';
    const flags = [
        'mm_at=',
        'HttpOnly',
        'Path=/',
        'Max-Age=0',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        `SameSite=${sameSite}`,
    ];
    if (isProd) flags.push('Secure');
    res.setHeader('Set-Cookie', flags.join('; '));
};

// Widen refresh cookie path for BFF refresh route (Section 5 item 3).
// Default path is /api/users; BFF needs /api/users/refresh accessible.
// Call with pathOverride='/api' or '/' to cover BFF proxy routes.
export const setRefreshTokenCookieWide = (res, token, pathOverride = '/api') => {
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'Strict' : 'Lax';
    const maxAge = REFRESH_TTL_DAYS * 24 * 60 * 60;
    const flags = [
        'refreshToken=' + encodeURIComponent(token),
        'HttpOnly',
        `Path=${pathOverride}`,
        `Max-Age=${maxAge}`,
        `SameSite=${sameSite}`,
    ];
    if (isProd) flags.push('Secure');
    res.setHeader('Set-Cookie', flags.join('; '));
};
