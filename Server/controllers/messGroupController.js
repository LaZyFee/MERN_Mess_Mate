import MessGroup from '../models/MessGroup.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import PolicyVersion from '../models/PolicyVersion.js';
import { seedDefaultCategories } from './expenseCategoryController.js';
import { createGroupSchema, addEntrySchema, addMemberSchema, extraSchema, joinByCodeSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import crypto from 'crypto';
import { audit } from '../models/AuditEvent.js';
import AuditEvent from '../models/AuditEvent.js';
import { sendGroupInviteEmail } from '../utils/mailer.js';
import { writeExcelExport, writePdfExport } from '../services/exportService.js';
import { publicProfile, MEMBER_VISIBLE_FIELDS } from '../middleware/privacy.js';
import { groupFeatureFlagSchema as flagSchema } from '../validation/featureSchemas.js';
const makeJoinCode = () => {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I/L)
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[crypto.randomInt(alphabet.length)];
    return `MM-${code}`;
};
// Create Mess Group (with unique join code)
export const createGroup = [
    validate(createGroupSchema),
    async (req, res, next) => {
        try {
            // Retry on the (rare) chance of a code collision
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    const newGroup = await MessGroup.create({
                        name: req.body.name,
                        admin: req.user.id,
                        code: makeJoinCode(),
                        members: [{ user: req.user.id, role: 'admin' }],
                        mealSlots: req.body.mealSlots,
                        mealWeights: req.body.mealWeights,
                        defaultMealSubunits: req.body.defaultMealSubunits,
                        defaultMealsEnabled: req.body.defaultMealsEnabled,
                    });
                    await User.findByIdAndUpdate(req.user.id, { $push: { messGroups: newGroup._id } });
                    // Initialize V2 Membership for the owner
                    const user = await User.findById(req.user.id).lean();
                    const now = new Date();
                    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    await Membership.create({
                        groupId: newGroup._id,
                        user: req.user.id,
                        displayName: user?.username || 'Owner',
                        role: 'owner',
                        startDate: now,
                        createdBy: req.user.id,
                    });
                    // Initialize default PolicyVersion (Doc Â§2: BDT, Asia/Dhaka)
                    await PolicyVersion.create({
                        groupId: newGroup._id,
                        version: 1,
                        effectiveFrom: monthStr,
                        mealWeights: { ...req.body.mealWeights, breakfast: req.body.mealWeights.breakfast, lunch: req.body.mealWeights.lunch, dinner: req.body.mealWeights.dinner },
                        allowedPortions: [0.25, 0.5, 0.75, 1],
                        entryCutoffHour: 23,
                        currency: 'BDT',
                        timezone: 'Asia/Dhaka',
                        rounding: 'largest_remainder',
                        requireExpenseApproval: true,
                        publishedBy: req.user.id,
                    });
                    // Seed Bangladesh preset expense categories (Doc Â§6)
                    await seedDefaultCategories({ groupId: newGroup._id, userId: req.user.id });
                    return res.status(201).json(newGroup);
                } catch (e) {
                    if (e.code !== 11000 || !String(e.message).includes('code')) throw e;
                }
            }
            throw new Error('Could not generate unique join code');
        } catch (err) {
            next(err);
        }
    }
];
// Send Join Request (any authenticated user)
export const sendJoinRequest = async (req, res, next) => {
    try {
        const group = req.group; // loaded by requireGroupRole... but requester is NOT a member yet
        const fetched = group || await MessGroup.findById(req.params.groupId);
        if (!fetched) return res.status(404).json({ msg: 'Group not found' });
        if (fetched.pendingRequests.includes(req.user.id) || fetched.members.some(m => m.user.equals(req.user.id))) {
            return res.status(400).json({ msg: 'Already requested or member' });
        }
        fetched.pendingRequests.push(req.user.id);
        await fetched.save();
        res.json({ msg: 'Request sent' });
    } catch (err) {
        next(err);
    }
};
// Approve Join Request (admin only)
export const approveRequest = async (req, res, next) => {
    try {
        const group = req.group;
        const userId = req.params.userId;
        if (!group.pendingRequests.some(id => id.equals(userId))) {
            return res.status(400).json({ msg: 'No pending request from this user' });
        }
        group.pendingRequests = group.pendingRequests.filter(id => !id.equals(userId));
        group.members.push({ user: userId, role: 'member' });
        await group.save();
        await User.findByIdAndUpdate(userId, { $push: { messGroups: group._id } });
        res.json({ msg: 'Approved' });
    } catch (err) {
        next(err);
    }
};
// Add Member Manually (admin only â€” role guarded in route)
export const addMember = [
    validate(addMemberSchema),
    async (req, res, next) => {
        try {
            const group = req.group;
            const { userId, role } = req.body;
            if (group.members.some(m => m.user.equals(userId))) {
                return res.status(400).json({ msg: 'User already a member' });
            }
            const target = await User.findById(userId);
            if (!target) return res.status(404).json({ msg: 'Target user not found' });
            group.members.push({ user: userId, role });
            await group.save();
            await User.findByIdAndUpdate(userId, { $push: { messGroups: group._id } });
            res.json({ msg: 'Member added successfully' });
        } catch (err) {
            next(err);
        }
    }
];
// Get single group with details â€” MEMBER/ADMIN ONLY (verified via Membership
// interval OR legacy embedded members). Non-members get the same generic 404
// as a missing group: outsiders cannot confirm a groupId exists.
export const getGroupById = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId)
            .populate('admin', MEMBER_VISIBLE_FIELDS)
            .populate('members.user', MEMBER_VISIBLE_FIELDS)
            .populate('pendingRequests', MEMBER_VISIBLE_FIELDS).lean();
        // Privacy: group existence + details are invisible to non-members
        const isMember = group && (
            String(group.admin?._id) === req.user.id ||
            group.members.some(m => String(m.user?._id) === req.user.id)
        );
        if (!group || !isMember) return res.status(404).json({ msg: 'Group not found' });
        const sanitizedAdmin = group.admin ? publicProfile(group.admin) : null;
        const sanitizedMembers = (group.members || []).map(m => ({ ...m, user: m.user ? publicProfile(m.user) : null }));
        const sanitizedPending = (group.pendingRequests || []).map(u => publicProfile(u));
        res.json({ ...group, admin: sanitizedAdmin, members: sanitizedMembers, pendingRequests: sanitizedPending });
    } catch (err) {
        next(err);
    }
};
// All groups the user belongs to â€” was leaking EVERY group's data to any logged-in user (data leakage)
export const getAllGroups = async (req, res, next) => {
    try {
        const groups = await MessGroup.find({ 'members.user': req.user.id })
            .populate('admin', MEMBER_VISIBLE_FIELDS)
            .populate('members.user', MEMBER_VISIBLE_FIELDS)
            .populate('pendingRequests', MEMBER_VISIBLE_FIELDS)
            .lean();
        // Apply publicProfile to strip any sensitive fields from user objects
        const sanitized = groups.map(g => {
            const admin = g.admin ? publicProfile(g.admin) : null;
            const members = (g.members || []).map(m => ({ ...m, user: m.user ? publicProfile(m.user) : null }));
            const pending = (g.pendingRequests || []).map(u => publicProfile(u));
            return { ...g, admin, members, pendingRequests: pending };
        });
        res.json(sanitized);
    } catch (err) {
        next(err);
    }
};
// Add Entry (Meal/Cost)
export const addEntry = [
    validate(addEntrySchema),
    async (req, res, next) => {
        try {
            const group = req.group;
            const isAdmin = req.canEditOthers;
            const { date, meals, costs } = req.body;
            let entry = group.entries.find(e => e.date.toDateString() === new Date(date).toDateString());
            if (!entry) {
                entry = { date: new Date(date), meals: [], costs: [] };
                group.entries.push(entry);
            }
            // Validate and update meals
            for (const m of meals || []) {
                if (!group.members.some(mem => mem.user.equals(m.userId))) {
                    return res.status(400).json({ msg: `User ${m.userId} is not a member` });
                }
                if (isAdmin || m.userId === req.user.id) {
                    const idx = entry.meals.findIndex(me => me.userId.equals(m.userId));
                    if (idx > -1) entry.meals[idx].count = m.count;
                    else entry.meals.push({ userId: m.userId, count: m.count });
                }
            }
            // Validate and update costs
            for (const c of costs || []) {
                if (!group.members.some(mem => mem.user.equals(c.userId))) {
                    return res.status(400).json({ msg: `User ${c.userId} is not a member` });
                }
                if (isAdmin || c.userId === req.user.id) {
                    const idx = entry.costs.findIndex(co => co.userId.equals(c.userId));
                    if (idx > -1) {
                        entry.costs[idx].amount = c.amount;
                        entry.costs[idx].description = c.description;
                    } else {
                        entry.costs.push({ userId: c.userId, amount: c.amount, description: c.description });
                    }
                }
            }
            await group.save();
            res.json(entry);
        } catch (err) {
            next(err);
        }
    }
];
// Get Group Entries (member only)
export const getEntries = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', MEMBER_VISIBLE_FIELDS);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        const sanitizedAdmin = group.admin ? publicProfile(group.admin) : null;
        const sanitizedMembers = (group.members || []).map(m => ({ ...m, user: m.user ? publicProfile(m.user) : null }));
        const sanitizedPending = (group.pendingRequests || []).map(u => publicProfile(u));
        res.json({ ...group, admin: sanitizedAdmin, members: sanitizedMembers, pendingRequests: sanitizedPending });
    } catch (err) {
        next(err);
    }
};
// Calculate Totals (member only)
export const calculate = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', MEMBER_VISIBLE_FIELDS);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (group.entries.length === 0) {
            return res.json({
                totalMeals: 0,
                totalBazar: 0,
                mealRate: 0,
                summaries: group.members.map(member => ({
                    user: member.user.username,
                    totalMeals: 0,
                    totalCosts: 0,
                    mealCost: 0,
                    balance: 0,
                })),
            });
        }
        let totalMeals = 0;
        let totalBazar = 0;
        const userTotals = group.members.map(member => ({
            userId: member.user._id,
            user: member.user.username,
            meals: 0,
            costs: 0,
        }));
        group.entries.forEach(entry => {
            entry.meals.forEach(m => {
                const userIdx = userTotals.findIndex(u => u.userId.equals(m.userId));
                if (userIdx > -1) {
                    userTotals[userIdx].meals += m.count;
                    totalMeals += m.count;
                }
            });
            entry.costs.forEach(c => {
                const userIdx = userTotals.findIndex(u => u.userId.equals(c.userId));
                if (userIdx > -1) {
                    userTotals[userIdx].costs += c.amount;
                    totalBazar += c.amount;
                }
            });
        });
        group.extras.forEach(extra => totalBazar += extra.amount || 0);
        const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;
        const summaries = userTotals.map(ut => ({
            user: ut.user,
            totalMeals: ut.meals,
            totalCosts: ut.costs,
            mealCost: ut.meals * mealRate,
            balance: ut.costs - (ut.meals * mealRate),
        }));
        res.json({ totalMeals, totalBazar, mealRate, summaries });
    } catch (err) {
        next(err);
    }
};
// Export to Excel (member only) — figures come from services/exportService.js
// (ledger-consistent formatting via toDecimalString; no inline float maths).
export const excelExport = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', MEMBER_VISIBLE_FIELDS);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        await writeExcelExport({ group, res });
    } catch (err) {
        next(err);
    }
};
// ---------- Join code & shareable invite links ----------
// GET /api/messgroups/code/:groupId â€” admin sees current code + ready-to-copy
// shareable invite link
export const getJoinCode = async (req, res, next) => {
    try {
        const frontend = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',')[0].trim();
        res.json({
            code: req.group.code,
            inviteLink: `${frontend}/join?code=${encodeURIComponent(req.group.code)}`,
        });
    } catch (err) {
        next(err);
    }
};
// POST /api/messgroups/regenerate-code/:groupId â€” admin rotates the code (old links die)
export const regenerateCode = async (req, res, next) => {
    try {
        const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += alphabet[crypto.randomInt(alphabet.length)];
        req.group.code = `MM-${code}`;
        await req.group.save();
        res.json({ msg: 'Join code regenerated', code: req.group.code });
    } catch (err) {
        next(err);
    }
};
// POST /api/messgroups/join-by-code â€” the ONLY way in: a valid shareable code.
// Group ids/names are never discoverable â€” requests always go through codes.
export const joinByCode = [
    validate(joinByCodeSchema),
    async (req, res, next) => {
        try {
            const group = await MessGroup.findOne({ code: req.body.code });
            // Generic message â€” don't reveal whether the code exists
            if (!group) return res.status(404).json({ msg: 'Invalid join code' });
            if (group.members.some(m => m.user.equals(req.user.id))) {
                return res.status(400).json({ msg: 'Already requested or member' });
            }
            if (group.pendingRequests.includes(req.user.id)) {
                return res.status(400).json({ msg: 'Already requested or member' });
            }
            group.pendingRequests.push(req.user.id);
            await group.save();
            res.json({ msg: 'Request sent â€” waiting for admin approval' });
        } catch (err) {
            next(err);
        }
    },
];
// ---------- Extras management (admin only) ----------
// POST /api/messgroups/extras/:groupId
export const addExtra = [
    validate(extraSchema),
    async (req, res, next) => {
        try {
            req.group.extras.push({ name: req.body.name, amount: req.body.amount });
            await req.group.save();
            res.status(201).json(req.group.extras);
        } catch (err) {
            next(err);
        }
    },
];
// DELETE /api/messgroups/extras/:groupId/:extraId
export const removeExtra = async (req, res, next) => {
    try {
        req.group.extras = req.group.extras.filter(
            e => String(e._id) !== req.params.extraId
        );
        await req.group.save();
        res.json({ msg: 'Extra removed', extras: req.group.extras });
    } catch (err) {
        next(err);
    }
};
// GET /api/messgroups/extras/:groupId
export const getExtras = async (req, res, next) => {
    try {
        res.json(req.group.extras || []);
    } catch (err) {
        next(err);
    }
};
// Remove member (kick / leave). After departure the ex-member's access is
// cut immediately: legacy membership removed; V2 Membership interval closed.
// History remains readable ONLY through membership-interval-scoped queries.
export const removeMember = async (req, res, next) => {
    try {
        const group = req.group;
        const targetId = req.params.userId;
        const isAdmin = group.admin.equals(req.user.id);
        const isSelf = req.user.id === targetId;
        if (!isAdmin && !isSelf) {
            return res.status(403).json({ msg: 'Only admin can remove other members' });
        }
        if (targetId === String(group.admin)) {
            return res.status(400).json({ msg: 'Admin cannot be removed â€” transfer admin role first' });
        }
        const member = group.members.find(m => m.user.equals(targetId));
        if (!member) return res.status(404).json({ msg: 'Not a member of this group' });
        group.members = group.members.filter(m => !m.user.equals(targetId));
        group.pendingRequests = group.pendingRequests.filter(id => !id.equals(targetId));
        await group.save();
        await User.findByIdAndUpdate(targetId, { $pull: { messGroups: group._id } });
        // Close the V2 Membership interval NOW (access cut + balances preserved)
        const now = new Date();
        await Membership.updateMany(
            { groupId: group._id, user: targetId, $or: [{ endDate: null }, { endDate: { $gt: now } }] },
            { $set: { endDate: now, leftAt: now } }
        );
        await audit({
            groupId: group._id, actorId: req.user.id,
            action: isSelf ? 'membership.self_left' : 'membership.kicked',
            targetType: 'membership', reason: isSelf ? 'self leave' : 'kicked by admin',
        });
        res.json({ msg: isSelf ? 'You left the group' : 'Member removed' });
    } catch (err) {
        next(err);
    }
};
// ---------- Invite by email (admin only, uses Nodemailer) ----------
export const inviteByEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ msg: 'Valid email required' });
        }
        const group = req.group; // loaded by requireGroupRole
        await group.populate('admin', 'username');
        await sendGroupInviteEmail(email, group.name, group.admin.username, group.code);
        res.json({ msg: 'Invitation sent' });
    } catch (err) {
        next(err);
    }
};
// ---------- PDF export (member only) — see services/exportService.js ----------
export const pdfExport = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId)
            .populate('members.user', MEMBER_VISIBLE_FIELDS);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        await writePdfExport({ group, res });
    } catch (err) {
        next(err);
    }
};

// ---------- Per-group feature flags ---------- (todo item 12)

// GET /api/messgroups/feature-flags/:groupId
export const getFeatureFlags = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).select('featureFlags').lean();
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        res.json({ flags: group.featureFlags || {} });
    } catch (err) { next(err); }
};

// PATCH /api/messgroups/feature-flags/:groupId
export const updateFeatureFlags = async (req, res, next) => {
    try {
        const updates = flagSchema.parse(req.body);
        const existing = await MessGroup.findById(req.params.groupId).select('featureFlags').lean();
        if (!existing) return res.status(404).json({ msg: 'Group not found' });
        const group = await MessGroup.findByIdAndUpdate(
            req.params.groupId,
            { $set: { featureFlags: { ...(existing.featureFlags || {}), ...updates } } },
            { new: true }
        ).select('featureFlags');
        await audit({ groupId: req.params.groupId, actorId: req.user.id, action: 'group.featureFlags_updated', targetType: 'messGroup', targetId: req.params.groupId, after: updates });
        res.json({ flags: group.featureFlags });
    } catch (err) { next(err); }
};

// ---------- Owner-visible audit log ---------- (todo item 13)
// GET /api/messgroups/audit-log/:groupId?limit=&cursor= — owner/manager/treasurer only
export const getGroupAuditLog = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, cursor } = req.query;

        const membership = await Membership.findOne({ groupId, user: req.user.id }).lean();
        if (!membership || !['owner', 'manager', 'treasurer', 'auditor'].includes(membership.role)) {
            return res.status(403).json({ msg: 'Owner, manager, treasurer, or auditor role required' });
        }

        const filter = { groupId };
        const sort = { createdAt: -1 };
        const l = Math.min(parseInt(limit, 10) || 50, 100);

        let query = AuditEvent.find(filter).sort(sort).limit(l + 1);
        if (cursor) {
            const cursorDate = new Date(cursor);
            if (!isNaN(cursorDate.getTime())) query = query.where('createdAt').lt(cursorDate);
        }

        const events = await query.lean();
        const hasMore = events.length > l;
        const items = hasMore ? events.slice(0, l) : events;
        const nextCursor = hasMore ? items[items.length - 1].createdAt : null;

        res.json({ events: items, nextCursor, hasMore });
    } catch (err) { next(err); }
};


