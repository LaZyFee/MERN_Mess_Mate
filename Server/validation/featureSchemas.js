import { z } from 'zod';
import { objectId, objectIdSchema } from './schemas.js';

// Feature-area validators (S3.6) — formerly inline in route files.
// Keeping them here makes the request contract auditable in one place.

const objectIdBody = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// ---------- Kitchen inventory ----------
export const kitchenItemCreateSchema = z.object({
    name: z.string().trim().min(1).max(80),
    unit: z.string().trim().max(20).optional().default(''),
    currentStock: z.number().nonnegative().optional().default(0),
    reorderThreshold: z.number().nonnegative().optional().default(0),
    averageConsumptionPerDay: z.number().nonnegative().optional().default(0),
});

export const kitchenItemUpdateSchema = z.object({
    currentStock: z.number().nonnegative().optional(),
    reorderThreshold: z.number().nonnegative().optional(),
    averageConsumptionPerDay: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
});

export const kitchenRefillSchema = z.object({
    quantity: z.number().positive(),
    unit: z.string().trim().max(20).optional().default(''),
    costPoisha: z.number().nonnegative().optional().default(0),
    note: z.string().trim().max(200).optional().default(''),
});

export const kitchenItemIdParam = z.object({ itemId: objectIdBody });

// ---------- Shopping list ----------
export const shoppingItemSchema = z.object({
    name: z.string().trim().min(1).max(120),
    quantity: z.string().trim().max(40).optional().default(''),
    unit: z.string().trim().max(20).optional().default(''),
    estimatedPricePoisha: z.number().int().nonnegative().optional().default(0),
    note: z.string().trim().max(300).optional().default(''),
});

export const shoppingItemCheckSchema = z.object({
    itemId: objectIdBody,
    checked: z.boolean(),
});

export const shoppingListCreateSchema = z.object({
    title: z.string().trim().min(1).max(100).optional().default('Bazar List'),
});

export const shoppingToExpenseSchema = z.object({
    expenseDescription: z.string().trim().min(1).max(200).optional().default('Bazar (from shopping list)'),
    categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category id').optional(),
    paidBy: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user id').optional(),
});

export const shoppingItemIdParam = z.object({ itemId: objectIdBody });

// ---------- Polls ----------
export const pollCreateSchema = z.object({
    question: z.string().trim().min(1).max(200),
    options: z.array(z.string().trim().min(1).max(120)).min(2).max(6),
    expiresAt: z.string().datetime(),
    relatedMenuItem: z.string().trim().max(120).optional().default(''),
});

export const pollVoteSchema = z.object({
    optionIndex: z.number().int().min(0).max(5),
});

export const pollIdParam = z.object({ pollId: objectIdBody });

// ---------- Invite codes ----------
export const inviteJoinBody = z.object({
    code: z.string().min(1),
    groupId: z.string().min(1),
});

export const inviteCreateBody = z.object({
    groupId: z.string().min(1),
    maxUses: z.number().int().min(1).max(1000).optional(),
    ttlDays: z.number().int().min(1).max(365).optional(),
});

export const inviteGroupParam = z.object({ groupId: z.string().min(1) });

// ---------- TOTP 2FA ----------
const totpCode = z.string().regex(/^(?:\d{6}|[A-F0-9]{8})$/);
export const totpSetupSchema = z.object({});
export const totpVerifySchema = z.object({ code: z.string().length(6) });
export const totpDisableSchema = z.object({ password: z.string().min(1), code: totpCode });
export const totpLoginSchema = z.object({ challengeToken: z.string().min(1), code: totpCode });

// ---------- Admin id params ----------
export const adminUserIdParam = z.object({ userId: objectId });
export const adminGroupIdParam = z.object({ groupId: objectId });
export const adminCannedReplyParam = z.object({ replyId: objectId });

// ---------- Per-group feature flags ----------
export const groupFeatureFlagSchema = z.object({
    routines: z.boolean().optional(),
    polls: z.boolean().optional(),
    shoppingList: z.boolean().optional(),
    kitchenInventory: z.boolean().optional(),
    bazarRotation: z.boolean().optional(),
    emergencyBroadcast: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
});

// ---------- Kitchen/shopping/polls group param ----------
export const featureGroupParam = z.object({ groupId: objectIdSchema });
