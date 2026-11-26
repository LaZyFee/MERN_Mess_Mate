import { randomBytes } from 'node:crypto';
import { sendAuthResponse } from './userController.js';
// TOTP 2FA controller (B3.2) — /api/users/2fa and login step-up.

import User from '../models/User.js';
import bcrypt from 'bcrypt';
import {
    generateTOTPSecret,
    verifyTOTP,
    buildOTPAuthURL,
    generateRecoveryCodes,
    verifyRecoveryCode,
    encryptSecret,
    decryptSecret,
} from '../utils/totp.js';
import { validate } from '../validation/validate.js';
import TOTPChallenge from '../models/TOTPChallenge.js';

const CHALLENGE_TTL = 5 * 60 * 1000;
export const makeChallenge = async (userId) => {
    const id = randomBytes(16).toString('hex');
    await TOTPChallenge.create({
        challengeId: id,
        userId,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL),
    });
    return id;
};

const consumeChallenge = async (id) => {
    const now = new Date();
    return TOTPChallenge.findOneAndUpdate(
        { challengeId: id, used: false, expiresAt: { $gt: now } },
        { $set: { used: true } },
        { new: true }
    ).lean();
};

export { totpSetupSchema as setupSchema, totpVerifySchema as verifySchema, totpDisableSchema as disableSchema, totpLoginSchema as login2faSchema } from '../validation/featureSchemas.js';

export const setup = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.twoFactor?.enabled) {
            return res.status(409).json({ msg: '2FA already enabled', code: 'TWO_FA_ALREADY_ENABLED' });
        }

        const secret = generateTOTPSecret();
        user.twoFactor = {
            enabled: false,
            secretEnc: encryptSecret(secret),
            enabledAt: null,
            recoveryCodesHash: [],
        };
        await user.save();

        const otpauthUrl = buildOTPAuthURL(secret, user.email, 'MealMate');
        res.json({
            secret,
            otpauthUrl,
            message: 'Scan the QR code, then verify with /verify to enable 2FA',
        });
    } catch (err) { next(err); }
};

export const verify = async (req, res, next) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.twoFactor?.enabled) {
            return res.status(409).json({ msg: '2FA already enabled', code: 'TWO_FA_ALREADY_ENABLED' });
        }
        if (!user.twoFactor?.secretEnc) {
            return res.status(400).json({ msg: 'No pending setup — call /setup first', code: 'TWO_FA_NO_SETUP' });
        }

        const secret = decryptSecret(user.twoFactor.secretEnc);
        if (!verifyTOTP(secret, code)) {
            return res.status(400).json({ msg: 'Invalid verification code', code: 'TWO_FA_INVALID_CODE' });
        }

        const { codes, hashes } = generateRecoveryCodes(8);
        user.twoFactor.enabled = true;
        user.twoFactor.enabledAt = new Date();
        user.twoFactor.recoveryCodesHash = hashes;
        await user.save();

        const { recordSecurityEvent } = await import('../models/SecurityEvent.js');
        await recordSecurityEvent({
            userId: user._id,
            type: 'new_device',
            ip: req.ip,
            ua: req.headers['user-agent'] || '',
            meta: { event: '2fa_enabled' },
        });

        res.json({ msg: '2FA enabled', recoveryCodes: codes });
    } catch (err) { next(err); }
};

export const disable = async (req, res, next) => {
    try {
        const { password, code } = req.body;
        const user = await User.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (!user.twoFactor?.enabled) {
            return res.status(400).json({ msg: '2FA not enabled', code: 'TWO_FA_NOT_ENABLED' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(403).json({ msg: 'Invalid password', code: 'TWO_FA_INVALID_PASSWORD' });
        }

        let ok = false;
        if (user.twoFactor.secretEnc) {
            const secret = decryptSecret(user.twoFactor.secretEnc);
            ok = verifyTOTP(secret, code);
        }
        if (!ok && user.twoFactor.recoveryCodesHash) {
            const idx = user.twoFactor.recoveryCodesHash.findIndex(h =>
                verifyRecoveryCode(code, h)
            );
            if (idx !== -1) {
                ok = true;
                user.twoFactor.recoveryCodesHash.splice(idx, 1);
            }
        }
        if (!ok) {
            return res.status(400).json({ msg: 'Invalid code', code: 'TWO_FA_INVALID_CODE' });
        }

        user.twoFactor.enabled = false;
        user.twoFactor.secretEnc = '';
        user.twoFactor.enabledAt = null;
        user.twoFactor.recoveryCodesHash = [];
        await user.save();

        res.json({ msg: '2FA disabled' });
    } catch (err) { next(err); }
};

export const loginChallenge = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.password) {
            return res.status(400).json({ msg: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
        }
        if (user.suspended) return res.status(403).json({ msg: 'Account suspended' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

        if (!user.twoFactor?.enabled) {
            return await sendAuthResponse(res, user, 200, req, ['pwd'], { twoFactorRequired: false });
        }

        const challengeId = await makeChallenge(user.id);
        return res.json({
            twoFactorRequired: true,
            challengeToken: challengeId,
            msg: '2FA verification required',
        });
    } catch (err) { next(err); }
};

export const login2fa = async (req, res, next) => {
    try {
        const { challengeToken, code } = req.body;
        const challenge = await consumeChallenge(challengeToken);
        if (!challenge) {
            return res.status(403).json({ msg: 'Invalid or expired challenge', code: 'TWO_FA_INVALID_CHALLENGE' });
        }

        const user = await User.findById(challenge.userId);
        if (user?.suspended) return res.status(403).json({ msg: 'Account suspended' });
        if (!user || !user.twoFactor?.enabled) {
            return res.status(403).json({ msg: '2FA not enabled for this user', code: 'TWO_FA_NOT_ENABLED' });
        }

        let ok = false;
        if (user.twoFactor.secretEnc) {
            const secret = decryptSecret(user.twoFactor.secretEnc);
            ok = verifyTOTP(secret, code);
        }
        if (!ok && user.twoFactor.recoveryCodesHash) {
            const idx = user.twoFactor.recoveryCodesHash.findIndex(h =>
                verifyRecoveryCode(code, h)
            );
            if (idx !== -1) {
                ok = true;
                user.twoFactor.recoveryCodesHash.splice(idx, 1);
                await user.save();
            }
        }
        if (!ok) {
            return res.status(400).json({ msg: 'Invalid verification code', code: 'TWO_FA_INVALID_CODE' });
        }

        return await sendAuthResponse(res, user, 200, req, ['pwd', 'otp'], { twoFactorRequired: false, msg: '2FA verified — session established' });
    } catch (err) { next(err); }
};
