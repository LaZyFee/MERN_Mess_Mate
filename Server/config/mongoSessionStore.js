import { Store } from 'express-session';
import mongoose from 'mongoose';

/**
 * MongoDB-backed express-session store for the Google OAuth handshake.
 *
 * The OAuth handshake session (10-minute cookie) must NOT live in the default
 * MemoryStore because MemoryStore is per-process, leaks under load, and does
 * not survive restarts or scale past a single instance. This store persists
 * sessions to MongoDB with a TTL index so expired handshakes are reclaimed
 * automatically by the server.
 *
 * Uses only dependencies already in the project (express-session Store +
 * mongoose). No additional packages required.
 */
const sessionSchema = new mongoose.Schema(
    {
        sid: { type: String, required: true, unique: true, index: true },
        sess: { type: mongoose.Schema.Types.Mixed, required: true },
        // Absolute expiry timestamp; MongoDB TTL monitor removes the doc once
        // this date passes (runs every ~60s, which is fine for a 10-min handshake).
        expires: { type: Date, required: true },
    },
    { timestamps: false, versionKey: false }
);

sessionSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

// Distinct model name so we never collide with models/Session.js (device
// refresh-token sessions). Sessions live in the `express_sessions` collection.
const ExpressSessionModel =
    mongoose.models.ExpressSession ||
    mongoose.model('ExpressSession', sessionSchema);

export const SessionModel = ExpressSessionModel; // re-export for tests

export class MongoSessionStore extends Store {
    constructor(options = {}) {
        super(options);
        this.collectionName = options.collection || 'express_sessions';
    }

    /** Retrieve a session by sid. */
    async get(sid, cb) {
        try {
            const doc = await ExpressSessionModel.findOne({ sid }).lean();
            if (!doc) return cb();
            return cb(null, doc.sess);
        } catch (err) {
            return cb(err);
        }
    }

    /** Upsert a session keyed by sid, stamping an absolute expiry. */
    async set(sid, session, cb) {
        try {
            const maxAge = Number(session?.cookie?.maxAge) || 10 * 60 * 1000;
            await ExpressSessionModel.findOneAndUpdate(
                { sid },
                { sid, sess: session, expires: new Date(Date.now() + maxAge) },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return cb(null);
        } catch (err) {
            return cb(err);
        }
    }

    /** Destroy a session by sid. */
    async destroy(sid, cb) {
        try {
            await ExpressSessionModel.deleteOne({ sid });
            return cb(null);
        } catch (err) {
            return cb(err);
        }
    }

    /** Refresh the expiry on an existing session. */
    async touch(sid, session, cb) {
        return this.set(sid, session, cb);
    }

    /** Clear all expired sessions (best-effort; TTL index handles this). */
    async clear(cb) {
        try {
            await ExpressSessionModel.deleteMany({ expires: { $lt: new Date() } });
            return cb(null);
        } catch (err) {
            return cb(err);
        }
    }
}

export default MongoSessionStore;
