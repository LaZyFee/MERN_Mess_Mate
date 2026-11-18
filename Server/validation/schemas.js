import { z } from 'zod';

// ---------- Shared ----------
const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number');

const objectIdSchema = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ---------- Auth ----------
const whatsappSchema = z.string().trim()
    .regex(/^\+?[0-9]{10,15}$/, 'WhatsApp must be 10-15 digits, optional leading +')
    .or(z.literal(''));

export const registerSchema = z.object({
    username: z.string().trim().min(2).max(30)
        .regex(/^[a-zA-Z0-9_ ]+$/, 'Only letters, numbers, spaces, underscore'),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    phone: z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, 'Invalid phone number').optional(),
    whatsapp: whatsappSchema.optional(),
});

export const updateProfileSchema = z.object({
    username: z.string().trim().min(2).max(30)
        .regex(/^[a-zA-Z0-9_ ]+$/).optional(),
    phone: z.string().trim().regex(/^[0-9+\-\s]{6,15}$/, 'Invalid phone number').optional(),
    whatsapp: whatsappSchema.optional(),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
});

// ---------- Mess Group ----------
export const createGroupSchema = z.object({
    name: z.string().trim().min(2).max(60),
});

export const objectIdParamSchema = z.object({
    groupId: objectIdSchema,
});

export const groupAndUserParamSchema = z.object({
    groupId: objectIdSchema,
    userId: objectIdSchema,
});

export const addMemberSchema = z.object({
    userId: objectIdSchema,
    role: z.enum(['member', 'admin']).default('member'),
});

// ---------- Entries ----------
const mealEntry = z.object({
    userId: objectIdSchema,
    // 0, 0.5, 1, 1.5, 2 (per plan: lunch/dinner counts)
    count: z.number().refine(v => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].includes(v), {
        message: 'Meal count must be 0, 0.5, 1, 1.5 or 2',
    }),
});

const costEntry = z.object({
    userId: objectIdSchema,
    amount: z.number().positive().max(1_000_000),
    description: z.string().trim().max(200).optional(),
});

export const addEntrySchema = z.object({
    date: z.coerce.date(),
    meals: z.array(mealEntry).max(100).optional(),
    costs: z.array(costEntry).max(100).optional(),
});

export const extrasSchema = z.object({
    name: z.string().trim().min(1).max(50),
    amount: z.number().nonnegative(),
});

// ---------- Monthly ----------
export const monthParamSchema = z.object({
    groupId: objectIdSchema,
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
});

// zod v4: numeric enums must be literals; date may arrive pre-coerced
const MEAL_VALUE = z.union([
    z.literal(0), z.literal(0.5), z.literal(1), z.literal(1.5), z.literal(2),
]);

export const mealEntrySchema = z.object({
    date: z.coerce.date().optional(), // defaults to today in the controller
    lunch: MEAL_VALUE.default(0),
    dinner: MEAL_VALUE.default(0),
});

export const idParamSchema = z.object({ id: objectIdSchema });

export const objectIdAndIdParamSchema = z.object({
    groupId: objectIdSchema,
    categoryId: objectIdSchema,
});

export const objectIdAndExtraParamSchema = objectIdAndIdParamSchema;

export const inviteSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

// ---------- Join by code ----------
export const joinByCodeSchema = z.object({
    code: z.string().trim().min(6).max(12).transform(v => v.toUpperCase()),
});

// ---------- Payment notes (admin writes, member views) ----------
export const paymentNoteSchema = z.object({
    note: z.string().trim().min(1).max(1000),
    amountDue: z.number().nonnegative().optional(),
    isPaid: z.boolean().optional(),
});

export const noteParamSchema = z.object({
    groupId: objectIdSchema,
    userId: objectIdSchema,
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
});

// ---------- Expense categories (admin-managed, per group) ----------
export const categorySchema = z.object({
    name: z.string().trim().min(1).max(50),
    icon: z.string().trim().max(20).optional(),
    splitMode: z.enum(['meal', 'equal']).default('equal'),
});

export const categoryIdParamSchema = z.object({
    groupId: objectIdSchema,
    categoryId: objectIdSchema,
});

// Expenses reference a group-managed ExpenseCategory by id.
// `category` is a free-text legacy/label field (no hardcoded enum — categories
// are whatever the admin creates in the ExpenseCategory collection).
const expenseEntryBase = z.object({
    date: z.coerce.date().optional(),
    amount: z.number().positive().max(1_000_000),
    description: z.string().trim().max(200).optional(),
    categoryId: objectIdSchema, // required — from GET /api/messgroups/categories/:groupId
    category: z.string().trim().max(50).optional(), // optional display label; derived from category server-side
});

export const expenseEntrySchema = expenseEntryBase.refine(
    d => !!d.categoryId,
    { message: 'categoryId is required' }
);

export const expenseUpdateSchema = expenseEntryBase.partial();

// ---------- Filters (query params) ----------
const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM');

export const mealFilterQuerySchema = z.object({
    month: monthStr.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    userId: objectIdSchema.optional(),
}).refine(
    d => !(d.from && d.to && d.from > d.to),
    { message: 'from must be before to' }
).refine(
    d => !d.from || d.month === undefined, // prefer one style per request
    { message: 'Use either month or from/to, not both' }
);

export const expenseFilterQuerySchema = z.object({
    month: monthStr.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    userId: objectIdSchema.optional(),
    categoryId: objectIdSchema.optional(),
    category: z.string().trim().max(50).optional(), // free-text legacy filter
}).refine(
    d => !(d.from && d.to && d.from > d.to),
    { message: 'from must be before to' }
).refine(
    d => !d.from || d.month === undefined,
    { message: 'Use either month or from/to, not both' }
);

// ---------- Stats ----------
export const statsQuerySchema = z.object({
    groupId: objectIdSchema,
    // monthly: granularity=month&year=2026 | yearly: granularity=year
    granularity: z.enum(['month', 'year']).default('month'),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    month: monthStr.optional(), // exact month drill-down (overrides year for month view)
    userId: objectIdSchema.optional(),
});

// ---------- Extras ----------
export const extraSchema = z.object({
    name: z.string().trim().min(1).max(50),
    amount: z.number().nonnegative().max(1_000_000),
});

export const idAndMonthParamSchema = z.object({
    id: objectIdSchema,
    month: z.string().regex(/^\d{4}-\d{2}$/),
});
// ---------- Password reset ----------
export const forgotPasswordSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(10),
    password: passwordSchema,
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
});
