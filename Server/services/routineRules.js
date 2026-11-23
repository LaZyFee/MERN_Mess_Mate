// Routine & Board rule engine — PURE functions, no DB access.
// Duty roster generation, note visibility, handover task claiming.

import { dayString, dateAtDay } from '../utils/dhakaTime.js';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Dhaka civil date string (YYYY-MM-DD) for a given instant, default now. */
export const todayDhaka = (now = new Date()) => dayString(now);

/** Add N Dhaka civil days to a date string. */
export const addDhakaDays = (dateStr, n) => {
    const d = dateAtDay(dateStr);
    d.setUTCDate(d.getUTCDate() + n);
    return dayString(d);
};

/** Is a membership active on a date? (start <= date < end or end null) */
export const isActiveOn = (membership, dateStr) => {
    const d = dateAtDay(dateStr);
    const start = membership.startDate ? dateAtDay(dayString(membership.startDate)) : null;
    const end = membership.endDate ? dateAtDay(dayString(membership.endDate)) : null;
    if (start && d < start) return false;
    if (end && d >= end) return false;
    return true;
};

/** Is a member absent on a date (per membership.leftAt)? */
export const isAbsentOn = (membership, dateStr) => {
    const left = membership.leftAt ? dayString(membership.leftAt) : null;
    if (!left) return false;
    // Compare Dhaka civil dates to avoid offset mismatches
    return dateStr >= left;
};

/**
 * Generate duty assignments for a roster over its horizon.
 * Returns { assignments: [{taskKey, localDate, membershipId, origin:'generated'}], skipped: [...] }
 * Idempotent: caller dedupes by (rosterId, taskKey, localDate).
 *
 * Modes:
 *  - round_robin: cycle eligible members across each task day
 *  - weekly_template: use weeklyTemplate[weekday] for that weekday
 *  - fair: least-loaded eligible member (memberLoads map)
 *  - manual: cycle memberOrder in order
 */
export const generateDuties = ({
    roster,
    activeMemberships, // [{_id, startDate, endDate, leftAt, role}]
    startDateStr, // YYYY-MM-DD Dhaka (inclusive)
    endDateStr, // YYYY-MM-DD Dhaka (inclusive)
    taskKeys = ['bazar'],
    memberLoads = {}, // membershipId -> count so far (for 'fair' mode)
} = {}) => {
    const assignments = [];
    const skipped = [];

    const weekStartsOn = roster.rotation?.weekStartsOn ?? 6; // Saturday
    const skipWhenAbsent = roster.skipWhenAbsent !== false;

    let ordered = [...activeMemberships];
    if (roster.rotation?.memberOrder?.length) {
        const orderMap = new Map(ordered.map(m => [String(m._id), m]));
        ordered = roster.rotation.memberOrder
            .map(id => orderMap.get(String(id)))
            .filter(Boolean);
    }

    const eligible = ordered.filter(m => isActiveOn(m, startDateStr));

    if (eligible.length === 0) return { assignments, skipped: [] };

    let idx = 0;
    let cursor = dateAtDay(startDateStr);
    const end = dateAtDay(endDateStr);

    while (cursor <= end) {
        const dateStr = cursor.toISOString().slice(0, 10);
        // Parse the civil date string as UTC to get the correct day of week,
        // independent of server/Dhaka timezone offset.
        const wday = new Date(dateStr).getUTCDay();

        const daysOfWeek = roster.rotation?.daysOfWeek;
        if (daysOfWeek && daysOfWeek.length && !daysOfWeek.includes(wday)) {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
            continue;
        }

        for (const taskKey of taskKeys) {
            let chosen = null;
            const mode = roster.rotation?.mode || 'round_robin';

            if (mode === 'weekly_template') {
                const tmpl = roster.rotation?.weeklyTemplate;
                const key = WEEKDAYS[wday];
                const ids = tmpl && tmpl.get(key) ? tmpl.get(key) : [];
                const pool = ids
                    .map(id => eligible.find(m => String(m._id) === String(id)))
                    .filter(Boolean);
                chosen = pool.length ? pool[0] : eligible[0];
            } else if (mode === 'fair') {
                chosen = eligible.reduce(
                    (best, m) => {
                        const load = memberLoads[String(m._id)] ?? 0;
                        return !best || load < best.load ? { m, load } : best;
                    },
                    null
                ).m;
            } else if (mode === 'fair_amount') {
                chosen = fairAmountOrder(eligible, memberLoads)[0];
            } else {
                chosen = eligible[idx % eligible.length];
                idx++;
            }

            if (!chosen) continue;

            if (skipWhenAbsent && isAbsentOn(chosen, dateStr)) {
                skipped.push({ taskKey, localDate: dateStr, membershipId: chosen._id, reason: 'absent' });
                continue;
            }

            assignments.push({
                taskKey,
                localDate: dateStr,
                membershipId: chosen._id,
                origin: 'generated',
            });
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { assignments, skipped };
};

/** Note visibility: which memberships can see a note. */
export const visibleNoteAudience = (note, memberships) => {
    const aud = note.audience || { type: 'all' };
    if (aud.type === 'all') return memberships;
    if (aud.type === 'role') {
        return memberships.filter(m => aud.roles && aud.roles.includes(m.role));
    }
    const idSet = new Set((aud.membershipIds || []).map(String));
    return memberships.filter(m => idSet.has(String(m._id)));
};

/** Handover task claim: returns { ok, task } or { ok: false, code }. */
export const claimHandoverTask = (note, taskId, claimerMembershipId) => {
    const task = note.tasks?.find(t => String(t._id) === String(taskId));
    if (!task) return { ok: false, code: 'TASK_NOT_FOUND' };
    if (task.status !== 'open') return { ok: false, code: 'TASK_ALREADY_CLAIMED' };
    return {
        ok: true,
        task: {
            ...task,
            status: 'claimed',
            claimedBy: claimerMembershipId,
            claimedAt: new Date(),
        },
    };
};

/** Handover task mark done (must be claimed first). */
export const doneHandoverTask = (note, taskId, doerMembershipId) => {
    const task = note.tasks?.find(t => String(t._id) === String(taskId));
    if (!task) return { ok: false, code: 'TASK_NOT_FOUND' };
    if (task.status === 'done') return { ok: false, code: 'TASK_ALREADY_DONE' };
    if (task.status !== 'claimed') return { ok: false, code: 'TASK_NOT_CLAIMED' };
    return {
        ok: true,
        task: {
            ...task,
            status: 'done',
            doneBy: doerMembershipId,
            doneAt: new Date(),
        },
    };
};

/**
 * Fair rotation by cumulative amount spent: returns eligible members sorted by
 * cumulative bazar amount spent (ascending = who should do bazar next).
 * Used by the 'fair_amount' roster rotation mode.
 */
export const fairAmountOrder = (eligible, memberAmounts = {}) => {
    return [...eligible].sort((a, b) => {
        const aa = memberAmounts[String(a._id)] ?? 0;
        const bb = memberAmounts[String(b._id)] ?? 0;
        return aa - bb;
    });
};
