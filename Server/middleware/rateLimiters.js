// Join-by-code rate limiter + lockout (B3.1).
// Per-IP and per-user limits with exponential lockout after repeated failures.
// Uses in-memory Map (single-instance) — for multi-instance, back with Redis.

const IP_WINDOW = 15 * 60 * 1000;    // 15 min
const IP_MAX = 10;                  // 10 attempts per 15 min per IP
const USER_WINDOW = 60 * 60 * 1000; // 1 hour
const USER_MAX = 20;                // 20 attempts per hour per user
const LOCKOUT_THRESHOLD = 5;        // consecutive failures -> lockout
const LOCKOUT_BASE_MS = 15 * 60 * 1000; // 15 min initial lockout

// In-memory state: key -> { count, windowStart, failures, lockedUntil }
const state = new Map();

const now = () => Date.now();

const getBucket = (map, key, windowMs) => {
    const entry = map.get(key);
    if (!entry || now() - entry.windowStart > windowMs) {
        const newEntry = { count: 0, windowStart: now(), failures: 0, lockedUntil: 0 };
        map.set(key, newEntry);
        return newEntry;
    }
    return entry;
};

export const joinCodeLimiter = (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userId = req.user?.id || 'anon';
    const ipKey = `join:ip:${ip}`;
    const userKey = `join:user:${userId}`;

    const ipBucket = getBucket(state, ipKey, IP_WINDOW);
    const userBucket = getBucket(state, userKey, USER_WINDOW);

    // Check lockout
    if (now() < ipBucket.lockedUntil || now() < userBucket.lockedUntil) {
        return res.status(429).json({
            msg: 'Too many failed join attempts. Try again later.',
            code: 'JOIN_CODE_LOCKED',
        });
    }

    // Check rate limits
    if (ipBucket.count >= IP_MAX) {
        ipBucket.lockedUntil = now() + LOCKOUT_BASE_MS;
        return res.status(429).json({
            msg: 'Too many join attempts from this IP. Try again later.',
            code: 'JOIN_CODE_RATE_LIMITED',
        });
    }
    if (userBucket.count >= USER_MAX) {
        userBucket.lockedUntil = now() + LOCKOUT_BASE_MS;
        return res.status(429).json({
            msg: 'Too many join attempts for this user. Try again later.',
            code: 'JOIN_CODE_RATE_LIMITED',
        });
    }

    ipBucket.count += 1;
    userBucket.count += 1;

    // Expose buckets so the handler can record failures
    req.joinCodeIpBucket = ipBucket;
    req.joinCodeUserBucket = userBucket;

    next();
};

/** Record a failed join-by-code attempt; applies exponential lockout. */
export const recordJoinCodeFailure = (req) => {
    const ipBucket = req.joinCodeIpBucket;
    const userBucket = req.joinCodeUserBucket;
    if (ipBucket) {
        ipBucket.failures += 1;
        if (ipBucket.failures >= LOCKOUT_THRESHOLD) {
            const backoff = LOCKOUT_BASE_MS * Math.pow(2, ipBucket.failures - LOCKOUT_THRESHOLD);
            ipBucket.lockedUntil = now() + backoff;
        }
    }
    if (userBucket) {
        userBucket.failures += 1;
        if (userBucket.failures >= LOCKOUT_THRESHOLD) {
            const backoff = LOCKOUT_BASE_MS * Math.pow(2, userBucket.failures - LOCKOUT_THRESHOLD);
            userBucket.lockedUntil = now() + backoff;
        }
    }
};

/** Reset failure counters on a successful join. */
export const resetJoinCodeFailure = (req) => {
    const ipBucket = req.joinCodeIpBucket;
    const userBucket = req.joinCodeUserBucket;
    if (ipBucket) ipBucket.failures = 0;
    if (userBucket) userBucket.failures = 0;
};
