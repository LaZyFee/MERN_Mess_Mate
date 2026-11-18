import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import passport from 'passport';
import connectDB from './config/db.js';
import './config/passportJs.js';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import userRouter from './routes/userRoutes.js';
import messGroupRouter from './routes/messGroupRoutes.js';
import mealRouter from './routes/mealRoutes.js';
import expenseRouter from './routes/expenseRoutes.js';
import summaryRouter from './routes/summaryRoutes.js';
import statsRouter from './routes/statsRoutes.js';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import session from 'express-session';

dotenv.config();
connectDB();

const app = express();
app.set('trust proxy', 1); // needed for express-rate-limit behind proxies (Render/Heroku/Vercel)

// ---------- Security headers ----------
app.use(helmet());

// ---------- Rate limiting ----------
// Stricter limit on auth endpoints (brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // generous for OAuth+register+login bursts; still strong brute-force protection
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many attempts, try again in 15 minutes' },
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});

// ---------- CORS (strict allowlist — no wildcard) ----------
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// ---------- Body parsing + sanitization ----------
app.use(express.json({ limit: '10kb' })); // reject oversized payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// NoSQL injection sanitization is done in Server/validation/validate.js
// (express-mongo-sanitize middleware reassigns req.query, which Express 5 forbids)
app.use(hpp()); // HTTP parameter pollution defense

// ---------- Session (only used for the Google OAuth handshake) ----------
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000, // 10 min is enough for OAuth flow
        },
    })
);
app.use(passport.initialize());
app.use(passport.session());

// ---------- Routes ----------
app.get('/', (req, res) => res.send('Meal Mate Server is running'));
app.use('/api/users', authLimiter, userRouter);
app.use('/api/messgroups', generalLimiter, messGroupRouter);
app.use('/api/meals', generalLimiter, mealRouter);
app.use('/api/expenses', generalLimiter, expenseRouter);
app.use('/api/summary', generalLimiter, summaryRouter);
app.use('/api/stats', generalLimiter, statsRouter);

// ---------- Socket.IO (JWT-authenticated realtime updates) ----------
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});

// Handshake must carry a valid access token: client passes ?token=<accessToken>
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Authentication required'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.user.id;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    // Clients join a room per mess group; controllers emit `io.to(groupId).emit(...)`
    socket.on('join-group', (groupId) => {
        if (/^[0-9a-fA-F]{24}$/.test(String(groupId))) socket.join(`group:${groupId}`);
    });
    socket.on('leave-group', (groupId) => socket.leave(`group:${groupId}`));
});

// Make io available to controllers for realtime events
app.set('io', io);

// ---------- 404 ----------
app.use((req, res) => res.status(404).json({ msg: 'Route not found' }));

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Never leak internal error messages to the client (data leakage)
    res.status(err.status || 500).json({ msg: 'Server error' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
