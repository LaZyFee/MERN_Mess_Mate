// Admin AMR gate (B3.2) — platform admin routes require 2FA (amr contains 'otp').
// If 2FA is not enforced, returns generic 404 so non-2FA users cannot confirm
// these endpoints exist.

export const requireAdminAMR = (req, res, next) => {
    if (!req.user?.amr?.includes('otp')) {
        return res.status(404).json({ msg: 'Not found' });
    }
    next();
};

export default requireAdminAMR;
