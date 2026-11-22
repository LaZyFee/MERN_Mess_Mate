import { jobStatuses } from '../services/jobRunner.js';

/** GET /api/admin/jobs — last run + lock state per background job. */
export const listJobStatuses = async (req, res, next) => {
    try {
        const jobs = await jobStatuses();
        res.json({ jobs });
    } catch (err) { next(err); }
};
