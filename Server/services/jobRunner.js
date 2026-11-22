import crypto from 'crypto';
import { JobLock, JobRun } from '../models/JobRun.js';

// jobRunner — safe cron execution with distributed lock + run log.
// Pure lock-decision logic lives in jobRunner.rules.js (unit-tested).

const DEFAULT_TTL_MS = 10 * 60 * 1000;

/**
 * Claim the job lock. Returns true if this caller owns it now.
 * A duplicate-key error means someone else inserted first -> not ours.
 */
export const claimLock = async (name, owner, lockedUntil) => {
    try {
        const doc = await JobLock.findOneAndUpdate(
            { name, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: new Date() } }] },
            { $set: { lockedUntil, owner } },
            { upsert: true, new: true }
        );
        return doc.owner === owner;
    } catch (err) {
        if (err.code === 11000) return false; // someone else holds/claimed it
        throw err;
    }
};

export const releaseLock = async (name, owner) => {
    await JobLock.updateOne({ name, owner }, { $set: { lockedUntil: new Date(0) } });
};

/**
 * Run `fn` under the job lock. Returns { skipped: true } when the lock is held.
 */
export const runJob = async (name, fn, { ttlMs = DEFAULT_TTL_MS, now = new Date() } = {}) => {
    const owner = `${process.pid}:${crypto.randomUUID()}`;
    const lockedUntil = new Date(now.getTime() + ttlMs);
    if (!(await claimLock(name, owner, lockedUntil))) return { skipped: true };

    const startedAt = new Date();
    let status = 'ok';
    let processed = 0;
    let failed = 0;
    let error = null;
    try {
        const result = await fn(now);
        processed = result?.processed ?? 0;
        failed = result?.failed ?? 0;
    } catch (err) {
        status = 'failed';
        error = String(err?.message || err).slice(0, 500);
    } finally {
        await JobRun.create({ name, startedAt, finishedAt: new Date(), status, processed, failed, error });
        try { await releaseLock(name, owner); } catch { /* lock expires via TTL */ }
    }
    return { skipped: false, status, processed, failed, error };
};

/** GET /api/admin/jobs helper — last run + lock state per job. */
export const jobStatuses = async () => {
    const locks = await JobLock.find({}).lean();
    const names = locks.map(l => l.name);
    const lastRuns = await JobRun.aggregate([
        { $match: { name: { $in: names } } },
        { $sort: { startedAt: -1 } },
        { $group: { _id: '$name', run: { $first: '$$ROOT' } } },
    ]);
    const byName = Object.fromEntries(lastRuns.map(r => [r._id, r.run]));
    return locks.map(l => ({
        name: l.name,
        lockedUntil: l.lockedUntil,
        locked: l.lockedUntil && l.lockedUntil > new Date(),
        lastRun: byName[l.name]
            ? {
                startedAt: byName[l.name].startedAt,
                finishedAt: byName[l.name].finishedAt,
                status: byName[l.name].status,
                processed: byName[l.name].processed,
                failed: byName[l.name].failed,
                error: byName[l.name].error,
            }
            : null,
    }));
};
