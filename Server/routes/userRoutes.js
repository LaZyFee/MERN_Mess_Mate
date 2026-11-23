import express from 'express';
import passport from 'passport';
import {
    register, login, refresh, logout, getProfile, googleAuth,
    forgotPassword, resetPassword, verifyEmail, changePassword, uploadProfilePic, updateProfile,
    getGroupMembersDirectory, downloadMyData,
} from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { objectIdParamSchema } from '../validation/schemas.js';
import { validate } from '../validation/validate.js';

const router = express.Router();

// Auth
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);          // POST { refreshToken } → new access + rotated refresh
router.post('/logout', logout);            // POST { refreshToken } → invalidates stored token

// Password reset / verification (public, token-based)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Profile (authenticated)
router.use(auth);
router.get('/profile', getProfile);
// Co-member directory — only visible if you share the group (privacy guard inside)
router.get('/groups/:groupId/members', validate(objectIdParamSchema, 'params'), getGroupMembersDirectory);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/profile-pic', upload.single('image'), uploadProfilePic);

// Download my data — privacy compliance
router.get('/download-my-data', downloadMyData);

// Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
    googleAuth
);

export default router;
