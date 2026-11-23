import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import {
    rosterCreateSchema, rosterUpdateSchema, rosterIdParam, groupIdParam,
    dutyMarkDoneSchema, dutyReassignSchema,
    swapCreateSchema, swapRespondSchema,
    menuPlanCreateSchema,
    noteCreateSchema, noteUpdateSchema, noteIdParam, noteTaskParam, noteAckSchema,
} from '../validation/routineSchemas.js';
import {
    createRoster, listRosters, getRoster, updateRoster, publishRoster, extendHorizon,
    listDuties, markDutyDone, reassignDuty,
    createSwap, respondSwap,
    setMenuPlan, getMenuPlan,
    createNote, listNotes, getNote, updateNote, deleteNote, ackNote, claimTask, doneTask,
    boardToday, menuBazarSuggestions, dutyFairnessBoard, bazarSpendRotation, emergencyBroadcast,
} from '../controllers/routinesController.js';

const router = express.Router();
router.use(auth);

// Rosters
router.get('/groups/:groupId/rosters', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listRosters);
router.post('/groups/:groupId/rosters', validate(groupIdParam, 'params'), validate(rosterCreateSchema), requireGroupRoleV2('manager'), createRoster);
router.get('/groups/:groupId/rosters/:rosterId', validate(rosterIdParam, 'params'), requireGroupRoleV2('member'), getRoster);
router.patch('/groups/:groupId/rosters/:rosterId', validate(rosterIdParam, 'params'), validate(rosterUpdateSchema), requireGroupRoleV2('manager'), updateRoster);
router.post('/groups/:groupId/rosters/:rosterId/publish', validate(rosterIdParam, 'params'), requireGroupRoleV2('manager'), publishRoster);
router.post('/groups/:groupId/rosters/:rosterId/extend-horizon', validate(rosterIdParam, 'params'), requireGroupRoleV2('manager'), extendHorizon);

// Duties
router.get('/groups/:groupId/duties', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listDuties);
router.post('/groups/:groupId/duties/:assignmentId/done', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), markDutyDone);
router.post('/groups/:groupId/duties/:assignmentId/reassign', validate(groupIdParam, 'params'), validate(dutyReassignSchema), requireGroupRoleV2('manager'), reassignDuty);

// Swaps
router.post('/groups/:groupId/swaps', validate(groupIdParam, 'params'), validate(swapCreateSchema), requireGroupRoleV2('member'), createSwap);
router.post('/groups/:groupId/swaps/:swapId/respond', validate(groupIdParam, 'params'), validate(swapRespondSchema), requireGroupRoleV2('member'), respondSwap);

// Menu
router.post('/groups/:groupId/menu', validate(groupIdParam, 'params'), validate(menuPlanCreateSchema), requireGroupRoleV2('manager'), setMenuPlan);
router.get('/groups/:groupId/menu', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), getMenuPlan);

// Notes
router.post('/groups/:groupId/notes', validate(groupIdParam, 'params'), validate(noteCreateSchema), requireGroupRoleV2('member'), createNote);
router.get('/groups/:groupId/notes', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listNotes);
router.get('/groups/:groupId/notes/:noteId', validate(noteIdParam, 'params'), requireGroupRoleV2('member'), getNote);
router.patch('/groups/:groupId/notes/:noteId', validate(noteIdParam, 'params'), validate(noteUpdateSchema), requireGroupRoleV2('member'), updateNote);
router.delete('/groups/:groupId/notes/:noteId', validate(noteIdParam, 'params'), requireGroupRoleV2('member'), deleteNote);
router.post('/groups/:groupId/notes/:noteId/ack', validate(noteIdParam, 'params'), requireGroupRoleV2('member'), ackNote);
router.post('/groups/:groupId/notes/:noteId/tasks/:taskId/claim', validate(noteTaskParam, 'params'), requireGroupRoleV2('member'), claimTask);
router.post('/groups/:groupId/notes/:noteId/tasks/:taskId/done', validate(noteTaskParam, 'params'), requireGroupRoleV2('member'), doneTask);

// Board today
router.get('/groups/:groupId/board/today', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), boardToday);

// Menu -> bazar suggestions
router.get('/groups/:groupId/menu/bazar-suggestions', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), menuBazarSuggestions);

// Duty fairness board
router.get('/groups/:groupId/duties/fairness', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), dutyFairnessBoard);

// Bazar rotation by cumulative amount spent
router.get('/groups/:groupId/bazar-spend-rotation', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), bazarSpendRotation);

// Emergency broadcast (owner/manager, bypasses quiet hours)
router.post('/groups/:groupId/emergency-broadcast', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), emergencyBroadcast);

export default router;
