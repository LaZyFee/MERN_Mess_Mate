// Pure lock-decision rules for the cron runner (no DB).

/**
 * Decide whether a lock may be claimed.
 * - no existing lock, or lock holder is us -> claim
 * - active (unexpired) lock held by someone else -> skip
 * - expired lock -> reclaimable
 */
export const lockDecision = (lock, owner, now = new Date()) => {
    if (!lock) return 'claim';
    if (lock.owner === owner) return 'claim';
    if (!lock.lockedUntil) return 'claim';
    return lock.lockedUntil <= now ? 'claim' : 'skip';
};

/**
 * Overlap guard: a job tick should run only if the previous lock expired.
 */
export const shouldRunTick = (lockedUntil, now = new Date()) =>
    !lockedUntil || lockedUntil <= now;
