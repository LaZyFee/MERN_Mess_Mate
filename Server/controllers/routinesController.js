import Roster from '../models/Roster.js';
import DutyAssignment from '../models/DutyAssignment.js';
import SwapRequest from '../models/SwapRequest.js';
import MenuPlan from '../models/MenuPlan.js';
import Note from '../models/Note.js';
import Membership from '../models/Membership.js';
import ShoppingList from '../models/ShoppingList.js';
import Expense from '../models/Expense.js';
import { audit } from '../models/AuditEvent.js';
import { notify } from '../services/inboxService.js';
import {
    generateDuties,
    claimHandoverTask,
    doneHandoverTask,
} from '../services/routineRules.js';

export const emitGroup = (req, event, payload) => {
    const io = req.app?.get('io');
    if (io && payload && payload.groupId) io.to(`group:${payload.groupId}`).emit(event, payload);
};

const activeMemberships = async (groupId) => {
    const now = new Date();
    return Membership.find({
        groupId,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
    }).lean();
};

// ============================================================
// ROSTERS
// ============================================================

export const createRoster = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const roster = await Roster.create({ ...req.body, groupId, createdBy: req.user.id });
        await audit({ groupId, actorId: req.user.id, action: 'roster.created', targetType: 'roster', targetId: roster._id });
        res.status(201).json({ roster });
    } catch (err) { next(err); }
};

export const listRosters = async (req, res, next) => {
    try {
        const rosters = await Roster.find({ groupId: req.params.groupId }).sort({ createdAt: -1 }).lean();
        res.json({ rosters });
    } catch (err) { next(err); }
};

export const getRoster = async (req, res, next) => {
    try {
        const roster = await Roster.findOne({ _id: req.params.rosterId, groupId: req.params.groupId }).lean();
        if (!roster) return res.status(404).json({ msg: 'Roster not found' });
        res.json({ roster });
    } catch (err) { next(err); }
};

export const updateRoster = async (req, res, next) => {
    try {
        const roster = await Roster.findOneAndUpdate(
            { _id: req.params.rosterId, groupId: req.params.groupId },
            { $set: req.body, $inc: { revision: 1 } },
            { new: true }
        );
        if (!roster) return res.status(404).json({ msg: 'Roster not found' });
        await audit({ groupId: req.params.groupId, actorId: req.user.id, action: 'roster.updated', targetType: 'roster', targetId: roster._id });
        res.json({ roster });
    } catch (err) { next(err); }
};

export const publishRoster = async (req, res, next) => {
    try {
        const { groupId, rosterId } = req.params;
        const { horizonDays, taskKeys = ['bazar'] } = req.body;
        const roster = await Roster.findOne({ _id: rosterId, groupId }).lean();
        if (!roster) return res.status(404).json({ msg: 'Roster not found' });
        if (roster.state === 'published') return res.status(409).json({ msg: 'Already published' });

        const members = await activeMemberships(groupId);
        const nowDhaka = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        const end = new Date();
        end.setUTCDate(end.getUTCDate() + (horizonDays || roster.horizonDays || 30));
        const endDhaka = end.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

        const { assignments } = generateDuties({
            roster, activeMemberships: members, startDateStr: nowDhaka, endDateStr: endDhaka, taskKeys,
        });

        let created = 0;
        for (const a of assignments) {
            try {
                await DutyAssignment.create({
                    groupId, rosterId, taskKey: a.taskKey, localDate: a.localDate,
                    membershipId: a.membershipId, origin: 'generated',
                });
                created++;
            } catch (err) { if (err.code !== 11000) throw err; }
        }

        await Roster.updateOne({ _id: rosterId }, { $set: { state: 'published', horizonDays: horizonDays || roster.horizonDays }, $inc: { revision: 1 } });
        await audit({ groupId, actorId: req.user.id, action: 'roster.published', targetType: 'roster', targetId: rosterId });
        emitGroup(req, 'roster-published', { groupId, rosterId });
        res.json({ rosterId, state: 'published', dutiesCreated: created });
    } catch (err) { next(err); }
};

export const extendHorizon = async (req, res, next) => {
    try {
        const { groupId, rosterId } = req.params;
        const { additionalDays } = req.body;
        const roster = await Roster.findOne({ _id: rosterId, groupId }).lean();
        if (!roster) return res.status(404).json({ msg: 'Roster not found' });

        const members = await activeMemberships(groupId);
        const nowDhaka = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        const end = new Date();
        end.setUTCDate(end.getUTCDate() + additionalDays);
        const endDhaka = end.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

        const { assignments } = generateDuties({
            roster, activeMemberships: members, startDateStr: nowDhaka, endDateStr: endDhaka, taskKeys: ['bazar'],
        });

        let created = 0;
        for (const a of assignments) {
            try { await DutyAssignment.create({ groupId, rosterId, taskKey: a.taskKey, localDate: a.localDate, membershipId: a.membershipId, origin: 'generated' }); created++; }
            catch (err) { if (err.code !== 11000) throw err; }
        }

        await Roster.updateOne({ _id: rosterId }, { $inc: { horizonDays: additionalDays, revision: 1 } });
        await audit({ groupId, actorId: req.user.id, action: 'roster.horizon_extended', targetType: 'roster', targetId: rosterId });
        res.json({ rosterId, horizonExtendedBy: additionalDays, dutiesCreated: created });
    } catch (err) { next(err); }
};

// ============================================================
// DUTIES
// ============================================================

export const listDuties = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { localDate, membershipId, status, rosterId } = req.query;
        const filter = { groupId };
        if (localDate) filter.localDate = localDate;
        if (membershipId) filter.membershipId = membershipId;
        if (status) filter.status = status;
        if (rosterId) filter.rosterId = rosterId;
        const duties = await DutyAssignment.find(filter).sort({ localDate: 1, taskKey: 1 }).lean();
        res.json({ duties });
    } catch (err) { next(err); }
};

export const markDutyDone = async (req, res, next) => {
    try {
        const { groupId, assignmentId } = req.params;
        const { doneNote } = req.body;
        const duty = await DutyAssignment.findOne({ _id: assignmentId, groupId });
        if (!duty) return res.status(404).json({ msg: 'Duty not found' });
        if (duty.status === 'done') return res.status(409).json({ msg: 'Duty already done' });
        duty.status = 'done';
        duty.doneAt = new Date();
        if (doneNote) duty.doneNote = doneNote.slice(0, 200);
        await duty.save();
        await audit({ groupId, actorId: req.user.id, action: 'duty.done', targetType: 'duty', targetId: duty._id });
        emitGroup(req, 'duty-updated', { groupId, assignmentId, status: 'done' });
        res.json({ duty });
    } catch (err) { next(err); }
};

export const reassignDuty = async (req, res, next) => {
    try {
        const { groupId, assignmentId } = req.params;
        const { toMembershipId, reason } = req.body;
        const duty = await DutyAssignment.findOne({ _id: assignmentId, groupId });
        if (!duty) return res.status(404).json({ msg: 'Duty not found' });
        const oldMember = duty.membershipId;
        duty.membershipId = toMembershipId;
        duty.origin = 'reassign';
        duty.revision += 1;
        await duty.save();
        await audit({ groupId, actorId: req.user.id, action: 'duty.reassigned', targetType: 'duty', targetId: duty._id, before: { membershipId: oldMember }, after: { membershipId: toMembershipId }, reason });
        emitGroup(req, 'duty-updated', { groupId, assignmentId, status: duty.status, toMembershipId });
        res.json({ duty });
    } catch (err) { next(err); }
};

// ============================================================
// SWAPS
// ============================================================

export const createSwap = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { assignmentId, toMembershipId, reason } = req.body;
        const assignment = await DutyAssignment.findOne({ _id: assignmentId, groupId }).lean();
        if (!assignment) return res.status(404).json({ msg: 'Duty assignment not found' });
        const swap = await SwapRequest.create({
            assignmentId, groupId, fromMembershipId: assignment.membershipId,
            toMembershipId: toMembershipId || null, reason: reason || '',
            expiresAt: new Date(`${assignment.localDate}T23:59:59+06:00`),
        });
        await audit({ groupId, actorId: req.user.id, action: 'swap.requested', targetType: 'swap', targetId: swap._id });
        emitGroup(req, 'duty-updated', { groupId, assignmentId, swapId: swap._id });
        res.status(201).json({ swap });
    } catch (err) { next(err); }
};

export const respondSwap = async (req, res, next) => {
    try {
        const { groupId, swapId } = req.params;
        const { accept, reason } = req.body;
        const swap = await SwapRequest.findOne({ _id: swapId, groupId });
        if (!swap) return res.status(404).json({ msg: 'Swap request not found' });
        if (swap.status !== 'pending') return res.status(409).json({ msg: 'Already resolved' });
        swap.status = accept ? 'accepted' : 'declined';
        swap.respondedBy = req.user.id;
        swap.respondedAt = new Date();
        if (reason) swap.reason = reason;
        await swap.save();

        if (accept && swap.toMembershipId) {
            const assignment = await DutyAssignment.findById(swap.assignmentId);
            if (assignment) {
                assignment.status = 'swapped';
                await assignment.save();
                await DutyAssignment.create({
                    groupId, rosterId: assignment.rosterId, taskKey: assignment.taskKey,
                    localDate: assignment.localDate, membershipId: swap.toMembershipId, origin: 'swap',
                });
                emitGroup(req, 'duty-updated', { groupId, assignmentId: assignment._id, status: 'swapped' });
            }
        }

        await audit({ groupId, actorId: req.user.id, action: accept ? 'swap.accepted' : 'swap.declined', targetType: 'swap', targetId: swap._id });
        res.json({ swap });
    } catch (err) { next(err); }
};

// ============================================================
// MENU
// ============================================================

export const setMenuPlan = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { weekStart, ...rest } = req.body;
        const menu = await MenuPlan.findOneAndUpdate(
            { groupId, weekStart },
            { $set: { ...rest, groupId, weekStart }, $inc: { revision: 1 } },
            { upsert: true, new: true }
        );
        await audit({ groupId, actorId: req.user.id, action: 'menu.published', targetType: 'menu', targetId: menu._id });
        emitGroup(req, 'menu-updated', { groupId, weekStart });
        res.json({ menu });
    } catch (err) { next(err); }
};

export const getMenuPlan = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { weekStart } = req.query;
        const filter = { groupId };
        if (weekStart) filter.weekStart = weekStart;
        const menus = await MenuPlan.find(filter).sort({ weekStart: -1 }).lean();
        res.json({ menus });
    } catch (err) { next(err); }
};

// ============================================================
// NOTES
// ============================================================

const noteAudience = (req) => ({
    $or: [
        { authorUserId: req.user.id },
        { 'audience.type': { $exists: false } },
        { 'audience.type': 'all' },
        { 'audience.type': 'role', 'audience.roles': req.groupRole },
        ...(req.membership ? [{ 'audience.type': 'members', 'audience.membershipIds': req.membership._id }] : []),
    ],
});
const noteEditor = (req) => ['owner', 'manager'].includes(req.groupRole) ? {} : { authorUserId: req.user.id };

export const createNote = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        if (req.body.pinned) {
            const pinnedCount = await Note.countDocuments({ groupId, state: 'active', pinned: true });
            if (pinnedCount >= 3) return res.status(409).json({ msg: 'Pin limit reached (max 3)', code: 'PIN_LIMIT' });
        }
        const note = await Note.create({ ...req.body, groupId, authorMembershipId: req.membership?._id, authorUserId: req.user.id });
        await audit({ groupId, actorId: req.user.id, action: 'note.created', targetType: 'note', targetId: note._id });
        emitGroup(req, 'note-created', { groupId, noteId: note._id, kind: note.kind });
        res.status(201).json({ note });
    } catch (err) { next(err); }
};

export const listNotes = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const notes = await Note.find({ groupId, ...noteAudience(req), state: { $ne: 'deleted' } }).sort({ pinned: -1, createdAt: -1 }).lean();
        res.json({ notes });
    } catch (err) { next(err); }
};

export const getNote = async (req, res, next) => {
    try {
        const note = await Note.findOne({ _id: req.params.noteId, groupId: req.params.groupId, ...noteAudience(req), state: { $ne: 'deleted' } }).lean();
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        res.json({ note });
    } catch (err) { next(err); }
};

export const updateNote = async (req, res, next) => {
    try {
        const note = await Note.findOneAndUpdate(
            { _id: req.params.noteId, groupId: req.params.groupId, ...noteEditor(req) },
            { $set: req.body, $inc: { revision: 1 } },
            { new: true }
        );
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        await audit({ groupId: req.params.groupId, actorId: req.user.id, action: 'note.updated', targetType: 'note', targetId: note._id });
        emitGroup(req, 'note-updated', { groupId, noteId: note._id });
        res.json({ note });
    } catch (err) { next(err); }
};

export const deleteNote = async (req, res, next) => {
    try {
        const note = await Note.findOneAndUpdate(
            { _id: req.params.noteId, groupId: req.params.groupId, ...noteEditor(req) },
            { $set: { state: 'deleted' }, $inc: { revision: 1 } },
            { new: true }
        );
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        await audit({ groupId: req.params.groupId, actorId: req.user.id, action: 'note.deleted', targetType: 'note', targetId: note._id });
        emitGroup(req, 'note-updated', { groupId, noteId: note._id, state: 'deleted' });
        res.json({ msg: 'Note deleted' });
    } catch (err) { next(err); }
};

export const ackNote = async (req, res, next) => {
    try {
        const { groupId, noteId } = req.params;
        const memberships = await activeMemberships(groupId);
        const own = memberships.find(m => String(m.user) === String(req.user.id));
        if (!own) return res.status(403).json({ msg: 'Not a member' });
        await Note.updateOne({ _id: noteId, groupId, ...noteAudience(req), state: 'active' }, { $addToSet: { readBy: { membershipId: own._id, at: new Date() } } });
        res.json({ msg: 'Acknowledged' });
    } catch (err) { next(err); }
};

export const claimTask = async (req, res, next) => {
    try {
        const { groupId, noteId, taskId } = req.params;
        const note = await Note.findOne({ _id: noteId, groupId, ...noteAudience(req), state: 'active' });
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        const memberships = await activeMemberships(groupId);
        const own = memberships.find(m => String(m.user) === String(req.user.id));
        if (!own) return res.status(403).json({ msg: 'Not a member' });
        const result = claimHandoverTask(note, taskId, own._id);
        if (!result.ok) return res.status(409).json({ msg: result.code, code: result.code });
        const updated = await Note.updateOne(
            { _id: noteId, groupId, ...noteAudience(req), state: 'active', tasks: { $elemMatch: { _id: taskId, status: 'open' } } },
            { $set: { 'tasks.$.status': 'claimed', 'tasks.$.claimedBy': own._id }, $inc: { revision: 1 } }
        );
        if (!updated.modifiedCount) return res.status(409).json({ msg: 'TASK_ALREADY_CLAIMED', code: 'TASK_ALREADY_CLAIMED' });
        emitGroup(req, 'note-updated', { groupId, noteId });
        res.json({ msg: 'Task claimed' });
    } catch (err) { next(err); }
};

export const doneTask = async (req, res, next) => {
    try {
        const { groupId, noteId, taskId } = req.params;
        const note = await Note.findOne({ _id: noteId, groupId, ...noteAudience(req), state: 'active' });
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        const memberships = await activeMemberships(groupId);
        const own = memberships.find(m => String(m.user) === String(req.user.id));
        if (!own) return res.status(403).json({ msg: 'Not a member' });
        const result = doneHandoverTask(note, taskId, own._id);
        if (!result.ok) return res.status(409).json({ msg: result.code, code: result.code });
        const updated = await Note.updateOne(
            { _id: noteId, groupId, ...noteAudience(req), state: 'active', tasks: { $elemMatch: { _id: taskId, status: 'claimed' } } },
            { $set: { 'tasks.$.status': 'done', 'tasks.$.doneBy': own._id, 'tasks.$.doneAt': result.task.doneAt }, $inc: { revision: 1 } }
        );
        if (!updated.modifiedCount) return res.status(409).json({ msg: 'TASK_ALREADY_DONE', code: 'TASK_ALREADY_DONE' });
        emitGroup(req, 'note-updated', { groupId, noteId });
        res.json({ msg: 'Task done' });
    } catch (err) { next(err); }
};

// ============================================================
// BOARD TODAY
// ============================================================

export const boardToday = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

        const [duties, menus, notes] = await Promise.all([
            DutyAssignment.find({ groupId, localDate: today }).lean(),
            MenuPlan.find({ groupId }).sort({ weekStart: -1 }).limit(5).lean(),
            Note.find({ groupId, ...noteAudience(req), state: 'active' }).sort({ pinned: -1, createdAt: -1 }).limit(50).lean(),
        ]);

        const pinnedNotes = notes.filter(n => n.pinned);
        const activeHandovers = notes.filter(n => n.kind === 'handover');

        const wday = new Date(today).getUTCDay();
        let todayMenu = null;
        for (const m of menus) {
            const day = m.days?.find(d => d.weekday === wday);
            if (day) { todayMenu = day; break; }
        }

        res.json({ date: today, duties, menu: todayMenu, pinnedNotes, activeHandovers });
    } catch (err) { next(err); }
};

// GET /api/routines/groups/:groupId/menu/bazar-suggestions?weekStart=YYYY-MM-DD
// Reads the menu plan for the week and aggregates all items into a suggested
// bazar list (item -> total quantity hint). Returns items the cook should buy.
export const menuBazarSuggestions = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { weekStart } = req.query;

        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        const start = weekStart || today;

        const menus = await MenuPlan.find({ groupId, weekStart: { $gte: start } })
            .sort({ weekStart: 1 })
            .limit(2)
            .lean();

        // Aggregate items across the week's days and slots
        const itemMap = new Map();
        for (const menu of menus) {
            for (const day of menu.days || []) {
                for (const slot of ['breakfast', 'lunch', 'snacks', 'dinner']) {
                    const items = day.slots?.[slot] || [];
                    for (const it of items) {
                        const key = String(it.name).trim().toLowerCase();
                        if (!key) continue;
                        const existing = itemMap.get(key) || { name: it.name, qtyHint: 0, slots: [], days: [] };
                        existing.qtyHint += (it.qtyHint || 1);
                        existing.slots.push(slot);
                        existing.days.push(day.weekday);
                        itemMap.set(key, existing);
                    }
                }
            }
        }

        const suggestions = Array.from(itemMap.values()).map(v => ({
            name: v.name,
            qtyHint: v.qtyHint,
            suggestedSlots: [...new Set(v.slots)].join(', '),
            suggestedDays: [...new Set(v.days)].join(', '),
        }));

        res.json({ weekStart: start, suggestions, totalItems: suggestions.length });
    } catch (err) { next(err); }
};

// GET /api/routines/groups/:groupId/duties/fairness?month=YYYY-MM
// Counts of duties done/missed per member for the month — powers the fairness
// board and the `fair` rotation mode.
export const dutyFairnessBoard = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { month } = req.query;
        const targetMonth = month || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }).slice(0, 7);

        const from = `${targetMonth}-01`;
        const to = `${targetMonth}-31`;

        const duties = await DutyAssignment.find({
            groupId,
            localDate: { $gte: from, $lte: to },
        }).lean();

        const memberships = await Membership.find({ groupId }).lean();
        const memMap = new Map(memberships.map(m => [String(m._id), m]));

        const board = [];
        for (const m of memberships) {
            const mid = String(m._id);
            const md = duties.filter(d => String(d.membershipId) === mid);
            board.push({
                membershipId: m._id,
                displayName: m.displayName,
                role: m.role,
                total: md.length,
                done: md.filter(d => d.status === 'done').length,
                missed: md.filter(d => d.status === 'missed').length,
                scheduled: md.filter(d => d.status === 'scheduled').length,
                swapped: md.filter(d => d.status === 'swapped').length,
                skipped: md.filter(d => d.status === 'skipped').length,
                bazarCount: md.filter(d => d.taskKey === 'bazar' && d.status === 'done').length,
                cleaningCount: md.filter(d => d.taskKey === 'cleaning' && d.status === 'done').length,
                cookingCount: md.filter(d => d.taskKey === 'cooking' && d.status === 'done').length,
            });
        }

        board.sort((a, b) => b.done - a.done);

        res.json({ month: targetMonth, board });
    } catch (err) { next(err); }
};

// GET /api/routines/groups/:groupId/bazar-spend-rotation
// Returns members sorted by cumulative bazar amount spent (ascending = who
// should do bazar next). Powers the 'fair_amount' roster rotation mode.
export const bazarSpendRotation = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { from, to } = req.query;

        const match = { groupId, taskKey: 'bazar', status: 'done' };
        if (from || to) match.localDate = {};
        if (from) match.localDate.$gte = from;
        if (to) match.localDate.$lte = to;

        const duties = await DutyAssignment.find(match).lean();
        const memberships = await Membership.find({ groupId }).lean();
        const memMap = new Map(memberships.map(m => [String(m._id), m]));

        // Sum linked expense amounts per member
        const expenseIds = duties
            .map(d => d.linkedExpenseId)
            .filter(Boolean);
        let expenseMap = {};
        if (expenseIds.length) {
            const expenses = await Expense.find({ _id: { $in: expenseIds } }).lean();
            expenseMap = {};
            for (const e of expenses) {
                expenseMap[String(e._id)] = e.amount || 0;
            }
        }

        const rotation = memberships.map(m => {
            const mid = String(m._id);
            const md = duties.filter(d => String(d.membershipId) === mid);
            const totalSpent = md.reduce((s, d) => s + (expenseMap[String(d.linkedExpenseId)] || 0), 0);
            return {
                membershipId: m._id,
                displayName: m.displayName,
                role: m.role,
                dutyCount: md.length,
                totalBazarSpentPoisha: totalSpent,
                totalBazarSpentTaka: (totalSpent / 100).toFixed(2),
            };
        });

        rotation.sort((a, b) => a.totalBazarSpentPoisha - b.totalBazarSpentPoisha);

        res.json({ rotation });
    } catch (err) { next(err); }
};

// POST /api/routines/groups/:groupId/emergency-broadcast — owner/manager alert that bypasses quiet hours
export const emergencyBroadcast = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { title, body } = req.body;

        if (!title || !body) return res.status(400).json({ msg: 'title and body are required' });

        const membership = await Membership.findOne({ groupId, user: req.user.id }).lean();
        if (!membership || !['owner', 'manager'].includes(membership.role)) {
            return res.status(403).json({ msg: 'Only owner or manager can send emergency broadcasts' });
        }

        const note = await Note.create({
            groupId,
            authorMembershipId: membership._id,
            authorUserId: req.user.id,
            kind: 'alert',
            title: `[EMERGENCY] ${title}`,
            body,
            audience: { type: 'all' },
            pinned: true,
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
            state: 'active',
        });

        const members = await Membership.find({ groupId, user: { $ne: null } }).populate('user', '_id username').lean();

        for (const m of members) {
            if (!m.user) continue;
            await notify({
                userIds: [m.user._id],
                scope: 'user',
                groupId,
                type: 'emergency.broadcast',
                title: note.title,
                body,
                link: { kind: 'note', id: note._id.toString() },
                dedupeKey: `emergency:broadcast:${groupId}:${note._id}:${m.user._id}`,
            });
        }

        await audit({ groupId, actorId: req.user.id, action: 'emergency.broadcast', targetType: 'note', targetId: note._id });
        req.app.get('io')?.to(`group:${groupId}`).emit('emergency-broadcast', { groupId, noteId: note._id, title: note.title });

        res.status(201).json({ note });
    } catch (err) { next(err); }
};


