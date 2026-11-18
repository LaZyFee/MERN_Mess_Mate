import express from 'express';
import { addMeal, updateMeal, getMealsByMonth, deleteMeal, getMeals } from '../controllers/mealController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole, allowSelfOrAdmin } from '../middleware/roles.js';
import { mealEntrySchema, idParamSchema, monthParamSchema, objectIdParamSchema, mealFilterQuerySchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const router = express.Router();
router.use(auth);

// POST /api/meals/:groupId — upsert own meal for a date
router.post('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), addMeal);

// PUT /api/meals/entry/:id — edit own entry
router.put('/entry/:id', validate(idParamSchema, 'params'), updateMeal);

// GET /api/meals/:groupId?month=&from=&to=&userId= — filtered
router.get('/:groupId', validate(mealFilterQuerySchema, 'query'), requireGroupRole('member'), getMeals);

// GET /api/meals/:groupId/:month — group meals for a month
router.get('/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('member'), getMealsByMonth);

// DELETE /api/meals/entry/:id — own entry or group admin
router.delete('/entry/:id', validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin, deleteMeal);

export default router;
