import crypto from "crypto";

/**
 * Server-side user authentication cache for MealMate.
 * Stores verified user profile data to avoid repeated /users/profile calls
 * within a short window. Runs on the server only — tokens are HttpOnly
 * (mm_at) and are never stored in plaintext.
 */

// In-memory cache: Key = sha256(token), Value = { user, timestamp, expiresAt }
const userCacheStore = new Map();

const CACHE_CONFIG = {
  DEFAULT_TTL: 2 * 60 * 1000, // 2 minutes
  MAX_CACHE_SIZE: 200,
};

function generateCacheKey(token) {
  if (!token || typeof token !== "string") return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isCacheExpired(entry) {
  return Date.now() > entry.expiresAt;
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of userCacheStore.entries()) {
    if (now > entry.expiresAt) userCacheStore.delete(key);
  }
}

function enforceMaxCacheSize() {
  if (userCacheStore.size > CACHE_CONFIG.MAX_CACHE_SIZE) {
    const entriesToRemove = Math.ceil(CACHE_CONFIG.MAX_CACHE_SIZE * 0.1);
    const entries = Array.from(userCacheStore.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    for (let i = 0; i < entriesToRemove; i++) userCacheStore.delete(entries[i][0]);
  }
}

/**
 * Store verified user data in cache.
 * @param {string} token - mm_at access token
 * @param {object} userData - User profile data
 * @param {number} ttl - TTL in ms (default 2 min)
 */
export function cacheUserData(token, userData, ttl = CACHE_CONFIG.DEFAULT_TTL) {
  try {
    const cacheKey = generateCacheKey(token);
    if (!cacheKey) return;
    const now = Date.now();
    userCacheStore.set(cacheKey, { user: userData, timestamp: now, expiresAt: now + ttl });
    cleanupExpiredEntries();
    enforceMaxCacheSize();
  } catch (error) {
    console.error("Error caching user data:", error);
  }
}

/**
 * Retrieve cached user data.
 * @param {string} token - mm_at access token
 * @returns {object|null}
 */
export function getCachedUserData(token) {
  try {
    const cacheKey = generateCacheKey(token);
    if (!cacheKey) return null;
    const entry = userCacheStore.get(cacheKey);
    if (!entry) return null;
    if (isCacheExpired(entry)) {
      userCacheStore.delete(cacheKey);
      return null;
    }
    return entry.user;
  } catch (error) {
    console.error("Error retrieving cached user data:", error);
    return null;
  }
}

/**
 * Invalidate a cached user entry (use on logout).
 * @param {string} token - mm_at access token
 */
export function invalidateUserCache(token) {
  try {
    const cacheKey = generateCacheKey(token);
    if (!cacheKey) return;
    userCacheStore.delete(cacheKey);
  } catch (error) {
    console.error("Error invalidating user cache:", error);
  }
}

/**
 * Clear all cache entries.
 */
export function clearAllUserCache() {
  userCacheStore.clear();
}

/**
 * Cache statistics (debugging only).
 */
export function getCacheStats() {
  cleanupExpiredEntries();
  return {
    size: userCacheStore.size,
    maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
    ttl: CACHE_CONFIG.DEFAULT_TTL,
    entries: Array.from(userCacheStore.entries()).map(([key, entry]) => ({
      key,
      expiresIn: Math.max(0, entry.expiresAt - Date.now()),
      isExpired: isCacheExpired(entry),
    })),
  };
}
