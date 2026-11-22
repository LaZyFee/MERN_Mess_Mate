// TOTP (RFC 6238) implementation using Node built-in crypto.
// No external dependencies (otplib avoided per project dependency policy).

import crypto from 'crypto';

const TOTP_INTERVAL = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';

/** Generate a random base32-encoded TOTP secret (160 bits / 32 chars). */
export const generateTOTPSecret = () => {
    const bytes = crypto.randomBytes(20);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
        secret += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[bytes[i] % 32];
    }
    return secret;
};

/** Compute the HMAC-SHA1 of a counter value using the key. */
const hmacSha1 = (key, data) =>
    crypto.createHmac('sha1', key).update(data).digest();

/** Generate a TOTP code for a given secret at time `now`. */
export const generateTOTP = (secret, now = Date.now()) => {
    // Base32-decode the secret
    let key;
    try {
        key = Buffer.from(secret, 'base32');
    } catch {
        key = Buffer.from(secret, 'utf8');
    }

    let counter = Math.floor(now / 1000 / TOTP_INTERVAL);
    const counterBuffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
        counterBuffer[i] = counter & 0xff;
        counter = counter >> 8;
    }

    const hmac = hmacSha1(key, counterBuffer);
    const offset = hmac[19] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const code = (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
    return code;
};

/** Verify a TOTP code with a window of +/-1 step. */
export const verifyTOTP = (secret, token, now = Date.now()) => {
    const expected = generateTOTP(secret, now);
    if (token === expected) return true;
    // Accept one step before/after for clock drift
    const prev = generateTOTP(secret, now - TOTP_INTERVAL * 1000);
    const next = generateTOTP(secret, now + TOTP_INTERVAL * 1000);
    return token === prev || token === next;
};

/** Build the otpauth:// URL for QR code provisioning. */
export const buildOTPAuthURL = (secret, accountName, issuer = 'MealMate') => {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&digits=6&period=30`;
};

/** Generate 8 single-use recovery codes (returned as plaintext once + stored as hashes). */
export const generateRecoveryCodes = (count = 8) => {
    const codes = [];
    const hashes = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
        hashes.push(crypto.createHash('sha256').update(code).digest('hex'));
    }
    return { codes, hashes };
};

export const verifyRecoveryCode = (code, storedHash) =>
    crypto.createHash('sha256').update(code).digest('hex') === storedHash;

/** Encrypt/decrypt helper using AES-256-GCM (for secretEnc at rest). */
const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || 'dev-fallback-key-32-bytes-long!!!';
const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export const encryptSecret = (plaintext) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

export const decryptSecret = (ciphertextBase64) => {
    const data = Buffer.from(ciphertextBase64, 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
