import User from './models/User.js';
import Membership from './models/Membership.js';
import MessGroup from './models/MessGroup.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import passport from 'passport';
import connectDB from './config/db.js';
import MongoSessionStore from './config/mongoSessionStore.js';
import './config/passportJs.js';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import csrfProtection from './middleware/csrf.js';
import userRouter from './routes/userRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import messGroupRouter from './routes/messGroupRoutes.js';
import mealRouter from './routes/mealRoutes.js';
import expenseRouter from './routes/expenseRoutes.js';
import summaryRouter from './routes/summaryRoutes.js';
import statsRouter from './routes/statsRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import periodRoutes from './routes/periodRoutes.js';
import moneyRoutes from './routes/moneyRoutes.js';
import statementRoutes from './routes/statementRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import attachmentRoutes from './routes/attachmentRoutes.js';
import depositAssetRoutes from './routes/depositAssetRoutes.js';
import inboxRoutes from './routes/inboxRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import supportAdminRoutes from './routes/supportAdminRoutes.js';
import routinesRoutes from './routes/routinesRoutes.js';
import totpRoutes from './routes/totpRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import shoppingListRoutes from './routes/shoppingListRoutes.js';
import kitchenInventoryRoutes from './routes/kitchenInventoryRoutes.js';
import pollRoutes from './routes/pollRoutes.js';
import { startOutboxWorker } from './services/outboxWorker.js';
import { startScheduler } from './services/schedulerService.js';
import { setSocketIo } from './services/inboxService.js';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import session from 'express-session';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // needed for express-rate-limit behind proxies (Render/Heroku/Vercel)

// ---------- Security headers ---------- (B3.4)
const isProd = process.env.NODE_ENV === 'production';
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
                connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5174'],
                frameAncestors: ["'none'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
            },
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        permissionsPolicy: {
            camera: [],
            microphone: [],
            geolocation: [],
        },
        ...(isProd
            ? {
                  strictTransportSecurity: {
                      maxAge: 31536000,
                      includeSubDomains: true,
                      preload: true,
                  },
              }
            : {}),
    })
);

// no-store on authenticated JSON responses (B3 quick win)
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        if (req.user || req.headers.cookie) {
            res.setHeader('Cache-Control', 'no-store');
        }
        return originalJson.call(this, body);
    };
    next();
});

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
app.use('/api/notifications/whatsapp/webhook', express.json({
    limit: '10kb',
    verify: (req, res, buffer) => { req.rawBody = buffer; },
}));
app.use(express.json({ limit: '10kb' })); // reject oversized payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// NoSQL injection sanitization is done in Server/validation/validate.js
// (express-mongo-sanitize middleware reassigns req.query, which Express 5 forbids)
app.use(hpp()); // HTTP parameter pollution defense
app.use(csrfProtection); // CSRF protection for cookie-authenticated mutations

// ---------- Session (only used for the Google OAuth handshake) ----------
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: new MongoSessionStore(), // off MemoryStore → MongoDB (multi-instance safe)
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
app.use('/api/users', authLimiter, totpRoutes, userRouter);
// Platform admin control plane — hidden (guard replies 404 to non-admins), unlinked
app.use('/api/admin', adminRouter);
app.use('/api/messgroups', generalLimiter, messGroupRouter);
app.use('/api/meals', generalLimiter, mealRouter);
app.use('/api/expenses', generalLimiter, expenseRouter);
app.use('/api/summary', generalLimiter, summaryRouter);
app.use('/api/stats', generalLimiter, statsRouter);
app.use('/api/memberships', generalLimiter, membershipRoutes);
app.use('/api/policies', generalLimiter, policyRoutes);
app.use('/api/periods', generalLimiter, periodRoutes);
app.use('/api/money', generalLimiter, moneyRoutes);
app.use('/api/statements', generalLimiter, statementRoutes);
app.use('/api/recurring', generalLimiter, recurringRoutes);
app.use('/api/reconciliation', generalLimiter, reconciliationRoutes);
app.use('/api/disputes', generalLimiter, disputeRoutes);
app.use('/api/notifications', generalLimiter, notificationRoutes);
app.use('/api/sessions', generalLimiter, sessionRoutes);
app.use('/api/attachments', generalLimiter, attachmentRoutes);
app.use('/api/assets', generalLimiter, depositAssetRoutes);
app.use('/api/inbox', generalLimiter, inboxRoutes);
app.use('/api/support', generalLimiter, supportRoutes);
app.use('/api/admin/support', supportAdminRoutes);
app.use('/api/routines', generalLimiter, routinesRoutes);
app.use('/api/shopping-list', generalLimiter, shoppingListRoutes);
app.use('/api/kitchen-inventory', generalLimiter, kitchenInventoryRoutes);
app.use('/api/polls', generalLimiter, pollRoutes);
app.use('/api/invite', generalLimiter, inviteRoutes);

// ---------- Socket.IO (JWT-authenticated realtime updates) ----------
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});

// Handshake: read access token from mm_at cookie (withCredentials), not query string.
// Query-string tokens are rejected (security quick win — token never in URL).
io.use(async (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie || '';
        const match = cookieHeader.match(/(?:^|;\s*)mm_at=([^;]*)/);
        const token = match ? decodeURIComponent(match[1]) : null;
        if (!token) return next(new Error('Authentication required'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!await User.exists({ _id: decoded.user.id, suspended: { $ne: true } })) return next(new Error('Invalid account'));
        socket.userId = decoded.user.id;
        socket.expiresAt = decoded.exp * 1000;
        socket.join(`user:${socket.userId}`); // per-user inbox room (B0.1)
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    // Clients join a room per mess group; controllers emit `io.to(groupId).emit(...)`
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.expiresAt - Date.now()));
    socket.on('disconnect', () => clearTimeout(expiry));
    socket.on('join-group', async (groupId) => {
        if (typeof groupId !== 'string' || !/^[a-f\d]{24}$/i.test(groupId)) return;
        try {
            const now = new Date();
            const active = await Membership.exists({ groupId, user: socket.userId, startDate: { $lte: now },
                $or: [{ endDate: null }, { endDate: { $gt: now } }] });
            if (active || await MessGroup.exists({ _id: groupId, admin: socket.userId })) {
                await socket.join('group:' + groupId);
            }
        } catch {
            socket.disconnect(true);
        }
    });
    socket.on('leave-group', (groupId) => socket.leave(`group:${groupId}`));
});

// Make io available to controllers for realtime events
app.set('io', io);
// Wire io into the inbox service so notify() emits `inbox-new` to user rooms
setSocketIo(io);

// ---------- 404 ----------
app.use((req, res) => res.status(404).json({ msg: 'Route not found' }));

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Never leak internal error messages to the client (data leakage)
    res.status(err.status || 500).json({ msg: 'Server error' });
});

// Export the raw Express app for supertest integration tests (index.js itself
// still boots the full HTTP server when run as the entry point).
export { app, httpServer };

// Real server boot only when run directly (`node index.js` / nodemon) —
// importing index.js from tests must not bind a port or start workers.
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('index.js');
if (isMain) {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Background delivery worker (notification outbox → email/WhatsApp)
    startOutboxWorker();

    // Background scheduler (recurring rule draft generation & deadline reminders)
    startScheduler();
}
