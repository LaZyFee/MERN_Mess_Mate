import { z } from 'zod';
import { objectId } from './schemas.js';

// ---------- Routine & Notice Board (B2) ----------

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const MEAL_SLOTS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const DUTY_STATUSES = ['scheduled', 'done', 'missed', 'swapped', 'skipped', 'cancelled'];
const NOTE_KINDS = ['note', 'announcement', 'handover', 'alert'];

export const rosterCreateSchema = z.object({
    title: z.string().trim().min(1).max(80),
    type: z.enum(['bazar', 'cleaning', 'cooking', 'custom']),
    areas: z.array(z.string().trim().max(40)).optional(),
    rotation: z.object({
        mode: z.enum(['round_robin', 'weekly_template', 'fair', 'manual']),
        memberOrder: z.array(objectId).optional(),
        weeklyTemplate: z.record(z.string(), z.array(objectId)).optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    }),
    skipWhenAbsent: z.boolean().optional(),
    weekStartsOn: z.number().int().min(0).max(6).optional(),
    horizonDays: z.number().int().min(7).max(90).optional(),
});

export const rosterUpdateSchema = z.object({
    title: z.string().trim().min(1).max(80).optional(),
    type: z.enum(['bazar', 'cleaning', 'cooking', 'custom']).optional(),
    rotation: z.object({
        mode: z.enum(['round_robin', 'weekly_template', 'fair', 'manual']).optional(),
        memberOrder: z.array(objectId).optional(),
        weeklyTemplate: z.record(z.string(), z.array(objectId)).optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    }).optional(),
    skipWhenAbsent: z.boolean().optional(),
    weekStartsOn: z.number().int().min(0).max(6).optional(),
    horizonDays: z.number().int().min(7).max(90).optional(),
    state: z.enum(['draft', 'published', 'archived']).optional(),
});

export const rosterIdParam = z.object({ groupId: objectId, rosterId: objectId });
export const groupIdParam = z.object({ groupId: objectId });

export const dutyMarkDoneSchema = z.object({
    doneNote: z.string().trim().max(200).optional(),
});

export const dutyReassignSchema = z.object({
    toMembershipId: objectId,
    reason: z.string().trim().max(500).optional(),
});

export const swapCreateSchema = z.object({
    assignmentId: objectId,
    toMembershipId: objectId.optional(), // null = open offer
    reason: z.string().trim().max(500).optional(),
});

export const swapRespondSchema = z.object({
    accept: z.boolean(),
    reason: z.string().trim().max(500).optional(),
});

export const menuPlanCreateSchema = z.object({
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    isTemplate: z.boolean().optional(),
    days: z.array(z.object({
        weekday: z.number().int().min(0).max(6),
        slots: z.object({
            breakfast: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(),
            lunch: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(),
            snacks: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(),
            dinner: z.array(z.object({ name: z.string().max(60), qtyHint: z.string().max(30).optional() })).optional(),
        }).optional(),
        cookMembershipId: objectId.optional(),
        estCostPoisha: z.number().int().min(0).optional(),
        note: z.string().max(300).optional(),
    })).optional(),
});

export const noteCreateSchema = z.object({
    kind: z.enum(NOTE_KINDS).optional(),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().max(2000).optional(),
    audience: z.object({
        type: z.enum(['all', 'members', 'role']).optional(),
        membershipIds: z.array(objectId).optional(),
        roles: z.array(z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member'])).optional(),
    }).optional(),
    pinned: z.boolean().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    absence: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
    }).optional(),
    tasks: z.array(z.object({
        text: z.string().trim().max(200),
        assigneeMembershipId: objectId.optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })).max(20).optional(),
});

export const noteUpdateSchema = z.object({
    title: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().max(2000).optional(),
    kind: z.enum(NOTE_KINDS).optional(),
    audience: z.object({
        type: z.enum(['all', 'members', 'role']).optional(),
        membershipIds: z.array(objectId).optional(),
        roles: z.array(z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member'])).optional(),
    }).optional(),
    pinned: z.boolean().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    absence: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
    }).optional(),
    tasks: z.array(z.object({
        _id: z.string().optional(),
        text: z.string().trim().max(200).optional(),
        assigneeMembershipId: objectId.optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status: z.enum(['open', 'claimed', 'done']).optional(),
        claimedBy: objectId.optional(),
        doneBy: objectId.optional(),
    })).max(20).optional(),
    state: z.enum(['active', 'archived', 'deleted']).optional(),
});

export const noteIdParam = z.object({ groupId: objectId, noteId: objectId });
export const noteTaskParam = z.object({ groupId: objectId, noteId: objectId, taskId: z.string().min(8) });
export const noteAckSchema = z.object({});
