// InviteCode controller (B3.1) — hashed join codes with rate limiting.
// Plaintext code is returned only once at creation; thereafter only hash+prefix exist.

import InviteCode, { hashInviteCode, inviteCodePrefix, generateInviteCode } from '../models/InviteCode.js';
import MessGroup from '../models/MessGroup.js';
import Membership from '../models/Membership.js';
import { audit } from '../models/AuditEvent.js';
import { recordSecurityEvent } from '../models/SecurityEvent.js';
import { withTransaction } from '../utils/transaction.js';

// In-memory rate-limit buckets (per-IP + per-user). In production use Redis.
const ipBuckets = new Map();
const userBuckets = new Map();
const userLocks = new Map();

const NOW = () => new Date();

// ------ Join-by-code with limiter ------
// POST /api/invite/join-by-code  { code, groupId }
export const joinByCode = async (req, res, next) => {
    try {
        const { code, groupId } = req.body;
        if (!code || !groupId) {
            return res.status(400).json({ msg: 'code and groupId are required' });
        }

        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const userId = req.user?.id || null;

        const lock = userLocks.get(userId);
        if (lock && lock.lockedUntil > NOW()) {
            await recordSecurityEvent({ userId, groupId, type: 'join_code_failure', ip, ua: req.headers['user-agent'] || '', meta: { reason: 'user_locked' } });
            return res.status(429).json({ msg: 'Too many failed attempts, try again later' });
        }

        const hash = hashInviteCode(code);
        const prefix = inviteCodePrefix(code);

        const doc = await InviteCode.findOne({
            codeHash: hash, prefix, groupId, revokedAt: null,
            expiresAt: { $gt: NOW() },
            $expr: { $lt: ['$usedCount', '$maxUses'] },
        }).lean();

        if (!doc) {
            if (userId) {
                const ub = userBuckets.get(userId) || { count: 0, windowStart: NOW(), failures: 0 };
                ub.failures++;
                if (ub.failures >= 5) {
                    const lockoutMs = 15 * 60 * 1000 * Math.pow(2, Math.floor(ub.failures / 5));
                    userLocks.set(userId, { lockedUntil: new Date(NOW().getTime() + lockoutMs) });
                }
                userBuckets.set(userId, ub);
            }
            await recordSecurityEvent({ userId, groupId, type: 'join_code_failure', ip, ua: req.headers['user-agent'] || '', meta: { code: prefix } });
            return res.status(200).json({ msg: 'Join processed' });
        }

        if (userId) {
            await withTransaction(async (session) => {
                const updated = await InviteCode.findOneAndUpdate(
                    { _id: doc._id, revokedAt: null, expiresAt: { $gt: NOW() }, usedCount: { $lt: doc.maxUses } },
                    { $inc: { usedCount: 1 } },
                    { new: true, session }
                );
                if (!updated) throw Object.assign(new Error('Invite is no longer available'), { status: 409 });

                const group = await MessGroup.findOne({ _id: groupId }).session(session);
                if (!group) throw Object.assign(new Error('Group not found'), { status: 404 });
                const already = group.members?.some(m => String(m.user) === String(userId));
                if (!already) group.members.push({ user: userId, role: 'member' });
                await group.save({ session });
                await Membership.findOneAndUpdate(
                    { groupId, user: userId },
                    { groupId, user: userId, role: 'member', startDate: NOW() },
                    { upsert: true, new: true, session }
                );
            });
        }

        if (userId) userLocks.delete(userId);

        await audit({ actorId: userId, groupId, action: 'invite.join', targetType: 'mess_group', targetId: groupId });

        res.status(200).json({ msg: 'Joined group' });
    } catch (err) { next(err); }
};

// ------ Create/regenerate invite code (owner/manager only) ------
// POST /api/invite/codes  { groupId, maxUses?, ttlDays? }
export const createInviteCode = async (req, res, next) => {
    try {
        const { groupId, maxUses, ttlDays } = req.body;
        if (!groupId) return res.status(400).json({ msg: 'groupId is required' });

        const group = await MessGroup.findById(groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.admin?.equals?.(req.user.id) && String(group.admin) !== req.user.id) {
            return res.status(403).json({ msg: 'Only group admin can create invite codes' });
        }

        await InviteCode.updateMany({ groupId, revokedAt: null }, { revokedAt: NOW() });

        const code = generateInviteCode(8);
        const hash = hashInviteCode(code);
        const prefix = inviteCodePrefix(code);
        const expiresAt = new Date(Date.now() + ((ttlDays || 7) * 24 * 3600 * 1000));

        const doc = await InviteCode.create({
            groupId, codeHash: hash, prefix, expiresAt,
            maxUses: maxUses || 20, usedCount: 0, createdBy: req.user.id,
        });

        await audit({ actorId: req.user.id, groupId, action: 'invite.created', targetType: 'invite_code', targetId: doc._id });

        res.status(201).json({
            code,
            inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5174'}/join/${code}`,
            expiresAt,
            maxUses: doc.maxUses,
        });
    } catch (err) { next(err); }
};

// ------ Get code metadata (no plaintext) ------
// GET /api/invite/codes/:groupId
export const getInviteCodeMetadata = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const active = await InviteCode.findOne({
            groupId, revokedAt: null, expiresAt: { $gt: NOW() },
        }).sort({ createdAt: -1 }).lean();

        if (!active) {
            return res.status(200).json({ prefix: null, expiresAt: null, usesLeft: 0, active: false });
        }

        res.status(200).json({
            prefix: active.prefix,
            expiresAt: active.expiresAt,
            usesLeft: Math.max(0, active.maxUses - active.usedCount),
            active: true,
        });
    } catch (err) { next(err); }
};