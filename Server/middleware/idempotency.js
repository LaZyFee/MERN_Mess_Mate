import IdempotencyRecord from '../models/IdempotencyRecord.js';
import crypto from 'crypto';

// Idempotency middleware for retriable financial mutations.
// Client sends `Idempotency-Key` header. First call stores the response;
// replays with the same key+hash return the stored response; same key with a
// different body → 409 conflict.

const IDLE_TTL_HOURS = 24;

export const idempotent = (operation) => async (req, res, next) => {
    const key = req.header('Idempotency-Key');
    if (!key) return next(); // optional unless route demands it

    const requestHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(req.body || {}) + JSON.stringify(req.params || {}))
        .digest('hex');

    const groupId = req.params.groupId || req.group?._id || null;

    try {
        const existing = await IdempotencyRecord.findOne({
            groupId, actorId: req.user.id, operation, key,
        });
        if (existing) {
            if (existing.requestHash !== requestHash) {
                return res.status(409).json({ msg: 'Idempotency key reused with a different request body' });
            }
            if (existing.resultBody) {
                return res.status(200).json({ ...existing.resultBody, __idempotentReplay: true });
            }
            return res.status(409).json({ msg: 'Request with this key is still processing' });
        }

        await IdempotencyRecord.create({
            groupId, actorId: req.user.id, operation, key, requestHash,
            expiresAt: new Date(Date.now() + IDLE_TTL_HOURS * 3600 * 1000),
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ msg: 'Duplicate idempotency key — retry shortly' });
        }
        return next(err);
    }

    // wrap res.json to capture the result once
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        IdempotencyRecord.updateOne(
            { groupId, actorId: req.user.id, operation, key },
            { resultBody: body, resultType: res.statusCode }
        ).catch(() => { });
        return originalJson(body);
    };
    next();
};
