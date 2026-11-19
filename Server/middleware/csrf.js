// CSRF protection middleware for cookie-authenticated mutations (Doc §15)

export const csrfProtection = (req, res, next) => {
    // Safe HTTP methods don't modify state
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Direct API clients sending Bearer token or custom header bypass browser CSRF
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return next();
    }

    const customHeader = req.headers['x-requested-with'] || req.headers['x-csrf-token'];
    if (customHeader) {
        return next();
    }

    // Check Origin / Referer against allowed frontends
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',').map(o => o.trim());

    if (!origin || allowedOrigins.includes(origin)) {
        return next();
    }

    return res.status(403).json({ msg: 'CSRF check failed: Origin not allowed' });
};

export default csrfProtection;

