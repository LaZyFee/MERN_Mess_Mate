import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

// JobLock — mutex for cron jobs so overlapping ticks skip silently.

const jobLockSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    lockedUntil: { type: Date, default: null },
    owner: { type: String, default: null },
});
jobLockSchema.plugin(uniqueValidator);
const JobLock = mongoose.model('JobLock', jobLockSchema);

// JobRun — audit row of each job execution (TTL 30 days).

const jobRunSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    status: { type: String, enum: ['ok', 'failed'], required: true },
    processed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    error: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});
jobRunSchema.index({ name: 1, createdAt: -1 });
jobRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
const JobRun = mongoose.model('JobRun', jobRunSchema);

export { JobLock, JobRun };
