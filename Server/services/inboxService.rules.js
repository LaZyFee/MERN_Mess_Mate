// Pure helpers extracted from inboxService so they can be unit-tested
// without a database.

export const TTL_DAYS = 90;

export const computeExpiry = (now = new Date()) =>
    new Date(now.getTime() + TTL_DAYS * 24 * 3600 * 1000);

export const buildDedupeKey = (scope, type, key) => `${scope}:${type}:${key}`;
