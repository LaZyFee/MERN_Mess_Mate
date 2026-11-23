import express from 'express';
import {
    addMeal, updateMeal, deleteMeal, getMeals, getMealsByMonth,
    createGuestMeal, listGuestMeals, previewBulkMeals, applyBulkMeals,
    previewAbsence, applyAbsence, getTomorrowHeadcount,
} from '../controllers/mealController.js';
import auth from '../middleware/auth.js';
import { requireGroupRole, allowSelfOrAdmin } from '../middleware/roles.js';
import { resolveHistoryWindow } from '../middleware/privacy.js';
import { idParamSchema, monthParamSchema, objectIdParamSchema, mealFilterQuerySchema, headcountQuerySchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const router = express.Router();
router.use(auth);

// Daily meal slot entry uses explicit state and integer portion subunits.
router.post('/:groupId', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), addMeal);
router.post('/:groupId/guests', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), createGuestMeal);
router.get('/:groupId/guests', validate(objectIdParamSchema, 'params'), requireGroupRole('member'), listGuestMeals);
router.post('/:groupId/bulk/preview', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), previewBulkMeals);
router.post('/:groupId/bulk/apply', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), applyBulkMeals);
router.post('/:groupId/absence/preview', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), previewAbsence);
router.post('/:groupId/absence/apply', validate(objectIdParamSchema, 'params'), requireGroupRole('admin'), applyAbsence);

// PUT /api/meals/entry/:id — edit own entry
router.put('/entry/:id', validate(idParamSchema, 'params'), updateMeal);

// GET /api/meals/:groupId?month=&from=&to=&userId= — filtered (ex-members clamped)
router.get('/:groupId', validate(mealFilterQuerySchema, 'query'), requireGroupRole('member'), resolveHistoryWindow, getMeals);

// GET /api/meals/:groupId/headcount/tomorrow?date=YYYY-MM-DD&includeGuests=true
router.get('/:groupId/headcount/tomorrow', validate(headcountQuerySchema, 'query'), requireGroupRole('member'), getTomorrowHeadcount);

// GET /api/meals/:groupId/:month — group meals for a month
router.get('/:groupId/:month', validate(monthParamSchema, 'params'), requireGroupRole('member'), getMealsByMonth);

// DELETE /api/meals/entry/:id — own entry or group admin
router.delete('/entry/:id', validate(idParamSchema, 'params'), requireGroupRole('member'), allowSelfOrAdmin, deleteMeal);

export default router;
