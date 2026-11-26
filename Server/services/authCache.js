// Per-process LRU for the auth suspension lookup (S4.1).
// Keyed by `${userId}:${iat}` so a freshly issued token (after suspend/re-login)
// never hits a stale entry; the 30 s TTL covers long-lived tokens.
// Exports are plain data structures so the rule is unit-testable without Express.

export const AUTH_CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS || 30_000);
export const AUTH_CACHE_MAX = Number(process.env.AUTH_CACHE_MAX || 5000);

const store = new Map(); // key -> { value, expiresAt }; Map keeps insertion order

const isExpired = (entry, now) => !entry || entry.expiresAt <= now;

/** Read a cached account state; expiry is checked on read (no timer needed). */
export const cacheGet = (key, now = Date.now()) => {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (isExpired(entry, now)) {
        store.delete(key);
        return undefined;
    }
    // refresh recency for LRU behaviour
    store.delete(key);
    store.set(key, entry);
    return entry.value;
};

export const cacheSet = (key, value, now = Date.now()) => {
    store.delete(key);
    store.set(key, { value, expiresAt: now + AUTH_CACHE_TTL_MS });
    while (store.size > AUTH_CACHE_MAX) {
        const oldest = store.keys().next().value;
        store.delete(oldest);
    }
    return value;
};

/** Drop every cached token state for one user (called on suspend / re-activate). */
export const cacheInvalidateUser = (userId) => {
    const prefix = `${String(userId)}:`;
    let removed = 0;
    for (const key of [...store.keys()]) {
        if (key.startsWith(prefix)) { store.delete(key); removed++; }
    }
    return removed;
};

export const cacheClear = () => store.clear();
export const cacheSize = () => store.size;

export const authCacheKey = (userId, iat) => `${String(userId)}:${iat ?? 'none'}`;
