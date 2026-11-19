import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import { requireGroupRoleV2 } from '../middleware/roles.js';
import { idempotent } from '../middleware/idempotency.js';
import {
    submitTransaction, confirmTransaction, rejectTransaction, reverseTransaction,
    listTransactions, getBalance, listFunds, createFund, changeCustodian,
} from '../controllers/moneyController.js';
import {
    groupIdParam, moneySchema, txIdParam, listMoneyQuery, fundSchema, custodianSchema, balanceParam, reasonBody,
} from '../validation/schemas.js';

const router = express.Router();

router.use(auth);

// ---------- Money ----------
router.get('/groups/:groupId/money', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(listMoneyQuery, 'query'), listTransactions);
router.post('/groups/:groupId/money', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), validate(moneySchema), idempotent('money.submit'), submitTransaction);
router.post('/groups/:groupId/money/:txId/confirm', validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), idempotent('money.confirm'), confirmTransaction);
router.post('/groups/:groupId/money/:txId/reject', validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), rejectTransaction);
router.post('/groups/:groupId/money/:txId/reverse', validate(txIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(reasonBody), idempotent('money.reverse'), reverseTransaction);
router.get('/groups/:groupId/memberships/:membershipId/balance', validate(balanceParam, 'params'), requireGroupRoleV2('member'), getBalance);

// ---------- Fund accounts ----------
router.get('/groups/:groupId/funds', validate(groupIdParam, 'params'), requireGroupRoleV2('member'), listFunds);
router.post('/groups/:groupId/funds', validate(groupIdParam, 'params'), requireGroupRoleV2('treasurer'), validate(fundSchema), createFund);
router.post('/groups/:groupId/funds/:fundId/custodian', validate(groupIdParam, 'params'), requireGroupRoleV2('owner'), validate(custodianSchema), changeCustodian);

export default router;