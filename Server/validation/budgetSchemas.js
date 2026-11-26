import { z } from 'zod';
import { objectId } from './schemas.js';

// Budget validators (S5.2)

export const budgetUpsertSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
    categoryId: objectId.nullable().optional(),
    amountPoisha: z.number().int().min(0),
    note: z.string().trim().max(200).optional().default(''),
});

export const budgetMonthQuery = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
});

export const budgetIdParam = z.object({ budgetId: objectId, groupId: objectId });
