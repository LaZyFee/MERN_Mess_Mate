import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from "passport";
import connectDB from './config/db.js';
import "./config/passportJs.js";
import rateLimit from 'express-rate-limit';
import userRouter from './routes/userRoutes.js';
import messGroupRouter from './routes/messGroupRoutes.js';
import session from 'express-session';


dotenv.config();
connectDB();

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => res.send('Meal Mate Server is running'));
app.use('/api/users', userRouter);
app.use('/api/messgroups', messGroupRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
});

// For HTTPS in production: Use a reverse proxy like Nginx or set in hosting (e.g., Heroku). 
// Check process.env.NODE_ENV === 'production' and force HTTPS redirect if needed.
// Example redirect middleware (uncomment in production):
// app.use((req, res, next) => {
//   if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
//     next();
//   } else {
//     res.redirect(`https://${req.hostname}${req.url}`);
//   }
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));