import MessGroup from '../models/MessGroup.js';
import User from '../models/User.js';
import XLSX from 'xlsx';
import { body, validationResult } from 'express-validator';

// Create Mess Group
export const createGroup = [
    body('name').notEmpty(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const newGroup = new MessGroup({
                name: req.body.name,
                admin: req.user.id,
                members: [{ user: req.user.id, role: 'admin' }],
            });
            await newGroup.save();

            await User.findByIdAndUpdate(req.user.id, { $push: { messGroups: newGroup._id } });

            res.json(newGroup);
        } catch (err) {
            next(err); // Pass to global error handler
        }
    }
];

// Send Join Request
export const sendJoinRequest = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        if (group.pendingRequests.includes(req.user.id) || group.members.some(m => m.user.equals(req.user.id))) {
            return res.status(400).json({ msg: 'Already requested or member' });
        }

        group.pendingRequests.push(req.user.id);
        await group.save();

        res.json({ msg: 'Request sent' });
    } catch (err) {
        next(err);
    }
};

// Approve Join Request
export const approveRequest = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.admin.equals(req.user.id)) return res.status(403).json({ msg: 'Not admin' });

        const userId = req.params.userId;
        group.pendingRequests = group.pendingRequests.filter(id => !id.equals(userId));
        group.members.push({ user: userId, role: 'member' });
        await group.save();

        await User.findByIdAndUpdate(userId, { $push: { messGroups: group._id } });

        res.json({ msg: 'Approved' });
    } catch (err) {
        next(err);
    }
};
// Add Member Manually (Admin only)
export const addMember = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId);
        if (!group) return res.status(404).json({ msg: 'Group not found' });

        // Check if requester is the admin
        if (!group.admin.equals(req.user.id)) {
            return res.status(403).json({ msg: 'Only admin can add members' });
        }

        const { userId, role } = req.body; // role = "member" by default

        // Check if user already a member
        if (group.members.some(m => m.user.equals(userId))) {
            return res.status(400).json({ msg: 'User already a member' });
        }

        // Add member
        group.members.push({ user: userId, role: role || 'member' });
        await group.save();

        // Update User’s messGroups list
        await User.findByIdAndUpdate(userId, { $push: { messGroups: group._id } });

        res.json({ msg: 'Member added successfully', group });
    } catch (err) {
        next(err);
    }
};

// Get single group with details
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

// Get all mess groups with user details
export const getAllGroups = async (req, res, next) => {
    try {
        const groups = await MessGroup.find()
            .populate('admin', 'username email phone profilePic') // populate admin
            .populate('members.user', 'username email phone profilePic') // populate members
            .populate('pendingRequests', 'username email phone profilePic'); // populate pending requests

        res.json(groups);
    } catch (err) {
        next(err);
    }
};

// Add Entry (Meal/Cost) - Added validation for userIds being members
export const addEntry = [
    body('date').isDate(),
    body('meals').isArray().optional(),
    body('costs').isArray().optional(),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const group = await MessGroup.findById(req.params.groupId);
            if (!group) return res.status(404).json({ msg: 'Group not found' });
            if (!group.members.some(m => m.user.equals(req.user.id))) return res.status(403).json({ msg: 'Not a member' });

            const { date, meals, costs } = req.body;
            let entry = group.entries.find(e => e.date.toDateString() === new Date(date).toDateString());

            if (!entry) {
                entry = { date: new Date(date), meals: [], costs: [] };
                group.entries.push(entry);
            }

            const isAdmin = group.admin.equals(req.user.id);

            // Validate and update meals
            if (meals) {
                for (const m of meals) {
                    if (!group.members.some(mem => mem.user.equals(m.userId))) {
                        return res.status(400).json({ msg: `Invalid userId ${m.userId} - not a member` });
                    }
                    if (isAdmin || m.userId === req.user.id) {
                        const idx = entry.meals.findIndex(me => me.userId.equals(m.userId));
                        if (idx > -1) entry.meals[idx].count = m.count;
                        else entry.meals.push({ userId: m.userId, count: m.count });
                    }
                }
            }

            // Validate and update costs
            if (costs) {
                for (const c of costs) {
                    if (!group.members.some(mem => mem.user.equals(c.userId))) {
                        return res.status(400).json({ msg: `Invalid userId ${c.userId} - not a member` });
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
            }

            await group.save();
            res.json(entry);
        } catch (err) {
            next(err);
        }
    }
];

// Get Group Entries
export const getEntries = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', 'username');
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.members.some(m => m.user._id.equals(req.user.id))) return res.status(403).json({ msg: 'Not a member' });

        res.json(group);
    } catch (err) {
        next(err);
    }
};

// Calculate Totals (Handled edge cases: no entries, zero division)
export const calculate = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', 'username');
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.members.some(m => m.user._id.equals(req.user.id))) return res.status(403).json({ msg: 'Not a member' });

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

        // Add extras to totalBazar
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

// Export to Excel (Handled empty data)
export const excelExport = async (req, res, next) => {
    try {
        const group = await MessGroup.findById(req.params.groupId).populate('members.user', 'username');
        if (!group) return res.status(404).json({ msg: 'Group not found' });
        if (!group.members.some(m => m.user._id.equals(req.user.id))) return res.status(403).json({ msg: 'Not a member' });

        const wb = XLSX.utils.book_new();
        const wsData = [];

        // Header
        wsData.push(['Date', ...group.members.map(m => `${m.user.username} Meals`), ...group.members.map(m => `${m.user.username} Costs`)]);

        // Entries (sorted)
        if (group.entries.length > 0) {
            group.entries.sort((a, b) => a.date - b.date).forEach(entry => {
                const row = [entry.date.toDateString()];
                group.members.forEach(member => {
                    const meal = entry.meals.find(m => m.userId.equals(member.user._id));
                    row.push(meal ? meal.count : '');
                });
                group.members.forEach(member => {
                    const cost = entry.costs.find(c => c.userId.equals(member.user._id));
                    row.push(cost ? cost.amount : '');
                });
                wsData.push(row);
            });
        } else {
            wsData.push(['No entries available']);
        }

        // Totals
        const calcData = await exports.calculate(req, { json: data => data }); // Reuse calculate (mock res)
        wsData.push(['TOTAL MEALS', calcData.totalMeals]);
        wsData.push(['TOTAL BAZAR', calcData.totalBazar]);
        wsData.push(['MEAL RATE', calcData.mealRate]);
        calcData.summaries.forEach(s => {
            wsData.push([s.user, s.totalMeals, s.totalCosts, s.mealCost, s.balance]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="mess_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) {
        next(err);
    }
};