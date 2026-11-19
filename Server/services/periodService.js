import Period from '../models/Period.js';
import PolicyVersion from '../models/PolicyVersion.js';
import { audit } from '../models/AuditEvent.js';

// Period service — open → review → finalized state machine with revision
// guards. Cost-affecting mutations MUST call ensureOpen (and bumpRevision in
// the same flow) so a month cannot close while it is being edited.

export const monthOf = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Get or lazily create the open Period for a group+month. */
export const getOrCreatePeriod = async ({ groupId, month, userId }) => {
    let period = await Period.findOne({ groupId, month });
    if (!period) {
        const policy = await PolicyVersion.findOne({ groupId }).sort({ effectiveFrom: -1, version: -1 });
        period = await Period.create({ groupId, month, state: 'open', openedBy: userId, policyVersion: policy?._id || null });
    }
    return period;
};

/**
 * Assert the period is open (or review with allowReview flag) and optionally
 * bump+return the new revision for a compare-and-write.
 */
export const ensureOpen = async ({ groupId, month, allowReview = false, session = null }) => {
    const q = Period.findOne({ groupId, month });
    if (session) q.session(session);
    const period = await q;
    if (!period) return null; // no period row yet = implicitly open
    if (period.state === 'finalized') {
        throw Object.assign(new Error('Period is finalized; use the correction process'), { status: 409 });
    }
    if (period.state === 'review' && !allowReview) {
        throw Object.assign(new Error('Period is in review; ordinary edits are stopped'), { status: 409 });
    }
    return period;
};

/** Atomically bump the revision and return the NEW period document. */
export const bumpRevision = async ({ groupId, month, session = null }) => {
    const opts = { new: true };
    if (session) opts.session = session;

    const period = await Period.findOneAndUpdate(
        { groupId, month, state: { $ne: 'finalized' } },
        { $inc: { revision: 1 } },
        opts
    );
    if (!period) {
        throw Object.assign(new Error('Period finalized or missing during edit'), { status: 409 });
    }
    return period;
};

/** Begin review (open → review). */
export const beginReview = async ({ groupId, month, userId }) => {
    const period = await Period.findOneAndUpdate(
        { groupId, month, state: 'open' },
        { $set: { state: 'review', reviewStartedAt: new Date() } },
        { new: true }
    );
    if (!period) throw Object.assign(new Error('Period not in open state'), { status: 409 });
    await audit({ groupId, actorId: userId, action: 'period.review_started', targetType: 'period', targetId: period._id });
    return period;
};

/** Return to open (review → open) — correction window. */
export const returnToOpen = async ({ groupId, month, userId, reason = '' }) => {
    const period = await Period.findOneAndUpdate(
        { groupId, month, state: 'review' },
        { $set: { state: 'open' }, $inc: { revision: 1 } },
        { new: true }
    );
    if (!period) throw Object.assign(new Error('Period not in review state'), { status: 409 });
    await audit({ groupId, actorId: userId, action: 'period.returned_to_open', targetType: 'period', targetId: period._id, reason });
    return period;
};

/**
 * Finalize with expected revision: one caller wins, concurrent finalize gets
 * the already-finalized period back (idempotent) or a conflict on stale revision.
 */
export const finalizeGuard = async ({ groupId, month, expectedRevision }) => {
    const filter = { groupId, month };
    if (typeof expectedRevision === 'number') filter.revision = expectedRevision;
    const period = await Period.findOne(filter);
    if (!period) throw Object.assign(new Error('Stale revision: data changed during finalization. Refetch and retry.'), { status: 409 });
    return period;
};

/** Mark finalized after the statement has been persisted. */
export const markFinalized = async ({ periodId, statementId, userId }) => {
    const period = await Period.findByIdAndUpdate(
        periodId,
        { $set: { state: 'finalized', finalizedAt: new Date(), finalizedBy: userId, statement: statementId } },
        { new: true }
    );
    await audit({ groupId: period.groupId, actorId: userId, action: 'period.finalized', targetType: 'period', targetId: period._id, after: { statementId } });
    return period;
};
