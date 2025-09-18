import express from 'express';
import { createGroup, sendJoinRequest, approveRequest, addMember, getAllGroups, getGroupById, addEntry, getEntries, calculate, excelExport } from '../controllers/messGroupController.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.post('/create', auth, createGroup);
router.post('/join-request/:groupId', auth, sendJoinRequest);
router.post('/approve/:groupId/:userId', auth, approveRequest);
router.post('/add-member/:groupId', auth, addMember);
router.post('/add-entry/:groupId', auth, addEntry);


router.get('/all', auth, getAllGroups);
router.get('/:groupId', auth, getGroupById);
router.get('/entries/:groupId', auth, getEntries);
router.get('/calculate/:groupId', auth, calculate);
router.get('/export/:groupId', auth, excelExport);



export default router;