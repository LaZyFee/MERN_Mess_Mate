import { z } from 'zod';
import { objectId as objectIdSchema } from './schemas.js';

// ---------- Inbox (B0.1) ----------
const hhmm = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be HH:MM');

export const inboxListQuery = z.object({
    unread: z.enum(['0', '1']).optional(),
    cursor: z.string().max(512).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const inboxReadSchema = z.object({
    ids: z.array(objectIdSchema).max(200).optional(),
    all: z.boolean().optional(),
}).refine(v => (v.all === true) || (Array.isArray(v.ids) && v.ids.length > 0), {
    message: 'Provide ids or all:true',
});

export const inboxPrefsSchema = z.object({
    types: z.record(
        z.string().max(60).regex(/^[a-z0-9_.]+$/i),
        z.object({ inApp: z.boolean(), email: z.boolean() })
    ).optional(),
    quietHours: z.object({ from: hhmm, to: hhmm }).optional(),
});
