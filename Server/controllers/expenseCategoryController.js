import ExpenseCategory from '../models/ExpenseCategory.js';
import Expense from '../models/Expense.js';
import MessGroup from '../models/MessGroup.js';
import { categorySchema, categoryIdParamSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

// Predefined editable Bangladesh household presets (Doc §6)
export const BANGLADESH_PRESET_CATEGORIES = [
    { name: 'Bazar / Groceries', splitMode: 'meal_units', isFoodPool: true, icon: '🛒' },
    { name: 'Rice (Chal)', splitMode: 'meal_units', isFoodPool: true, icon: '🍚' },
    { name: 'Fish, Meat & Vegetables', splitMode: 'meal_units', isFoodPool: true, icon: '🥩' },
    { name: 'Cooking Oil & Spices', splitMode: 'meal_units', isFoodPool: true, icon: '🫒' },
    { name: 'Cooking Gas / LPG', splitMode: 'meal_units', isFoodPool: false, icon: '🔥' },
    { name: 'Cook / Helper Salary', splitMode: 'equal_all', isFoodPool: false, icon: '🧑‍🍳' },
    { name: 'Apartment Rent', splitMode: 'equal_all', isFoodPool: false, icon: '🏠' },
    { name: 'Electricity Bill', splitMode: 'member_days', isFoodPool: false, icon: '⚡' },
    { name: 'Water Bill', splitMode: 'member_days', isFoodPool: false, icon: '💧' },
    { name: 'Wi-Fi / Internet', splitMode: 'equal_all', isFoodPool: false, icon: '📶' },
    { name: 'Waste / Cleaning', splitMode: 'equal_all', isFoodPool: false, icon: '🧹' },
    { name: 'Common Supplies & Toiletries', splitMode: 'equal_all', isFoodPool: false, icon: '🧻' },
    { name: 'Repairs & Maintenance', splitMode: 'equal_all', isFoodPool: false, icon: '🔧' },
    { name: 'Personal Purchases', splitMode: 'personal', isFoodPool: false, icon: '👤' },
];

/**
 * Seed Bangladesh preset categories for a mess group if not already present.
 */
export const seedDefaultCategories = async ({ groupId, userId }) => {
    const existing = await ExpenseCategory.find({ groupId }).select('name').lean();
    const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));

    const toInsert = BANGLADESH_PRESET_CATEGORIES
        .filter(preset => !existingNames.has(preset.name.toLowerCase().trim()))
        .map(preset => ({
            ...preset,
            groupId,
            createdBy: userId,
        }));

    if (toInsert.length > 0) {
        return await ExpenseCategory.insertMany(toInsert);
    }
    return [];
};

// POST /api/messgroups/categories/:groupId/seed — admin endpoint to seed preset categories
export const seedCategoriesEndpoint = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const seeded = await seedDefaultCategories({ groupId, userId: req.user.id });
        res.status(201).json({ msg: `Seeded ${seeded.length} preset categories`, count: seeded.length });
    } catch (err) {
        next(err);
    }
};

// POST /api/messgroups/categories/:groupId  (admin) — create a category
export const createCategory = [
    validate(categorySchema),
    async (req, res, next) => {
        try {
            const group = req.group; // from requireGroupRole('admin')
            const { name, icon, splitMode } = req.body;

            try {
                const category = await ExpenseCategory.create({
                    groupId: group._id,
                    name,
                    icon: icon || '',
                    splitMode,
                    createdBy: req.user.id,
                });
                res.status(201).json(category);
            } catch (e) {
                if (e.code === 11000) {
                    return res.status(400).json({ msg: `Category "${name}" already exists in this group` });
                }
                throw e;
            }
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/messgroups/categories/:groupId  (member) — list categories
export const getCategories = async (req, res, next) => {
    try {
        const categories = await ExpenseCategory.find({
            groupId: req.params.groupId,
            isArchived: false,
        }).sort({ createdAt: 1 });
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

// PUT /api/messgroups/categories/:groupId/:categoryId  (admin) — rename / change split mode
export const updateCategory = [
    validate(categorySchema.partial()),
    async (req, res, next) => {
        try {
            const { groupId, categoryId } = req.params;

            const category = await ExpenseCategory.findOne({ _id: categoryId, groupId });
            if (!category) return res.status(404).json({ msg: 'Category not found' });

            const { name, icon, splitMode } = req.body;
            if (name !== undefined) category.name = name;
            if (icon !== undefined) category.icon = icon;
            if (splitMode !== undefined) category.splitMode = splitMode;

            try {
                await category.save();
            } catch (e) {
                if (e.code === 11000) {
                    return res.status(400).json({ msg: `Category "${name}" already exists in this group` });
                }
                throw e;
            }

            res.json(category);
        } catch (err) {
            next(err);
        }
    },
];

// DELETE /api/messgroups/categories/:groupId/:categoryId  (admin) — archive (keeps old summaries intact)
export const deleteCategory = async (req, res, next) => {
    try {
        const { groupId, categoryId } = req.params;

        const category = await ExpenseCategory.findOne({ _id: categoryId, groupId });
        if (!category) return res.status(404).json({ msg: 'Category not found' });

        category.isArchived = true;
        await category.save();

        res.json({ msg: 'Category archived (historical summaries keep it)', category });
    } catch (err) {
        next(err);
    }
};
