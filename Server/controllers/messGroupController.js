import MessGroup from '../models/MessGroup.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import PolicyVersion from '../models/PolicyVersion.js';
import { seedDefaultCategories } from './expenseCategoryController.js';
import ExcelJS from 'exceljs';
import { createGroupSchema, addEntrySchema, addMemberSchema, extraSchema, joinByCodeSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { sendGroupInviteEmail } from '../utils/mailer.js';

// Generate a short, human-shareable join code, e.g. "MM-7K2QPX"
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

                    // Initialize default PolicyVersion (Doc §2: BDT, Asia/Dhaka)
                    await PolicyVersion.create({
                        groupId: newGroup._id,
                        version: 1,
                        effectiveFrom: monthStr,
                        mealWeights: { breakfast: 500, lunch: 1000, dinner: 1000 },
                        allowedPortions: [0, 0.5, 1, 1.5, 2],
                        entryCutoffHour: 23,
                        currency: 'BDT',
                        timezone: 'Asia/Dhaka',
                        rounding: 'largest_remainder',
                        requireExpenseApproval: true,
                        publishedBy: req.user.id,
                    });

                    // Seed Bangladesh preset expense categories (Doc §6)
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

// Add Member Manually (admin only — role guarded in route)
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

// Get single group with details (member/admin only — role guarded in route)
export const getGroupById = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId)
            .populate('admin', 'username email phone profilePic')
            .populate('members.user', 'username email phone profilePic')
            .populate('pendingRequests', 'username email phone profilePic');

        if (!group) return res.status(404).json({ msg: 'Group not found' });

        res.json(group);
    } catch (err) {
        next(err);
    }
};

// All groups the user belongs to — was leaking EVERY group's data to any logged-in user (data leakage)
export const getAllGroups = async (req, res, next) => {
    try {
        const groups = await MessGroup.find({ 'members.user': req.user.id })
            .populate('admin', 'username email phone profilePic')
            .populate('members.user', 'username email phone profilePic')
            .populate('pendingRequests', 'username email phone profilePic');

        res.json(groups);
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
        const group = await MessGroup.findById(req.params.groupId)
            .populate('members.user', 'username');
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        res.json(group);
    } catch (err) {
        next(err);
    }
};

// Calculate Totals (member only)
export const calculate = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', 'username');
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

// Export to Excel (member only) — ExcelJS (maintained, secure; replaces unmaintained SheetJS)
export const excelExport = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', 'username');
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Mess Data');

        const headers = ['Date',
            ...group.members.map(m => `${m.user.username} Meals`),
            ...group.members.map(m => `${m.user.username} Costs`)];
        ws.addRow(headers);
        ws.getRow(1).font = { bold: true };

        let totalMeals = 0, totalBazar = 0;
        const totals = group.members.map(member => ({ user: member.user.username, meals: 0, costs: 0 }));

        if (group.entries.length > 0) {
            group.entries.sort((a, b) => a.date - b.date).forEach(entry => {
                const row = [entry.date.toDateString()];
                group.members.forEach((member, i) => {
                    const meal = entry.meals.find(m => m.userId.equals(member.user._id));
                    if (meal) { row.push(meal.count); totals[i].meals += meal.count; totalMeals += meal.count; }
                    else row.push('');
                });
                group.members.forEach((member, i) => {
                    const cost = entry.costs.find(c => c.userId.equals(member.user._id));
                    if (cost) { row.push(cost.amount); totals[i].costs += cost.amount; totalBazar += cost.amount; }
                    else row.push('');
                });
                ws.addRow(row);
            });
        } else {
            ws.addRow(['No entries available']);
        }

        group.extras.forEach(extra => totalBazar += extra.amount || 0);
        const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

        ws.addRow([]);
        ws.addRow(['TOTAL MEALS', totalMeals]);
        ws.addRow(['TOTAL BAZAR', totalBazar]);
        ws.addRow(['MEAL RATE', mealRate]);
        ws.addRow([]);
        ws.addRow(['Member', 'Meals', 'Costs', 'Meal Cost', 'Balance']);
        totals.forEach(t => {
            const mealCost = t.meals * mealRate;
            ws.addRow([t.user, t.meals, t.costs, mealCost, t.costs - mealCost]);
        });

        res.setHeader('Content-Disposition', 'attachment; filename="mess_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await wb.xlsx.write(res); // stream directly to the response
        res.end();
    } catch (err) {
        next(err);
    }
};

// ---------- Join code system ----------

// GET /api/messgroups/code/:groupId — admin sees current code
export const getJoinCode = async (req, res, next) => {
    try {
        res.json({ code: req.group.code });
    } catch (err) {
        next(err);
    }
};

// POST /api/messgroups/regenerate-code/:groupId — admin rotates the code (old links die)
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

// POST /api/messgroups/join-by-code — user joins a group's pending list by sharing the code
export const joinByCode = [
    validate(joinByCodeSchema),
    async (req, res, next) => {
        try {
            const group = await MessGroup.findOne({ code: req.body.code });
            // Generic message — don't reveal whether the code exists
            if (!group) return res.status(404).json({ msg: 'Invalid join code' });

            if (group.members.some(m => m.user.equals(req.user.id))) {
                return res.status(400).json({ msg: 'Already requested or member' });
            }
            if (group.pendingRequests.includes(req.user.id)) {
                return res.status(400).json({ msg: 'Already requested or member' });
            }

            group.pendingRequests.push(req.user.id);
            await group.save();
            res.json({ msg: 'Request sent — waiting for admin approval' });
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

// ---------- Remove member (admin or self) ----------

// DELETE /api/messgroups/remove-member/:groupId/:userId
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
            return res.status(400).json({ msg: 'Admin cannot be removed — transfer admin role first' });
        }

        const member = group.members.find(m => m.user.equals(targetId));
        if (!member) return res.status(404).json({ msg: 'Not a member of this group' });

        group.members = group.members.filter(m => !m.user.equals(targetId));
        group.pendingRequests = group.pendingRequests.filter(id => !id.equals(targetId));
        await group.save();

        await User.findByIdAndUpdate(targetId, { $pull: { messGroups: group._id } });

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

// ---------- PDF export (member only) ----------
export const pdfExport = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId)
            .populate('members.user', 'username');
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        // Compute totals (same logic as calculate)
        let totalMeals = 0, totalBazar = 0;
        const totals = group.members.map(member => ({ user: member.user.username, meals: 0, costs: 0 }));
        group.entries.forEach(entry => {
            entry.meals.forEach(m => {
                const idx = group.members.findIndex(mem => mem.user._id.equals(m.userId));
                if (idx > -1) { totals[idx].meals += m.count; totalMeals += m.count; }
            });
            entry.costs.forEach(c => {
                const idx = group.members.findIndex(mem => mem.user._id.equals(c.userId));
                if (idx > -1) { totals[idx].costs += c.amount; totalBazar += c.amount; }
            });
        });
        group.extras.forEach(e => totalBazar += e.amount || 0);
        const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="mess_report.pdf"');

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        doc.fontSize(20).text(group.name, { align: 'center' });
        doc.fontSize(12).text(`Mess Report — generated ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(14).text('Daily Entries', { underline: true });
        doc.moveDown(0.5);
        if (group.entries.length === 0) {
            doc.fontSize(10).text('No entries recorded.');
        } else {
            group.entries.sort((a, b) => a.date - b.date).forEach(entry => {
                doc.fontSize(10).text(entry.date.toDateString());
                entry.meals.forEach(m => {
                    const mem = group.members.find(mem => mem.user._id.equals(m.userId));
                    doc.text(`   ${mem ? mem.user.username : 'Unknown'}: ${m.count} meals`, { indent: 10 });
                });
                entry.costs.forEach(c => {
                    const mem = group.members.find(mem => mem.user._id.equals(c.userId));
                    doc.text(`   ${mem ? mem.user.username : 'Unknown'}: ${c.amount} (${c.description || 'cost'})`, { indent: 10 });
                });
                doc.moveDown(0.3);
            });
        }

        doc.addPage();
        doc.fontSize(14).text('Monthly Summary', { underline: true });
        doc.moveDown();
        doc.fontSize(11).text(`Total Meals: ${totalMeals}`);
        doc.text(`Total Bazar: ${totalBazar}`);
        doc.text(`Meal Rate: ${mealRate.toFixed(2)}`);
        doc.moveDown();

        doc.fontSize(12).text('Member Balances', { underline: true });
        doc.moveDown(0.3);
        totals.forEach(t => {
            const mealCost = t.meals * mealRate;
            const balance = t.costs - mealCost;
            doc.fontSize(10).text(
                `${t.user}: meals=${t.meals}, paid=${t.costs.toFixed(2)}, mealCost=${mealCost.toFixed(2)}, balance=${balance.toFixed(2)} ${balance >= 0 ? '(receives)' : '(owes)'}`
            );
        });

        doc.end();
    } catch (err) {
        next(err);
    }
};
