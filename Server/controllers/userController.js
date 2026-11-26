import {
    listSessions, createSession, rotateSession, revokeSession, revokeAllSessions,
} from '../services/sessionService.js';
import User from '../models/User.js';
import MessGroup from '../models/MessGroup.js';
import Membership from '../models/Membership.js';
import Meal from '../models/Meal.js';
import GuestMeal from '../models/GuestMeal.js';
import Expense from '../models/Expense.js';
import MoneyTransaction from '../models/MoneyTransaction.js';
import AuditEvent from '../models/AuditEvent.js';
import Note from '../models/Note.js';
import bcrypt from 'bcrypt';
import cloudinary from '../config/cloudinary.js';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import {
    signAccessToken, signRefreshToken, saveRefreshToken, clearRefreshToken,
    verifyRefreshToken, randomToken, setRefreshTokenCookie, clearRefreshTokenCookie,
    getCookie, setRefreshTokenCookieWide, setAccessTokenCookie, clearAccessTokenCookie,
} from '../utils/tokens.js';
import { setCSRFCookie } from '../middleware/csrf.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/mailer.js';

const safeUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    profilePic: user.profilePic,
    isVerified: user.isVerified,
});

export const sendAuthResponse = async (res, user, status = 200, req = null, amr, extra = {}) => {
    const accessToken = signAccessToken({ id: user.id, amr });
    const { rawToken, familyId } = await createSession({
        user,
        deviceId: req?.headers['x-device-id'] || 'unknown',
        userAgent: req?.headers['user-agent'] || '',
        ip: req?.ip || '',
    });

    const isWeb = req && req.headers['x-client'] === 'web';
    const refreshCookieValue = `${familyId}:${rawToken}`;

    if (isWeb) {
        // Cookie-only: set HttpOnly cookies, omit tokens from JSON body
        setAccessTokenCookie(res, accessToken);
        setRefreshTokenCookieWide(res, refreshCookieValue); // widened path for BFF
        setCSRFCookie(res);
        res.status(status).json({ user: safeUser(user), ...extra });
    } else {
        setRefreshTokenCookie(res, refreshCookieValue);
        res.status(status).json({
            user: safeUser(user), ...extra,
            accessToken,
            refreshToken: refreshCookieValue,
        });
    }
};

// Register
export const register = [
    validate(registerSchema),
    async (req, res, next) => {
        try {
            const { username, email, password, phone } = req.body;

            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ msg: 'User already exists' });

            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);

            // Email verification token (sent only if SMTP configured)
            const verifyToken = randomToken();

            const now = new Date();
            const user = await User.create({
                username,
                email,
                password: hashed,
                phone,
                whatsapp: req.body.whatsapp || '',
                verifyEmailToken: verifyToken,
                isVerified: false,
                termsAcceptedAt: now,
                privacyAcceptedAt: now,
                emailNotificationsConsentAt: now,
            });

            await sendVerificationEmail(user, verifyToken);
            await sendAuthResponse(res, user, 201, req);
        } catch (err) {
            if (err.code === 11000) return res.status(400).json({ msg: 'User already exists' });
            next(err);
        }
    },
];

// Login
export const login = [
    validate(loginSchema),
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email }).select('+password');
            const invalid = { msg: 'Invalid Credentials' };
            if (!user || !user.password) return res.status(400).json(invalid);
            if (user.suspended) return res.status(403).json({ msg: 'Account suspended' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json(invalid);

            // If 2FA is enabled, require step-up verification before issuing tokens
            if (user.twoFactor?.enabled) {
                const { makeChallenge } = await import('./totpController.js');
                const challengeId = await makeChallenge(user.id);
                return res.json({
                    twoFactorRequired: true,
                    challengeToken: challengeId,
                    msg: '2FA verification required',
                });
            }

            await sendAuthResponse(res, user, 200, req);
        } catch (err) {
            next(err);
        }
    },
];

// POST /api/users/refresh — exchange a valid refresh token for a new access token (rotation)
export const refresh = async (req, res, next) => {
    try {
        const refreshToken = req.body?.refreshToken || getCookie(req, 'refreshToken');
        if (!refreshToken) return res.status(400).json({ msg: 'Refresh token required' });

        // New format: familyId:rawToken → CAS rotation on Session.currentTokenHash
        const colonIdx = refreshToken.lastIndexOf(':');
        if (colonIdx !== -1) {
            const familyId = refreshToken.slice(0, colonIdx);
            const rawToken = refreshToken.slice(colonIdx + 1);

            const result = await rotateSession({ rawToken, ip: req.ip || '' });
            if (!result) return res.status(401).json({ msg: 'Invalid or expired refresh token' });
            if (result.user.suspended) return res.status(403).json({ msg: 'Account suspended' });

            const newCookieValue = `${familyId}:${result.newToken}`;
            const accessToken = signAccessToken({ id: result.user.id, amr: req.user?.amr });
            const isWeb = req && req.headers['x-client'] === 'web';

            if (isWeb) {
                setAccessTokenCookie(res, accessToken);
                setRefreshTokenCookieWide(res, newCookieValue);
                setCSRFCookie(res);
                res.status(200).json({ user: safeUser(result.user) });
            } else {
                setRefreshTokenCookie(res, newCookieValue);
                res.status(200).json({
                    user: safeUser(result.user),
                    accessToken,
                    refreshToken: newCookieValue,
                });
            }
            return;
        }

        // Legacy format: plain JWT refresh token stored in User.refreshToken
        // Accepted until LEGACY_REFRESH_SUNSET env date, then rejected.
        const sunset = process.env.LEGACY_REFRESH_SUNSET;
        if (sunset && new Date() > new Date(sunset)) {
            return res.status(401).json({ msg: 'Legacy refresh tokens no longer accepted' });
        }
        const user = await verifyRefreshToken(User, refreshToken);
        if (!user) return res.status(401).json({ msg: 'Invalid or expired refresh token' });
        if (user.suspended) return res.status(403).json({ msg: 'Account suspended' });

        // Migrate legacy token to a new Session family
        const { rawToken: newRawToken, familyId: newFamilyId } = await createSession({
            user,
            deviceId: req?.headers['x-device-id'] || 'unknown',
            userAgent: req?.headers['user-agent'] || '',
            ip: req?.ip || '',
        });
        const newCookieValue = `${newFamilyId}:${newRawToken}`;
        const accessToken = signAccessToken({ id: user.id, amr: req.user?.amr });
        const isWeb = req && req.headers['x-client'] === 'web';

        if (isWeb) {
            setAccessTokenCookie(res, accessToken);
            setRefreshTokenCookieWide(res, newCookieValue);
            setCSRFCookie(res);
            res.status(200).json({ user: safeUser(user) });
        } else {
            setRefreshTokenCookie(res, newCookieValue);
            res.status(200).json({
                user: safeUser(user),
                accessToken,
                refreshToken: newCookieValue,
            });
        }
    } catch (err) {
        next(err);
    }
};

// POST /api/users/logout — invalidate the stored refresh token and clear all cookies
export const logout = async (req, res, next) => {
    try {
        const refreshToken = req.body?.refreshToken || getCookie(req, 'refreshToken');
        if (refreshToken) {
            const colonIdx = refreshToken.lastIndexOf(':');
            if (colonIdx !== -1) {
                const familyId = refreshToken.slice(0, colonIdx);
                const rawToken = refreshToken.slice(colonIdx + 1);
                let decoded;
                try {
                    decoded = jwt.verify(rawToken, process.env.JWT_REFRESH_SECRET);
                } catch {}
                if (decoded?.user?.id) {
                    await revokeSession({ userId: decoded.user.id, familyId });
                }
            }
        }
        clearRefreshTokenCookie(res);
        clearRefreshTokenCookie(res, '/api');
        clearAccessTokenCookie(res);
        // Clear CSRF cookie
        const isProd = process.env.NODE_ENV === 'production';
        const sameSite = isProd ? 'Strict' : 'Lax';
        res.append('Set-Cookie', [
            'mm_csrf=',
            'HttpOnly',
            'Path=/',
            'Max-Age=0',
            'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
            `SameSite=${sameSite}`,
            ...(isProd ? ['Secure'] : []),
        ].join('; '));
        res.json({ msg: 'Logged out' });
    } catch (err) {
        next(err);
    }
};

// PUT /api/users/profile — update username/phone/whatsapp (whatsapp optional, used for WA summaries)
export const updateProfile = [
    validate(updateProfileSchema),
    async (req, res, next) => {
        try {
            const updates = {};
            for (const k of ['username', 'phone', 'whatsapp']) {
                if (req.body[k] !== undefined) updates[k] = req.body[k];
            }
            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ msg: 'Nothing to update' });
            }

            const user = await User.findByIdAndUpdate(req.user.id, updates, {
                new: true,
            }).select('-twoFactor.secretEnc -twoFactor.recoveryCodesHash -password -refreshToken -resetPasswordToken -verifyEmailToken');

            res.json({ msg: 'Profile updated', user });
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/users/groups/:groupId/members — co-member directory (privacy: only if you share the group)
export const getGroupMembersDirectory = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).select('members admin').lean();
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        const isMember = group.admin?.equals?.(req.user.id) ||
            String(group.admin) === req.user.id ||
            group.members.some(m => String(m.user) === req.user.id);
        if (!isMember) {
            // Generic 404 — do not reveal the group's existence to outsiders
            return res.status(404).json({ msg: 'Group not found' });
        }

        const ids = group.members.map(m => m.user).filter(Boolean);
        const users = await User.find({ _id: { $in: ids } })
            .select('username profilePic whatsapp') // email & phone stay private
            .lean();
        res.json({ members: users });
    } catch (err) { next(err); }
};

// Profile
export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-twoFactor.secretEnc -twoFactor.recoveryCodesHash -password -refreshToken -resetPasswordToken -verifyEmailToken');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        next(err);
    }
};

// POST /api/users/forgot-password
export const forgotPassword = [
    validate(forgotPasswordSchema),
    async (req, res, next) => {
        try {
            const user = await User.findOne({ email: req.body.email });
            // Always return success — don't reveal whether the email exists (user enumeration)
            if (user) {
                const token = randomToken();
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
                await user.save();
                await sendPasswordResetEmail(user, token);
            }
            res.json({ msg: 'If that email exists, a reset link has been sent' });
        } catch (err) {
            next(err);
        }
    },
];

// POST /api/users/reset-password
export const resetPassword = [
    validate(resetPasswordSchema),
    async (req, res, next) => {
        try {
            const { token, password } = req.body;

            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() },
            });
            if (!user) return res.status(400).json({ msg: 'Invalid or expired reset token' });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await revokeAllSessions({ userId: user.id }); // revoke all Session families on password reset
            user.refreshToken = null; // clear legacy hash too
            await user.save();

            res.json({ msg: 'Password reset successful' });
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/users/verify-email/:token
export const verifyEmail = async (req, res, next) => {
    try {
        const user = await User.findOne({ verifyEmailToken: req.params.token });
        if (!user) return res.status(400).json({ msg: 'Invalid verification token' });

        user.isVerified = true;
        user.verifyEmailToken = undefined;
        await user.save();

        res.json({ msg: 'Email verified' });
    } catch (err) {
        next(err);
    }
};

// POST /api/users/change-password (authenticated)
export const changePassword = [
    validate(changePasswordSchema),
    async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id).select('+password');
            const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.newPassword, salt);
            // Revoke all Session families so every device must re-login (D1).
            await revokeAllSessions({ userId: req.user.id });
            user.refreshToken = null; // clear legacy hash too
            await user.save();

            res.json({ msg: 'Password changed' });
        } catch (err) {
            next(err);
        }
    },
];

// POST /api/users/profile-pic (authenticated, multipart form field "image")
export const uploadProfilePic = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ msg: 'No image uploaded (field name: "image")' });

        // Wrap the stream upload in a promise
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'mealmate/profiles',
                    resource_type: 'image',
                    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
                },
                (err, r) => (err ? reject(err) : resolve(r))
            );
            stream.end(req.file.buffer);
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profilePic: result.secure_url },
            { new: true }
        ).select('-twoFactor.secretEnc -twoFactor.recoveryCodesHash -password -refreshToken -resetPasswordToken -verifyEmailToken');

        res.json({ msg: 'Profile picture updated', profilePic: result.secure_url, user });
    } catch (err) {
        next(err);
    }
};

// Google OAuth callback
export const googleAuth = async (req, res) => {
    const user = req.user; // attached by passport
    if (user.suspended) return res.status(403).json({ msg: 'Account suspended' });
    const frontend = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',')[0].trim();
    if (user.twoFactor?.enabled) {
        // Resume through the existing credential + OTP flow.
        return res.redirect(frontend + '/login');
    }
    const { rawToken, familyId } = await createSession({ user });
    const refreshToken = `${familyId}:${rawToken}`;
    setAccessTokenCookie(res, signAccessToken(user));
    setRefreshTokenCookieWide(res, refreshToken);
    setCSRFCookie(res);
    return res.redirect(frontend + '/login/success');
};

// ---------- Download my data ---------- (todo item 13)
// GET /api/users/download-my-data — exports all personal data as JSON
export const downloadMyData = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Gather all data belonging to this user across collections
        const [user, memberships, meals, guestMeals, expenses, moneyTx, sessions, auditEvents, inboxNotes] = await Promise.all([
            User.findById(userId).select('-twoFactor.secretEnc -twoFactor.recoveryCodesHash -password -refreshToken -resetPasswordToken -verifyEmailToken').lean(),
            Membership.find({ user: userId }).lean(),
            Meal.find({ userId }).lean(),
            GuestMeal.find({ hostUserId: userId }).lean(),
            Expense.find({ createdBy: userId }).lean(),
            MoneyTransaction.find({ submittedBy: userId }).lean(),
            listSessions({ userId }),
            AuditEvent.find({ actorId: userId }).sort({ createdAt: -1 }).limit(200).lean(),
            Note.find({ authorUserId: userId }).sort({ createdAt: -1 }).limit(100).lean(),
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            user,
            memberships,
            meals,
            guestMeals,
            expenses,
            moneyTransactions: moneyTx,
            sessions: sessions || [],
            auditEvents,
            notes: inboxNotes,
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="mealmate-my-data-${new Date().toISOString().slice(0, 10)}.json"`);
        res.json(exportData);
    } catch (err) { next(err); }
};
