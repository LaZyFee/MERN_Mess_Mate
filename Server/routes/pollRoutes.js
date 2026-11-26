import Poll from '../models/Poll.js';
import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import { cursorListQuery } from '../validation/schemas.js';
import {
    pollCreateSchema, pollVoteSchema, pollIdParam, featureGroupParam,
} from '../validation/featureSchemas.js';
import {
    listPolls, createPoll, votePoll, closePoll, pollResults,
} from '../controllers/pollController.js';

const router = express.Router();
router.use(auth);
router.param('pollId', async (req, res, next, id) => {
    if (!pollIdParam.safeParse({ pollId: id }).success) return res.status(400).json({ msg: 'Invalid poll id' });
    const poll = await Poll.findById(id);
    if (!poll) return res.status(404).json({ msg: 'Poll not found' });
    req.poll = poll;
    req.params.groupId = poll.groupId;
    next();
});

router.get('/groups/:groupId', validate(featureGroupParam, 'params'), validate(cursorListQuery, 'query'), requireGroupRoleV2('member'), listPolls);
router.post('/groups/:groupId', validate(featureGroupParam, 'params'), validate(pollCreateSchema), requireGroupRoleV2('member'), createPoll);
router.post('/:pollId/vote', validate(pollVoteSchema), requireGroupRoleV2('member'), votePoll);
router.post('/:pollId/close', requireGroupRoleV2('member'), closePoll);
router.get('/:pollId/results', requireGroupRoleV2('member'), pollResults);

export default router;
