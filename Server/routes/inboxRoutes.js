import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import {
    listInbox, unreadCount, markRead, getPreferences, updatePreferences,
} from '../controllers/inboxController.js';
import { inboxListQuery, inboxReadSchema, inboxPrefsSchema } from '../validation/inboxSchemas.js';

const router = express.Router();

router.use(auth);

router.get('/', validate(inboxListQuery, 'query'), listInbox);
router.get('/unread-count', unreadCount);
router.post('/read', validate(inboxReadSchema), markRead);
router.get('/preferences', getPreferences);
router.put('/preferences', validate(inboxPrefsSchema), updatePreferences);

export default router;
