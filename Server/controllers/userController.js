import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

// Register User
export const register = [
    body('username').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('phone').optional().isMobilePhone(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { username, email, password, phone } = req.body;
        console.log(req.body);

        try {
            let user = await User.findOne({ email });

            if (user) return res.status(400).json({ msg: 'User already exists' });

            user = new User({ username, email, password, phone });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();

            const payload = { user: { id: user.id } };
            jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
                if (err) throw err;
                res.json({
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        phone: user.phone,
                    },
                    token
                });

            });
        } catch (err) {
            res.status(500).send(err.message);
        }
    }
];

// Login User
export const login = [
    body('email').isEmail(),
    body('password').exists(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { email, password } = req.body;

        try {
            let user = await User.findOne({ email });
            if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

            const payload = { user: { id: user.id } };
            jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
                if (err) throw err;
                res.json({
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        phone: user.phone
                    },
                    token
                });
            });
        } catch (err) {
            res.status(500).send(err.message);
        }
    }
];

// Get User Profile
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
export const googleAuth = async (req, res) => {
    try {
        const { googleId, email, name, profilePic } = req.user;

        // Check for an existing user or create a new one
        let user = await UserModel.findOne({ googleId });

        if (!user) {
            user = await UserModel.create({
                googleId,
                email,
                name,
                username: name,
                profilePic,
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Redirect with token and serialized user object as query parameters
        const userQuery = JSON.stringify({
            _id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            isAdmin: user.isAdmin,
        });

        res.redirect(
            `${process.env.FRONTEND_URL}/login/success?token=${token}&user=${encodeURIComponent(userQuery)}`
        );

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};