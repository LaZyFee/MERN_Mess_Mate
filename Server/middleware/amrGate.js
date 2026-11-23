// Admin AMR gate (B3.2) — platform admin routes require 2FA (amr contains 'otp').
// If 2FA is not enforced, returns generic 404 so non-2FA users cannot confirm
// these endpoints exist.

import jwt from 'jsonwebtoken';

export const requireAdminAMR = (req, res, next) => {
    const token =
        req.header('x-auth-token') ||
        (req.headers.authorization || '').startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null;

    if (!token) {
        return res.status(404).json({ msg: 'Not found' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(404).json({ msg: 'Not found' });
    }

    const amr = decoded?.user?.amr || [];
    if (!Array.isArray(amr) || !amr.includes('otp')) {
        return res.status(404).json({ msg: 'Not found' });
    }

    next();
};

export default requireAdminAMR;