import { randomBytes } from 'node:crypto';
// CSRF protection: double-submit cookie + header on top of existing Origin check (Doc §15 / §19.1).
// Cookie-authenticated mutations require x-csrf-token === mm_csrf cookie value.
// Bearer-token / direct API clients bypass.

const CSRF_COOKIE = 'mm_csrf';

const getCookie = (req, name) => {
    const header = req.headers?.cookie;
    if (!header) return null;
    const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

export const csrfProtection = (req, res, next) => {
    // Safe HTTP methods don't modify state
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Public auth endpoints (register/login/forgot-password/reset-password)
    // create or reset sessions — there is no existing authenticated session
    // to hijack, so CSRF double-submit is not applicable. Skip the check
    // unconditionally even if auth cookies happen to be present.
    const publicAuthPaths = [
        '/api/users/register',
        '/api/users/login',
        '/api/users/forgot-password',
        '/api/users/reset-password',
    ];
    if (publicAuthPaths.includes(req.path)) {
        return next();
    }

    // --- Cookie-authenticated path: require double-submit ---
    // Requests carrying no auth cookies at all (refresh by body token)
    // cannot ride someone else's cookies — skip the check.
    const hasAuthCookies = !!getCookie(req, 'mm_at') || !!getCookie(req, 'refreshToken');
    if (!hasAuthCookies) {
        return next();
    }
    const csrfCookie = getCookie(req, CSRF_COOKIE);
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ msg: 'CSRF check failed: missing or mismatched token' });
    }

    // Existing Origin / Referer check
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',').map(o => o.trim());

    if (!origin || allowedOrigins.includes(origin)) {
        return next();
    }

    return res.status(403).json({ msg: 'CSRF check failed: Origin not allowed' });
};

// Helper for controllers to set the mm_csrf cookie on login/register responses (X-Client: web)
export const setCSRFCookie = (res) => {
    const token = randomBytes(16).toString('hex');
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite = isProd ? 'Strict' : 'Lax';
    const flags = [
        `${CSRF_COOKIE}=${token}`,
        'Path=/',
        `SameSite=${sameSite}`,
    ];
    if (isProd) flags.push('Secure');
    res.append('Set-Cookie', flags.join('; '));
    return token;
};

export default csrfProtection;


