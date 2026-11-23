import Meal from '../models/Meal.js';
import GuestMeal from '../models/GuestMeal.js';
import Membership from '../models/Membership.js';
import MessGroup from '../models/MessGroup.js';
import DutyAssignment from '../models/DutyAssignment.js';
import Note from '../models/Note.js';
import { mealEntrySchema, guestMealSchema, mealBulkSchema, absenceRangeSchema, idParamSchema, monthParamSchema, mealFilterQuerySchema, headcountQuerySchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import { ensureOpen, bumpRevision } from '../services/periodService.js';
import { MEMBER_VISIBLE_FIELDS } from '../middleware/privacy.js';

const SLOT_NAMES = ['breakfast', 'lunch', 'snacks', 'dinner'];

// Dhaka civil-day helpers — dates are stored at UTC midnight of the local day
const dayString = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
};
const dateAtDay = (day) => new Date(`${day}T00:00:00.000Z`);
const monthOfDay = (day) => day.slice(0, 7);

// month helper — derived, never trusted from client
const monthOf = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ---- slot-state plumbing (MealDay model) ----
const slotPayload = (slot, actorId, source = 'member') => ({
    state: slot.state,
    portionSubunits: slot.state === 'consumed' ? slot.portionSubunits : slot.state === 'confirmed_zero' ? 0 : null,
    actorId,
    source,
});
const updateMealSlots = (meal, slots, actorId, source = 'member') => {
    for (const [name, slot] of Object.entries(slots || {})) {
        if (SLOT_NAMES.includes(name)) meal[name] = slotPayload(slot, actorId, source);
    }
};
const assertPeriodOpen = async ({ groupId, day }) => {
    const period = await ensureOpen({ groupId, month: monthOfDay(day) });
    if (!period) return;
    if (period.state === 'review') throw Object.assign(new Error('Period is in review'), { status: 409 });
};
const revisePeriod = async ({ groupId, day }) => {
    const month = monthOfDay(day);
    const period = await ensureOpen({ groupId, month });
    if (period) await bumpRevision({ groupId, month });
};

// POST /api/meals/:groupId — upsert own meal entry for a date (explicit slot states)
export const addMeal = [
    validate(mealEntrySchema),
    async (req, res, next) => {
        try {
            const day = dayString(req.body.date || new Date());
            await assertPeriodOpen({ groupId: req.params.groupId, day });
            const group = await MessGroup.findById(req.params.groupId).lean();
            for (const name of Object.keys(req.body.slots)) {
                if (!group.mealSlots.includes(name)) return res.status(422).json({ msg: `${name} is not enabled for this group` });
            }
            const record = await Meal.findOneAndUpdate(
                { groupId: req.params.groupId, userId: req.user.id, date: dateAtDay(day) },
                { $setOnInsert: { groupId: req.params.groupId, userId: req.user.id, date: dateAtDay(day), month: monthOfDay(day) } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            updateMealSlots(record, req.body.slots, req.user.id);
            await record.save();
            await revisePeriod({ groupId: req.params.groupId, day });
            res.status(201).json(record);

            // Realtime: notify everyone in the group room
            req.app.get('io')?.to(`group:${req.params.groupId}`).emit('meal-updated', {
                groupId: req.params.groupId, mealId: record._id, userId: record.userId,
            });
        } catch (err) { next(err); }
    },
];

// PUT /api/meals/entry/:id — only own entry
export const updateMeal = [
    validate(idParamSchema, 'params'),
    validate(mealEntrySchema.partial()),
    async (req, res, next) => {
        try {
            const record = await Meal.findOne({ _id: req.params.id, userId: req.user.id });
            if (!record) return res.status(404).json({ msg: 'Meal entry not found' });

            const day = dayString(req.body.date || record.date);
            await assertPeriodOpen({ groupId: record.groupId, day });
            if (req.body.date) { record.date = dateAtDay(day); record.month = monthOfDay(day); }
            updateMealSlots(record, req.body.slots, req.user.id);
            await record.save();
            await revisePeriod({ groupId: record.groupId, day });
            res.json(record);
        } catch (err) { next(err); }
    },
];

// POST /api/meals/:groupId/guests — record a guest meal (individual or universal pool)
export const createGuestMeal = [
    validate(guestMealSchema),
    async (req, res, next) => {
        try {
            const groupId = req.params.groupId;
            const day = dayString(req.body.date || new Date());
            await assertPeriodOpen({ groupId, day });
            const group = await MessGroup.findById(groupId).lean();
            if (!group.mealSlots.includes(req.body.slot)) return res.status(422).json({ msg: `${req.body.slot} is not enabled for this group` });
            const membership = await Membership.findOne({ groupId, user: req.user.id, startDate: { $lte: dateAtDay(day) }, $or: [{ endDate: null }, { endDate: { $gt: dateAtDay(day) } }] }).lean();
            const guest = await GuestMeal.create({
                groupId, hostUserId: req.user.id, hostMembershipId: membership?._id || null,
                guestName: req.body.guestName || '', localDate: day, slot: req.body.slot,
                portionSubunits: req.body.portionSubunits, poolMode: req.body.poolMode,
                eventPoolRef: req.body.eventPoolRef || '', createdBy: req.user.id,
            });
            await revisePeriod({ groupId, day });
            res.status(201).json(guest);
        } catch (err) { next(err); }
    },
];

// GET /api/meals/:groupId/guests?from=&to= — active guest meals
export const listGuestMeals = async (req, res, next) => {
    try {
        const query = { groupId: req.params.groupId, status: 'active' };
        if (req.query.from || req.query.to) {
            query.localDate = {};
            if (req.query.from) query.localDate.$gte = String(req.query.from);
            if (req.query.to) query.localDate.$lte = String(req.query.to);
        }
        const guests = await GuestMeal.find(query).populate('hostUserId', MEMBER_VISIBLE_FIELDS).sort({ localDate: 1, slot: 1 }).lean();
        res.json(guests);
    } catch (err) { next(err); }
};

// ---- bulk entry (preview then apply) ----
const runBulk = async ({ entries, groupId, actorId, apply }) => {
    const group = await MessGroup.findById(groupId).lean();
    const changes = [];
    for (const entry of entries) {
        const day = dayString(entry.date);
        const active = await Membership.findOne({ groupId, user: entry.userId, startDate: { $lte: dateAtDay(day) }, $or: [{ endDate: null }, { endDate: { $gt: dateAtDay(day) } }] }).lean();
        if (!active) throw Object.assign(new Error(`User ${entry.userId} is not an active group member on ${day}`), { status: 422 });
        for (const slot of Object.keys(entry.slots)) if (!group.mealSlots.includes(slot)) throw Object.assign(new Error(`${slot} is not enabled for this group`), { status: 422 });
        changes.push({ userId: entry.userId, day, slots: entry.slots });
    }
    if (!apply) return changes;
    for (const change of changes) {
        await assertPeriodOpen({ groupId, day: change.day });
        let meal = await Meal.findOne({ groupId, userId: change.userId, date: dateAtDay(change.day) });
        if (!meal) meal = new Meal({ groupId, userId: change.userId, date: dateAtDay(change.day), month: monthOfDay(change.day) });
        updateMealSlots(meal, change.slots, actorId, 'admin');
        await meal.save();
        await revisePeriod({ groupId, day: change.day });
    }
    return changes;
};

// POST /api/meals/:groupId/bulk/preview — dry-run; returns the proposed change set
export const previewBulkMeals = [
    validate(mealBulkSchema),
    async (req, res, next) => {
        try { res.json({ preview: await runBulk({ entries: req.body.entries, groupId: req.params.groupId, actorId: req.user.id, apply: false }) }); }
        catch (err) { next(err); }
    },
];

// POST /api/meals/:groupId/bulk/apply — apply the change set
export const applyBulkMeals = [
    validate(mealBulkSchema),
    async (req, res, next) => {
        try { res.json({ applied: await runBulk({ entries: req.body.entries, groupId: req.params.groupId, actorId: req.user.id, apply: true }) }); }
        catch (err) { next(err); }
    },
];

// ---- absence windows ----
const enumerateDays = (from, to) => {
    const days = [];
    const cursor = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) days.push(cursor.toISOString().slice(0, 10));
    if (days.length > 366) throw Object.assign(new Error('Absence range cannot exceed 366 days'), { status: 422 });
    return days;
};

// POST /api/meals/:groupId/absence/preview — show what would be marked absent
export const previewAbsence = [
    validate(absenceRangeSchema),
    async (req, res, next) => {
        try {
            const groupId = req.params.groupId;
            const from = dayString(req.body.from); const to = dayString(req.body.to);
            const days = enumerateDays(from, to);
            const members = await Membership.find({ groupId, ...(req.body.userId ? { user: req.body.userId } : {}), startDate: { $lte: dateAtDay(to) }, $or: [{ endDate: null }, { endDate: { $gte: dateAtDay(from) } }] }).select('user displayName').lean();
            const preview = [];
            for (const member of members) for (const day of days) for (const slot of req.body.slots) {
                const existing = await Meal.findOne({ groupId, userId: member.user, date: dateAtDay(day) }).select(slot).lean();
                preview.push({ userId: member.user, displayName: member.displayName, date: day, slot, current: existing?.[slot]?.state || 'unknown', proposed: 'confirmed_zero' });
            }
            res.json({ count: preview.length, preview });
        } catch (err) { next(err); }
    },
];

// POST /api/meals/:groupId/absence/apply — mark the window confirmed_zero (source: absence),
// auto-skip future duties, and create a prefilled handover note.
export const applyAbsence = [
    validate(absenceRangeSchema),
    async (req, res, next) => {
        try {
            const groupId = req.params.groupId;
            const from = dayString(req.body.from);
            const to = dayString(req.body.to);
            const days = enumerateDays(from, to);
            const targetUserId = req.body.userId || req.user.id;
            const members = await Membership.find({
                groupId,
                user: targetUserId,
                startDate: { $lte: dateAtDay(to) },
                $or: [{ endDate: null }, { endDate: { $gte: dateAtDay(from) } }],
            }).lean();
            const affected = [];
            const skippedDuties = [];

            for (const member of members) {
                for (const day of days) {
                    await assertPeriodOpen({ groupId, day });
                    let meal = await Meal.findOne({ groupId, userId: member.user, date: dateAtDay(day) });
                    if (!meal) meal = new Meal({ groupId, userId: member.user, date: dateAtDay(day), month: monthOfDay(day) });
                    for (const slot of req.body.slots) meal[slot] = slotPayload({ state: 'confirmed_zero' }, req.user.id, 'absence');
                    await meal.save();
                    affected.push({ userId: member.user, date: day });
                    await revisePeriod({ groupId, day });
                }

                // ---- Auto-skip future scheduled duties during absence ----
                const futureDuties = await DutyAssignment.find({
                    groupId,
                    membershipId: member._id,
                    localDate: { $gte: from, $lte: to },
                    status: 'scheduled',
                }).lean();

                for (const duty of futureDuties) {
                    duty.status = 'skipped';
                    await duty.save();
                    skippedDuties.push({
                        dutyId: duty._id,
                        taskKey: duty.taskKey,
                        localDate: duty.localDate,
                    });
                }
            }

            // ---- Prefilled handover note ----
            const membership = await Membership.findOne({ groupId, user: targetUserId }).lean();
            const handover = await Note.create({
                groupId,
                authorMembershipId: membership?._id || null,
                authorUserId: req.user.id,
                kind: 'handover',
                title: `Absence handover: ${from} to ${to}`,
                body: `I will be away from ${from} to ${to}. My meals are marked absent and my duties are auto-skipped.`,
                audience: { type: 'all' },
                validFrom: from,
                validUntil: to,
                absence: { from, to },
                tasks: skippedDuties.map(d => ({
                    text: `Cover ${d.taskKey} duty on ${d.localDate}`,
                    status: 'open',
                    assigneeMembershipId: null,
                })),
                state: 'active',
            });

            await audit({ groupId, actorId: req.user.id, action: 'absence.applied', targetType: 'absence', after: { from, to, skippedDuties: skippedDuties.length } });
            req.app.get('io')?.to(`group:${groupId}`).emit('absence-updated', { groupId, userId: targetUserId, from, to });

            res.json({ affected, skippedDuties, handover });
        } catch (err) { next(err); }
    },
];

// GET /api/meals/:groupId/:month — group meals for a month
export const getMealsByMonth = [
    validate(monthParamSchema, 'params'),
    validate(mealFilterQuerySchema, 'query'),
    async (req, res, next) => {
        try {
            const filter = { groupId: req.params.groupId };
            const q = req.validated.query;

            if (q.month) filter.month = q.month;
            else if (q.from || q.to) {
                filter.date = {};
                if (q.from) filter.date.$gte = q.from;
                if (q.to) filter.date.$lte = q.to;
            }
            if (q.userId) filter.userId = q.userId;

            const meals = await Meal.find(filter)
                .populate('userId', MEMBER_VISIBLE_FIELDS)
                .sort({ date: 1 })
                .lean();

            res.json(meals);
        } catch (err) { next(err); }
    },
];

// DELETE /api/meals/entry/:id — own entry, or group admin
export const deleteMeal = [
    validate(idParamSchema, 'params'),
    async (req, res, next) => {
        try {
            const meal = await Meal.findById(req.params.id);
            if (!meal) return res.status(404).json({ msg: 'Meal entry not found' });

            if (!meal.userId.equals(req.user.id) && !req.canEditOthers) {
                return res.status(403).json({ msg: 'Not allowed to delete this entry' });
            }

            await meal.deleteOne();
            res.json({ msg: 'Meal entry deleted' });
        } catch (err) { next(err); }
    },
];

// GET /api/meals/:groupId?month=YYYY-MM | ?from=&to= | &userId= — filtered list
// Ex-members: history clamped to their membership interval (privacy guard).
export const getMeals = [
    validate(mealFilterQuerySchema, 'query'),
    async (req, res, next) => {
        try {
            const filter = { groupId: req.params.groupId };
            const q = req.validated?.query || {};

            if (q.month) filter.month = q.month;
            else if (q.from || q.to || req.historyFrom || req.historyTo) {
                filter.date = {};
                if (q.from) filter.date.$gte = q.from;
                if (q.to) filter.date.$lte = q.to;
                if (req.historyFrom) filter.date.$gte = req.historyFrom;
                if (req.historyTo) filter.date.$lte = req.historyTo;
            }
            if (q.userId) filter.userId = q.userId;

            const meals = await Meal.find(filter)
                .populate('userId', MEMBER_VISIBLE_FIELDS)
                .sort({ date: 1 })
                .lean();

            res.json(meals);
        } catch (err) { next(err); }
    },
];

// GET /api/meals/:groupId/headcount/tomorrow?date=YYYY-MM-DD&includeGuests=true
// Returns consumed portions per slot for the target day (default tomorrow,
// Dhaka civil date) plus universal guest meals, so the cook knows how many
// portions to prepare per slot.
export const getTomorrowHeadcount = [
    validate(headcountQuerySchema, 'query'),
    async (req, res, next) => {
        try {
            const groupId = req.params.groupId;
            const targetDate = req.query.date || dayString(addDays(new Date(), 1));
            const includeGuests = req.query.includeGuests !== 'false';

            // ---- Member meals: sum consumed portionSubunits per slot ----
            const meals = await Meal.find({
                groupId,
                date: dateAtDay(targetDate),
            }).lean();

            const slotTotals = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
            const memberCounts = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };

            for (const m of meals) {
                for (const slot of Object.keys(slotTotals)) {
                    const s = m[slot];
                    if (s && s.state === 'consumed' && s.portionSubunits) {
                        slotTotals[slot] += s.portionSubunits;
                        memberCounts[slot] += 1;
                    }
                }
            }

            // ---- Guest meals: universal guests add to group pool ----
            let guestTotals = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
            let guestCount = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
            if (includeGuests) {
                const guests = await GuestMeal.find({
                    groupId,
                    localDate: targetDate,
                    status: 'active',
                }).lean();
                for (const g of guests) {
                    if (g.poolMode === 'universal') {
                        guestTotals[g.slot] += g.portionSubunits;
                        guestCount[g.slot] += 1;
                    }
                    // individual guests are already inside the host's own meal
                    // total, so we don't double-count them here.
                }
            }

            // ---- Per-slot headcount in portions (thousandths) ----
            const slots = {};
            for (const slot of Object.keys(slotTotals)) {
                const total = slotTotals[slot] + guestTotals[slot];
                slots[slot] = {
                    memberPortionSubunits: slotTotals[slot],
                    guestPortionSubunits: guestTotals[slot],
                    totalPortionSubunits: total,
                    totalPortions: Number((total / 1000).toFixed(3)),
                    memberCount: memberCounts[slot],
                    guestCount: guestCount[slot],
                    portionsPerMember: memberCounts[slot] > 0
                        ? Number(((slotTotals[slot] / memberCounts[slot]) / 1000).toFixed(3))
                        : null,
                };
            }

            const grandTotal = Object.values(slots).reduce(
                (sum, s) => sum + s.totalPortionSubunits, 0);

            res.json({
                groupId,
                date: targetDate,
                slots,
                grandTotalPortionSubunits: grandTotal,
                grandTotalPortions: Number((grandTotal / 1000).toFixed(3)),
                generatedAt: new Date(),
            });
        } catch (err) { next(err); }
    },
];

const addDays = (date, n) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
};
