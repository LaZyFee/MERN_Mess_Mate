import Poll from '../models/Poll.js';
import { audit } from '../models/AuditEvent.js';
import { pollCreateSchema, pollVoteSchema as voteSchema } from '../validation/featureSchemas.js';
import { paginateQuery } from '../utils/pagination.js';

// GET /api/polls/groups/:groupId — list polls (open + recently closed; cursor)
export const listPolls = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const q = req.validated?.query || {};
        if (q.all === 'true') {
            const polls = await Poll.find({ groupId }).sort({ createdAt: -1 }).lean();
            return res.json({ polls, nextCursor: null, hasMore: false });
        }
        const page = await paginateQuery({
            model: Poll, filter: { groupId },
            cursor: q.cursor || null, limit: q.limit || 50,
            sortField: 'createdAt', sortOrder: -1,
        });
        res.json({ polls: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore });
    } catch (err) { next(err); }
};

// POST /api/polls/groups/:groupId — create poll
export const createPoll = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { question, options, expiresAt, relatedMenuItem } = pollCreateSchema.parse(req.body);

        const poll = await Poll.create({
            groupId,
            question,
            options: options.map(text => ({ text, voteCount: 0, votedBy: [] })),
            createdBy: req.user.id,
            expiresAt: new Date(expiresAt),
            relatedMenuItem: relatedMenuItem || '',
        });
        await audit({ groupId, actorId: req.user.id, action: 'poll.created', targetType: 'poll', targetId: poll._id });
        res.status(201).json({ poll });
    } catch (err) { next(err); }
};

// POST /api/polls/:pollId/vote — vote on a poll
export const votePoll = async (req, res, next) => {
    try {
        const { optionIndex } = voteSchema.parse(req.body);

        const poll = req.poll;
        if (poll.status === 'closed') return res.status(409).json({ msg: 'Poll is closed' });
        if (new Date() > poll.expiresAt) {
            poll.status = 'closed';
            await poll.save();
            return res.status(409).json({ msg: 'Poll has expired' });
        }
        if (!poll.options[optionIndex]) return res.status(400).json({ msg: 'Invalid option' });

        // Remove previous vote by this user if any
        for (const opt of poll.options) {
            opt.votedBy = opt.votedBy.filter(id => String(id) !== String(req.user.id));
        }

        poll.options[optionIndex].votedBy.push(req.user.id);
        for (const option of poll.options) option.voteCount = option.votedBy.length;
        await poll.save();

        await audit({ groupId: poll.groupId, actorId: req.user.id, action: 'poll.voted', targetType: 'poll', targetId: poll._id, after: { optionIndex } });
        res.json({ poll });
    } catch (err) { next(err); }
};

// POST /api/polls/:pollId/close — close a poll (creator or manager+)
export const closePoll = async (req, res, next) => {
    try {
        const poll = req.poll;

        if (String(poll.createdBy) !== String(req.user.id) && !['owner', 'manager', 'treasurer'].includes(req.groupRole)) {
            return res.status(403).json({ msg: 'Only the creator or a manager can close this poll' });
        }

        poll.status = 'closed';
        await poll.save();
        await audit({ groupId: poll.groupId, actorId: req.user.id, action: 'poll.closed', targetType: 'poll', targetId: poll._id });
        res.json({ poll });
    } catch (err) { next(err); }
};

// GET /api/polls/:pollId/results — poll results
export const pollResults = async (req, res, next) => {
    try {
        const poll = req.poll.toObject();

        const totalVotes = poll.options.reduce((s, o) => s + o.voteCount, 0);
        const results = poll.options.map((o, i) => ({
            index: i,
            text: o.text,
            voteCount: o.voteCount,
            percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0,
        }));

        res.json({ poll, results, totalVotes });
    } catch (err) { next(err); }
};