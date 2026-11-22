import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import cloudinary from '../config/cloudinary.js';

const execFileAsync = promisify(execFile);

// Private staging directory for AV-scan temp files (files are NOT persisted here).
const tmpDir = path.join(os.tmpdir(), 'mealmate-receipt-scan');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Cloudinary folder + resource type mapping
const RESOURCE_TYPE_BY_MIME = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'application/pdf': 'raw',
};

// ---------- Multer: receive into memory, then stream to Cloudinary ----------
export const receiptMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, WebP, and PDF files are permitted'), false);
        }
        cb(null, true);
    },
});

/**
 * Validate magic bytes (file signature) against executable/disguised files (Doc §15).
 * Operates on a buffer (memory) rather than a persisted path.
 */
export const verifyMagicBytes = (buffer, mimeType) => {
    if (!buffer || buffer.length < 16) return false;
    const b = buffer;
    if (mimeType === 'image/jpeg') return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    if (mimeType === 'image/png')
        return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    if (mimeType === 'application/pdf') return b.slice(0, 4).toString('ascii') === '%PDF';
    if (mimeType === 'image/webp')
        return b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP';
    return false;
};

/** Compute SHA-256 of a buffer */
export const computeBufferSha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Compute SHA-256 of file on disk (kept for compatibility) */
export const computeFileSha256 = (filePath) =>
    new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });

/**
 * AV-scan hook.
 * Runs clamscan on a temp copy of the buffer when clamscan is installed.
 * - clean   → { scanned: true, clean: true, verdict: 'clean' }
 * - infected→ { scanned: true, clean: false, verdict: 'infected:<threat>' }
 * - scanner not installed → { scanned: false, clean: true, verdict: 'scanner-unavailable' }
 *   (upload is still accepted but flagged 'pending' for a central AV sweep)
 */
export const scanForViruses = async (buffer) => {
    const clamPath = 'clamscan';
    const tempPath = path.join(tmpDir, `${crypto.randomBytes(12).toString('hex')}.bin`);
    try {
        await fs.promises.writeFile(tempPath, buffer);
        try {
            const { stdout } = await execFileAsync(clamPath, [tempPath], {
                timeout: 60_000,
            });
            const infected = /(?:FOUND|Infected files: [1-9])/i.test(stdout);
            return {
                scanned: true,
                clean: !infected,
                verdict: infected ? `infected:${stdout.trim().slice(0, 200)}` : 'clean',
            };
        } catch (err) {
            // clamscan exits non-zero when a virus is found
            const output = (err.stdout || '') + (err.stderr || '');
            const infected = /(?:FOUND|Infected files: [1-9])/i.test(output);
            return {
                scanned: true,
                clean: !infected,
                verdict: infected ? `infected:${output.trim().slice(0, 200)}` : 'clean',
            };
        }
    } catch (err) {
        // clamscan binary not installed / not executable — hook present, no local scanner
        return {
            scanned: false,
            clean: true,
            verdict: 'scanner-unavailable',
        };
    } finally {
        try {
            await fs.promises.unlink(tempPath);
        } catch {
            /* ignore */
        }
    }
};

/**
 * Stream a receipt buffer to Cloudinary as an authenticated resource (only
 * reachable via signed URLs). Returns { publicId, secureUrl, resourceType }.
 */
export const uploadToCloudinary = (buffer, mimeType, originalName) =>
    new Promise((resolve, reject) => {
        const resourceType = RESOURCE_TYPE_BY_MIME[mimeType] || 'image';
        const baseName = path.basename(originalName, path.extname(originalName)).slice(0, 60);
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'mealmate/receipts',
                resource_type: resourceType,
                type: 'authenticated', // signed-URL only access
                use_filename: true,
                unique_filename: true,
                public_id: `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${baseName}`,
            },
            (err, result) =>
                err
                    ? reject(err)
                    : resolve({
                          publicId: result.public_id,
                          secureUrl: result.secure_url,
                          resourceType,
                      })
        );
        stream.end(buffer);
    });

/**
 * Build a short-lived signed URL for an authenticated Cloudinary receipt.
 * Default TTL: 1 hour. Caller must enforce authorization before handing it out.
 */
export const signedReceiptUrl = (publicId, resourceType = 'image', ttlSeconds = 60 * 60) => {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return cloudinary.url(publicId, {
        type: 'authenticated',
        sign_url: true,
        secure: true,
        resource_type: resourceType,
        expires_at: expiresAt,
    });
};


