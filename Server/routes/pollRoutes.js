import Poll from '../models/Poll.js';
import express from 'express';
import auth from '../middleware/auth.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { validate } from '../validation/validate.js';
import { z } from 'zod';
import { objectIdSchema } from '../validation/schemas.js';
import {
    listPolls, createPoll, votePoll, closePoll, pollResults,
} from '../controllers/pollController.js';

const pollCreateSchema = z.object({
    question: z.string().trim().min(1).max(200),
    options: z.array(z.string().trim().min(1).max(120)).min(2).max(6),
    expiresAt: z.string().datetime(),
    relatedMenuItem: z.string().trim().max(120).optional().default(''),
});

const voteSchema = z.object({
    optionIndex: z.number().int().min(0).max(5),
});

const groupIdParam = z.object({ groupId: objectIdSchema });
const pollIdParam = z.object({ pollId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid poll id') });

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

router.get('/groups/:groupId', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listPolls);
router.post('/groups/:groupId', validate(groupIdParam, 'params'), validate(pollCreateSchema), requireGroupRoleV2('member'), createPoll);
router.post('/:pollId/vote', validate(voteSchema), requireGroupRoleV2('member'), votePoll);
router.post('/:pollId/close', requireGroupRoleV2('member'), closePoll);
router.get('/:pollId/results', requireGroupRoleV2('member'), pollResults);

export default router;