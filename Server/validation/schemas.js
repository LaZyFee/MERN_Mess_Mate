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
const MEAL_SLOTS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const PORTION_SUBUNITS = [0, 250, 500, 750, 1000];
const mealDefaultsSchema = z.object({
    breakfast: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0),
    lunch: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0),
    snacks: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0),
    dinner: z.number().int().refine(v => PORTION_SUBUNITS.includes(v)).default(0),
});

export const createGroupSchema = z.object({
    name: z.string().trim().min(2).max(60),
    mealSlots: z.array(z.enum(MEAL_SLOTS)).min(1).default(MEAL_SLOTS),
    mealWeights: z.object({
        breakfast: z.number().int().min(0).max(1000).default(1000),
        lunch: z.number().int().min(0).max(1000).default(1000),
        snacks: z.number().int().min(0).max(1000).default(1000),
        dinner: z.number().int().min(0).max(1000).default(1000),
    }).default({}),
    defaultMealSubunits: mealDefaultsSchema.default({}),
    defaultMealsEnabled: z.boolean().default(false),
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

// Meal quantities are integer thousandths: .25/.50/.75/1 portion. Missing
// slots remain unknown; only an explicit state confirms consumption/absence.
const mealSlotSchema = z.object({
    state: z.enum(['unknown', 'confirmed_zero', 'consumed']),
    portionSubunits: z.number().int().min(0).max(1000).optional(),
}).superRefine((slot, ctx) => {
    if (slot.state === 'consumed' && ![250, 500, 750, 1000].includes(slot.portionSubunits)) {
        ctx.addIssue({ code: 'custom', message: 'Consumed slots require portionSubunits of 250, 500, 750, or 1000' });
    }
    if (slot.state === 'confirmed_zero' && slot.portionSubunits !== undefined && slot.portionSubunits !== 0) {
        ctx.addIssue({ code: 'custom', message: 'confirmed_zero slots must have zero portionSubunits' });
    }
});

export const mealEntrySchema = z.object({
    date: z.coerce.date().optional(),
    slots: z.object({
        breakfast: mealSlotSchema.optional(),
        lunch: mealSlotSchema.optional(),
        snacks: mealSlotSchema.optional(),
        dinner: mealSlotSchema.optional(),
    }).refine(slots => Object.keys(slots).length > 0, 'At least one meal slot is required'),
});

export const guestMealSchema = z.object({
    date: z.coerce.date().optional(),
    guestName: z.string().trim().max(80).optional(),
    slot: z.enum(MEAL_SLOTS),
    portionSubunits: z.number().int().refine(v => [250, 500, 750, 1000].includes(v)),
    poolMode: z.enum(['individual', 'universal']),
    eventPoolRef: z.string().trim().max(120).optional(),
});

export const mealBulkSchema = z.object({
    entries: z.array(z.object({ userId: objectIdSchema, date: z.coerce.date(), slots: mealEntrySchema.shape.slots })).min(1).max(500),
});

export const absenceRangeSchema = z.object({
    userId: objectIdSchema.optional(),
    from: z.coerce.date(),
    to: z.coerce.date(),
    slots: z.array(z.enum(MEAL_SLOTS)).min(1).default(MEAL_SLOTS),
}).refine(d => d.from <= d.to, 'from must be before to');

export const idParamSchema = z.object({ id: objectIdSchema });

// ---------- Headcount for cook (tomorrow's portions per slot) ----------
export const headcountQuerySchema = z.object({
    groupId: objectIdSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
    includeGuests: z.enum(['true', 'false']).default('true').optional(),
});

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

// validation schemas (all money fields are integer poisha)

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const month = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM');

export { objectId }; // shared ObjectId schema for other route files
const poisha = z.number().int().min(1, 'Amount must be integer poisha ≥ 1');
const splitMode = z.enum([
    'meal_units', 'equal_all', 'equal_selected', 'member_days',
    'fixed_amounts', 'weighted', 'usage', 'personal',
]);

export const groupIdParam = z.object({ groupId: objectId });
export const idParam = z.object({ id: objectId });
export const monthParam = z.object({ groupId: objectId, month });

// ---- memberships ----
export const createMembershipSchema = z.object({
    userId: objectId.nullable().optional(),
    displayName: z.string().trim().min(1).max(80),
    startDate: z.string().min(4),
    endDate: z.string().nullable().optional(),
    role: z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member']).optional(),
    room: z.string().max(40).optional(),
    weight: z.number().int().min(1).optional(),
    isPlaceholder: z.boolean().optional(),
});
export const updateMembershipSchema = z.object({
    role: z.enum(['owner', 'manager', 'treasurer', 'auditor', 'member']).optional(),
    room: z.string().max(40).optional(),
    weight: z.number().int().min(1).optional(),
    endDate: z.string().nullable().optional(),
    displayName: z.string().max(80).optional(),
    linkUserId: objectId.optional(),
    reason: z.string().max(300).optional(),
});
export const departSchema = z.object({
    at: z.string().optional(),
    reason: z.string().max(300).optional(),
});

// ---- policies ----
export const publishPolicySchema = z.object({
    effectiveFrom: month,
    mealWeights: z.object({
        breakfast: z.number().int().min(0).max(1000).optional(),
        lunch: z.number().int().min(0).max(1000).optional(),
        snacks: z.number().int().min(0).max(1000).optional(),
        dinner: z.number().int().min(0).max(1000).optional(),
    }).optional(),
    allowedPortions: z.array(z.number()).optional(),
    entryCutoffHour: z.number().int().min(0).max(23).optional(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
    requireExpenseApproval: z.boolean().optional(),
    reviewGraceDays: z.number().int().min(0).optional(),
});

// ---- expenses ----
export const createExpenseSchema = z.object({
    supplierName: z.string().max(100).optional(),
    description: z.string().max(200).optional(),
    date: z.string().min(4),
    costPeriod: month.optional(),
    serviceStart: z.string().nullable().optional(),
    serviceEnd: z.string().nullable().optional(),
    isPayable: z.boolean().optional(),
    receiptReference: z.string().max(100).optional(),
    lines: z.array(z.object({
        description: z.string().max(200).optional(),
        categoryId: objectId,
        amount: poisha,
        splitMode: splitMode.nullable().optional(),
        beneficiaries: z.array(objectId).optional(),
        fixedAmounts: z.array(z.object({ membershipId: objectId, amount: poisha })).optional(),
        weights: z.array(z.object({ membershipId: objectId, weight: z.number().int().min(1) })).optional(),
        usageQuantities: z.array(z.object({ membershipId: objectId, quantity: z.number().min(0) })).optional(),
    })).min(1),
});
export const expenseIdParam = z.object({ groupId: objectId, expenseId: objectId });
export const reasonBody = z.object({ reason: z.string().max(300).optional() });

// ---- money ----
export const moneySchema = z.object({
    kind: z.enum(['contribution', 'payout', 'supplier_payment', 'member_settlement', 'transfer', 'fee']),
    amount: poisha,
    fromMember: objectId.nullable().optional(),
    toMember: objectId.nullable().optional(),
    fromAccount: objectId.nullable().optional(),
    toAccount: objectId.nullable().optional(),
    supplierName: z.string().max(100).optional(),
    method: z.enum(['cash', 'bkash', 'nagad', 'rocket', 'bank', 'other']).optional(),
    reference: z.string().max(100).optional(),
    paidAt: z.string().optional(),
    evidenceUrl: z.string().max(500).optional(),
});
export const txIdParam = z.object({ groupId: objectId, txId: objectId });
export const listMoneyQuery = z.object({
    status: z.enum(['submitted', 'confirmed', 'rejected', 'reversed']).optional(),
    kind: z.enum(['contribution', 'payout', 'supplier_payment', 'member_settlement', 'transfer', 'fee']).optional(),
});
export const fundSchema = z.object({
    name: z.string().trim().min(1).max(60),
    kind: z.enum(['cash', 'wallet', 'bank']),
    maskedIdentifier: z.string().max(40).optional(),
});
export const custodianSchema = z.object({ newCustodianId: objectId });
export const balanceParam = z.object({ groupId: objectId, membershipId: objectId });

// ---- periods ----
export const listExpenseQuery = z.object({
    status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'reversed']).optional(),
    costPeriod: month.optional(),
    payable: z.boolean().optional(),
});
export const finalizeSchema = z.object({
    expectedRevision: z.number().int().min(0).optional(),
    reason: z.string().max(300).optional(),
});
export const correctionSchema = z.object({
    reason: z.string().max(300).optional(),
    adjustment: z.record(z.string(), z.unknown()).optional(),
});

// ---- recurring ----
export const recurringSchema = z.object({
    name: z.string().trim().min(1).max(80),
    categoryId: objectId.optional(),
    amount: poisha,
    splitMode: splitMode.optional(),
    beneficiaries: z.array(objectId).optional(),
    fixedAmounts: z.array(z.object({ membershipId: objectId, amount: poisha })).optional(),
    weights: z.array(z.object({ membershipId: objectId, weight: z.number().int().min(1) })).optional(),
    supplierName: z.string().max(100).optional(),
    dueDayOfMonth: z.number().int().min(1).max(31).optional(),
    effectiveFrom: month,
    effectiveTo: month.nullable().optional(),
});
export const generateSchema = z.object({ costPeriod: month });
export const ruleIdParam = z.object({ groupId: objectId, ruleId: objectId });

// ---- reconciliation ----
export const reconciliationSchema = z.object({
    accountId: objectId,
    asOf: z.string().optional(),
    actualBalance: z.number().int(),
});
export const listReconciliationQuery = z.object({ accountId: objectId.optional() });
export const resolveReconciliationSchema = z.object({
    resolution: z.enum(['adjusted', 'accepted_shortage', 'found_cash', 'none']),
    explanation: z.string().max(500).optional(),
});
export const recIdParam = z.object({ groupId: objectId, recId: objectId });

// ---- disputes ----
export const disputeSchema = z.object({
    targetType: z.enum(['expense', 'money_transaction', 'statement_item']),
    targetId: objectId,
    reason: z.string().trim().min(1).max(1000),
    statementId: objectId.optional(),
    membershipId: objectId.optional(),
});
export const disputeIdParam = z.object({ groupId: objectId, disputeId: objectId });
export const disputeRespondSchema = z.object({ text: z.string().min(1).max(1000) });
export const disputeResolveSchema = z.object({
    rejected: z.boolean().optional(),
    note: z.string().max(500).optional(),
    correctionJournalId: objectId.optional(),
});
export const disputeListQuery = z.object({ status: z.enum(['open', 'resolved', 'rejected']).optional() });

// ---- notifications ----
export const outboxQuery = z.object({
    statementId: objectId.optional(),
    state: z.enum(['pending', 'processing', 'sent', 'failed', 'skipped', 'not_configured']).optional(),
});
export const messageIdParam = z.object({ groupId: objectId, messageId: objectId });
export const manualShareSchema = z.object({ statementId: objectId.optional() });

// ---- sessions ----
export const familyIdParam = z.object({ familyId: z.string().min(8) });
export const revokeAllSchema = z.object({ exceptFamilyId: z.string().optional() });
