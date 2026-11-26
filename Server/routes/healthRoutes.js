import { Router } from 'express';
import mongoose from 'mongoose';
import { getSchedulerHeartbeat } from '../services/schedulerService.js';

// Unauthenticated readiness probe (S3.1) — liveness of the process, the DB and the
// scheduler heartbeat. Never returns tenant data, credentials or stack traces.
const router = Router();

router.get('/', async (req, res) => {
    const startedAt = Date.now();
    let db = { ok: false, latencyMs: null };
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            db = { ok: true, latencyMs: Date.now() - startedAt };
        }
    } catch {
        db = { ok: false, latencyMs: Date.now() - startedAt };
    }

    const scheduler = getSchedulerHeartbeat();
    const ok = db.ok;
    res.status(ok ? 200 : 503).json({
        status: ok ? 'ok' : 'degraded',
        uptimeSec: Math.round(process.uptime()),
        db,
        scheduler: {
            running: scheduler.running,
            lastTickAt: scheduler.lastTickAt,
            staleSec: scheduler.lastTickAt ? Math.round((Date.now() - new Date(scheduler.lastTickAt).getTime()) / 1000) : null,
        },
        time: new Date().toISOString(),
    });
});

export default router;
