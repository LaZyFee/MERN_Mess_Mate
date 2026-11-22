import Roster from '../models/Roster.js';
import DutyAssignment from '../models/DutyAssignment.js';
import SwapRequest from '../models/SwapRequest.js';
import MenuPlan from '../models/MenuPlan.js';
import Note from '../models/Note.js';
import Membership from '../models/Membership.js';
import { audit } from '../models/AuditEvent.js';
import { notify } from '../services/inboxService.js';
import {
    generateDuties,
    visibleNoteAudience,
    claimHandoverTask,
    doneHandoverTask,
} from '../services/routineRules.js';

const emitGroup = (req, event, payload) => {
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
        const notes = await Note.find({ groupId, state: { $ne: 'deleted' } }).sort({ pinned: -1, createdAt: -1 }).lean();
        const memberships = await activeMemberships(groupId);
        const visible = notes.filter(n => visibleNoteAudience(n, memberships).length > 0);
        res.json({ notes: visible });
    } catch (err) { next(err); }
};

export const getNote = async (req, res, next) => {
    try {
        const note = await Note.findOne({ _id: req.params.noteId, groupId: req.params.groupId, state: { $ne: 'deleted' } }).lean();
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        res.json({ note });
    } catch (err) { next(err); }
};

export const updateNote = async (req, res, next) => {
    try {
        const note = await Note.findOneAndUpdate(
            { _id: req.params.noteId, groupId: req.params.groupId },
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
            { _id: req.params.noteId, groupId: req.params.groupId },
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
        await Note.updateOne({ _id: noteId, groupId }, { $addToSet: { readBy: { membershipId: own._id, at: new Date() } } });
        res.json({ msg: 'Acknowledged' });
    } catch (err) { next(err); }
};

export const claimTask = async (req, res, next) => {
    try {
        const { groupId, noteId, taskId } = req.params;
        const note = await Note.findOne({ _id: noteId, groupId });
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        const memberships = await activeMemberships(groupId);
        const own = memberships.find(m => String(m.user) === String(req.user.id));
        if (!own) return res.status(403).json({ msg: 'Not a member' });
        const result = claimHandoverTask(note, taskId, own._id);
        if (!result.ok) return res.status(409).json({ msg: result.code });
        await Note.updateOne({ _id: noteId }, { $inc: { revision: 1 } });
        emitGroup(req, 'note-updated', { groupId, noteId });
        res.json({ msg: 'Task claimed' });
    } catch (err) { next(err); }
};

export const doneTask = async (req, res, next) => {
    try {
        const { groupId, noteId, taskId } = req.params;
        const note = await Note.findOne({ _id: noteId, groupId });
        if (!note) return res.status(404).json({ msg: 'Note not found' });
        const memberships = await activeMemberships(groupId);
        const own = memberships.find(m => String(m.user) === String(req.user.id));
        if (!own) return res.status(403).json({ msg: 'Not a member' });
        const result = doneHandoverTask(note, taskId, own._id);
        if (!result.ok) return res.status(409).json({ msg: result.code });
        await Note.updateOne({ _id: noteId }, { $inc: { revision: 1 } });
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
            Note.find({ groupId, state: 'active' }).sort({ pinned: -1, createdAt: -1 }).limit(50).lean(),
        ]);

        const memberships = await activeMemberships(groupId);
        const visibleNotes = notes.filter(n => visibleNoteAudience(n, memberships).length > 0);
        const pinnedNotes = visibleNotes.filter(n => n.pinned);
        const activeHandovers = visibleNotes.filter(n => n.kind === 'handover');

        const wday = new Date(today).getUTCDay();
        let todayMenu = null;
        for (const m of menus) {
            const day = m.days?.find(d => d.weekday === wday);
            if (day) { todayMenu = day; break; }
        }

        res.json({ date: today, duties, menu: todayMenu, pinnedNotes, activeHandovers });
    } catch (err) { next(err); }
};


