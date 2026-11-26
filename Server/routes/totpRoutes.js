import { loginSchema } from '../validation/schemas.js';
import { totpSetupSchema, totpVerifySchema, totpDisableSchema, totpLoginSchema } from '../validation/featureSchemas.js';
import express from 'express';
import auth from '../middleware/auth.js';
import { validate } from '../validation/validate.js';
import {
    setup, verify, disable,
    loginChallenge, login2fa,
} from '../controllers/totpController.js';

const router = express.Router();

// 2FA setup/verify/disable — authenticated
router.post('/2fa/setup', auth, validate(totpSetupSchema), setup);
router.post('/2fa/verify', auth, validate(totpVerifySchema), verify);
router.post('/2fa/disable', auth, validate(totpDisableSchema), disable);

// Login step-up — public (after password validation via /login/2fa-challenge)
router.post('/login/2fa-challenge', validate(loginSchema), loginChallenge);
router.post('/login/2fa', validate(totpLoginSchema), login2fa);

export default router;
