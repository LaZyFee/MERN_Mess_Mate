import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
    setupSchema, verifySchema, disableSchema, login2faSchema,
    setup, verify, disable,
    loginChallenge, login2fa,
} from '../controllers/totpController.js';

const router = express.Router();

// 2FA setup/verify/disable — authenticated
router.post('/2fa/setup', auth, validate(setupSchema), setup);
router.post('/2fa/verify', auth, validate(verifySchema), verify);
router.post('/2fa/disable', auth, validate(disableSchema), disable);

// Login step-up — public (after password validation via /login/2fa-challenge)
router.post('/login/2fa-challenge', validate(login2faSchema), loginChallenge);
router.post('/login/2fa', validate(login2faSchema), login2fa);

export default router;
