import Meal from '../models/Meal.js';
import { mealEntrySchema, idParamSchema, monthParamSchema, mealFilterQuerySchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

// month helper — derived, never trusted from client
const monthOf = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// POST /api/meals/:groupId — upsert own meal entry for a date
export const addMeal = [
    validate(mealEntrySchema),
    async (req, res, next) => {
        try {
            const { lunch = 0, dinner = 0 } = req.body;
            const date = req.body.date || new Date();
            const month = monthOf(date);

            const meal = await Meal.findOneAndUpdate(
                {
                    groupId: req.params.groupId,
                    userId: req.user.id,
                    date: {
                        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
                        $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
                    },
                },
                {
                    lunch,
                    dinner,
                    date: new Date(date), // must be in update — filter range isn't copied on insert
                    totalMeals: lunch + dinner,
                    month,
                },
                { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
            );

            res.status(201).json(meal);

            // Realtime: notify everyone in the group room
            req.app.get('io')?.to(`group:${req.params.groupId}`).emit('meal-updated', {
                groupId: req.params.groupId, mealId: meal._id, userId: meal.userId,
            });
        } catch (err) {
            next(err);
        }
    },
];

// PUT /api/meals/entry/:id — only own entry
export const updateMeal = [
    validate(idParamSchema, 'params'),
    validate(mealEntrySchema.partial()),
    async (req, res, next) => {
        try {
            const meal = await Meal.findOne({ _id: req.params.id, userId: req.user.id });
            if (!meal) return res.status(404).json({ msg: 'Meal entry not found' });

            const { lunch, dinner } = req.body;
            const date = req.body.date;
            if (date) { meal.date = date; meal.month = monthOf(date); }
            if (lunch !== undefined) meal.lunch = lunch;
            if (dinner !== undefined) meal.dinner = dinner;

            await meal.save();
            res.json(meal);
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/meals/:groupId?month=YYYY-MM | ?from=&to= | &userId=
export const getMealsByMonth = [
    validate(monthParamSchema, 'params'),
    validate(mealFilterQuerySchema, 'query'),
    async (req, res, next) => {
        try {
            const filter = { groupId: req.params.groupId };
            const q = req.validated.query;

            if (q.month) filter.month = q.month;
            else if (q.from || q.to) {
                filter.date = {};
                if (q.from) filter.date.$gte = q.from;
                if (q.to) filter.date.$lte = q.to;
            }
            if (q.userId) filter.userId = q.userId;

            const meals = await Meal.find(filter)
                .populate('userId', 'username')
                .sort({ date: 1 })
                .lean();

            res.json(meals);
        } catch (err) {
            next(err);
        }
    },
];

// DELETE /api/meals/entry/:id — own entry, or group admin
export const deleteMeal = [
    validate(idParamSchema, 'params'),
    async (req, res, next) => {
        try {
            const meal = await Meal.findById(req.params.id);
            if (!meal) return res.status(404).json({ msg: 'Meal entry not found' });

            if (!meal.userId.equals(req.user.id) && !req.canEditOthers) {
                return res.status(403).json({ msg: 'Not allowed to delete this entry' });
            }

            await meal.deleteOne();
            res.json({ msg: 'Meal entry deleted' });
        } catch (err) {
            next(err);
        }
    },
];

// GET /api/meals/:groupId?month=YYYY-MM | ?from=&to= | &userId= — filtered list
export const getMeals = [
    validate(mealFilterQuerySchema, 'query'),
    async (req, res, next) => {
        try {
            const filter = { groupId: req.params.groupId };
            const q = req.validated?.query || {};

            if (q.month) filter.month = q.month;
            else if (q.from || q.to) {
                filter.date = {};
                if (q.from) filter.date.$gte = q.from;
                if (q.to) filter.date.$lte = q.to;
            }
            if (q.userId) filter.userId = q.userId;

            const meals = await Meal.find(filter)
                .populate('userId', 'username')
                .sort({ date: 1 })
                .lean();

            res.json(meals);
        } catch (err) {
            next(err);
        }
    },
];
