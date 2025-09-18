import express from 'express';
import passport from "passport";
import { register, login, getProfile, googleAuth } from '../controllers/userController.js';
import auth from '../middleware/auth.js';
const router = express.Router();


router.post('/register', register);
router.post('/login', login);
router.get('/profile', auth, getProfile);

// Google OAuth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
    googleAuth
);


export default router;