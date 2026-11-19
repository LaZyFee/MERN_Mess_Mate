import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { idempotent } from '../middleware/idempotency.js';
import {
    finalize, getStatement, listStatements, getStatementById,
} from '../controllers/statementController.js';
import { groupIdParam, monthParam, finalizeSchema } from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Statements ----------
router.get('/groups/:groupId/statements', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listStatements);
router.get('/groups/:groupId/statements/id/:statementId', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), getStatementById);
router.get('/groups/:groupId/statements/:month', validate(monthParam, 'params'), requireGroupRoleV2('member'), getStatement);
router.post('/groups/:groupId/statements/:month/finalize', validate(monthParam, 'params'), requireGroupRoleV2('owner'), validate(finalizeSchema), idempotent('statement.finalize'), finalize);

export default router;