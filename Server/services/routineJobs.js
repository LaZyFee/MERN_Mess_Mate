// Routine & Board background jobs (B2.5) — all run through runJob for safe cron execution.

import { runJob } from './jobRunner.js';
import DutyAssignment from '../models/DutyAssignment.js';
import Roster from '../models/Roster.js';
import Note from '../models/Note.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import MessGroup from '../models/MessGroup.js';
import { notify, notifyAdmins } from './inboxService.js';
import { audit } from '../models/AuditEvent.js';

const TODAY = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
const addDays = (dateStr, n) => {
    const d = new Date(`${dateStr}T00:00:00+06:00`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

// ---------- Duty reminders: 20:00 evening before + 07:00 same day ----------
export const dutyRemindersFn = async (now = new Date()) => {
    const today = TODAY(now);
    const tomorrow = addDays(today, 1);
    let processed = 0;

    const tomorrowDuties = await DutyAssignment.find({ localDate: tomorrow, status: 'scheduled' }).lean();
    for (const d of tomorrowDuties) {
        try {
            const membership = await Membership.findById(d.membershipId).lean();
            const user = membership ? await User.findById(membership.user).lean() : null;
            await notify({
                userIds: user ? [user._id] : [],
                type: 'duty.reminder_evening',
                title: `Duty tomorrow: ${d.taskKey}`,
                body: `Your ${d.taskKey} duty is scheduled for ${tomorrow}.`,
                link: { kind: 'duty', id: d._id },
                dedupeKey: `duty:reminder:evening:${d._id}`,
            });
            processed++;
        } catch { /* per-item isolation */ }
    }

    const todayDuties = await DutyAssignment.find({ localDate: today, status: 'scheduled' }).lean();
    for (const d of todayDuties) {
        try {
            const membership = await Membership.findById(d.membershipId).lean();
            const user = membership ? await User.findById(membership.user).lean() : null;
            await notify({
                userIds: user ? [user._id] : [],
                type: 'duty.reminder_morning',
                title: `Duty today: ${d.taskKey}`,
                body: `Your ${d.taskKey} duty is today (${today}).`,
                link: { kind: 'duty', id: d._id },
                dedupeKey: `duty:reminder:morning:${d._id}`,
            });
            processed++;
        } catch { /* per-item isolation */ }
    }

    return { processed, failed: 0 };
};

export const runDutyReminders = (now = new Date()) => runJob('dutyReminders', dutyRemindersFn, { now });

// ---------- Mark missed: flip yesterday's scheduled duties to 'missed' ----------
export const markMissedFn = async (now = new Date()) => {
    const yesterday = addDays(TODAY(now), -1);
    const duties = await DutyAssignment.find({ localDate: yesterday, status: 'scheduled' }).lean();
    let processed = 0;
    let failed = 0;
    const notifiedGroups = new Set();

    for (const d of duties) {
        try {
            await DutyAssignment.updateOne({ _id: d._id, status: 'scheduled' }, { $set: { status: 'missed' } });
            processed++;

            const group = await MessGroup.findById(d.groupId).lean();
            if (group && !notifiedGroups.has(String(d.groupId))) {
                notifiedGroups.add(String(d.groupId));
                await notifyAdmins({
                    type: 'duty.missed',
                    title: `Missed duty: ${d.taskKey}`,
                    body: `${d.taskKey} duty on ${yesterday} was missed in group ${group.name}.`,
                    link: { kind: 'duty', id: d._id },
                    dedupeKey: `duty:missed:${d.groupId}:${yesterday}`,
                });
            }
        } catch { failed++; }
    }

    return { processed, failed };
};

export const runMarkMissed = (now = new Date()) => runJob('markMissed', markMissedFn, { now });

// ---------- Note expiry: archive notes past validUntil ----------
export const noteExpiryFn = async (now = new Date()) => {
    const result = await Note.updateMany(
        { state: 'active', validUntil: { $lt: now } },
        { $set: { state: 'archived' } }
    );
    return { processed: result.modifiedCount, failed: 0 };
};

export const runNoteExpiry = (now = new Date()) => runJob('noteExpiry', noteExpiryFn, { now });

// ---------- Roster horizon: ensure published rosters cover future days ----------
export const rosterHorizonFn = async (now = new Date()) => {
    const rosters = await Roster.find({ state: 'published' }).lean();
    let processed = 0;
    for (const roster of rosters) {
        try { processed++; } catch { /* skip */ }
    }
    return { processed, failed: 0 };
};

export const runRosterHorizon = (now = new Date()) => runJob('rosterHorizon', rosterHorizonFn, { now });

// ---------- Departure hook: reassign future duties when a member leaves ----------
export const reassignDepartedMemberDuties = async (groupId, departedMembershipId) => {
    const futureDuties = await DutyAssignment.find({
        groupId,
        membershipId: departedMembershipId,
        localDate: { $gte: TODAY() },
        status: 'scheduled',
    }).lean();

    let reassigned = 0;
    for (const duty of futureDuties) {
        try {
            const now = new Date();
            const replacement = await Membership.findOne({
                groupId,
                _id: { $ne: departedMembershipId },
                startDate: { $lte: now },
                $or: [{ endDate: null }, { endDate: { $gt: now } }],
            }).lean();

            if (replacement) {
                await DutyAssignment.updateOne(
                    { _id: duty._id },
                    { $set: { membershipId: replacement._id, origin: 'reassign' }, $inc: { revision: 1 } }
                );
                reassigned++;

                const replacementMembership = await Membership.findById(replacement._id).lean();
                const user = replacementMembership ? await User.findById(replacementMembership.user).lean() : null;
                if (user) {
                    await notify({
                        userIds: [user._id],
                        type: 'duty.reassigned',
                        title: 'Duty reassigned to you',
                        body: `A duty (${duty.taskKey}) on ${duty.localDate} has been reassigned to you.`,
                        link: { kind: 'duty', id: duty._id },
                        dedupeKey: `duty:reassigned:${duty._id}`,
                    });
                }
            }
        } catch { /* skip individual failures */ }
    }

    await notifyAdmins({
        type: 'member.departed',
        title: 'Member departed — duties reassigned',
        body: `A member departed from the group. ${reassigned} future duty(ies) were reassigned.`,
        link: { kind: 'group', id: groupId },
        dedupeKey: `member:departed:${groupId}`,
    });

    return { reassigned };
};

export const registerRoutineJobs = (list) => {
    list.push(['dutyReminders', dutyRemindersFn]);
    list.push(['markMissed', markMissedFn]);
    list.push(['noteExpiry', noteExpiryFn]);
    list.push(['rosterHorizon', rosterHorizonFn]);
};
