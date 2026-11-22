import { z } from 'zod';
import { objectId as objectIdSchema } from './schemas.js';

// ---------- Support Desk (B1) ----------

export const ticketCategoryEnum = z.enum(['account', 'bug', 'billing_dispute', 'feature', 'group_access', 'appeal', 'other']);
export const ticketPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);

export const ticketCreateSchema = z.object({
    category: ticketCategoryEnum,
    subject: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(2000),
    groupId: objectIdSchema.optional(),
    attachContext: z.boolean().optional(),
    attachmentIds: z.array(objectIdSchema).max(5).optional(),
    // priority is admin-only: silently dropped from user input
    priority: z.undefined().optional(),
}).strip();

export const ticketListQuery = z.object({
    status: z.enum(['open', 'answered', 'awaiting_admin', 'resolved', 'closed']).optional(),
    cursor: z.string().max(512).optional(),
});

export const ticketMessageSchema = z.object({
    body: z.string().trim().min(1).max(2000),
    attachmentIds: z.array(objectIdSchema).max(5).optional(),
});

export const ticketTransitionSchema = z.object({
    note: z.string().trim().max(2000).optional(),
    reason: z.string().trim().min(3).max(500).optional(),
}).passthrough();

export const ticketRateSchema = z.object({
    score: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(300).optional(),
});

export const adminReplySchema = z.object({
    body: z.string().trim().min(1).max(2000),
    attachmentIds: z.array(objectIdSchema).max(5).optional(),
});

export const adminTicketPatchSchema = z.object({
    priority: ticketPriorityEnum.optional(),
    category: ticketCategoryEnum.optional(),
    tags: z.array(z.string().trim().max(30)).max(10).optional(),
}).refine(v => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const adminAssignSchema = z.object({
    assignedAdminId: objectIdSchema.nullable(),
});

export const adminRedactSchema = z.object({
    reason: z.string().trim().min(3).max(500),
});

export const adminTicketListQuery = z.object({
    status: z.enum(['open', 'answered', 'awaiting_admin', 'resolved', 'closed']).optional(),
    priority: ticketPriorityEnum.optional(),
    assignee: objectIdSchema.optional(),
    category: ticketCategoryEnum.optional(),
    overdue: z.enum(['0', '1']).optional(),
    q: z.string().trim().max(120).optional(),
    cursor: z.string().max(512).optional(),
});

export const cannedReplySchema = z.object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(2).max(2000),
    category: ticketCategoryEnum.optional(),
});

export const appealSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(200),
    message: z.string().trim().min(10).max(2000),
    captchaToken: z.string().max(2000).optional(),
});
