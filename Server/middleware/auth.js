import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getCookie } from '../utils/tokens.js';

// Cookie name for the access token (Doc §15 / §19.1)
const ACCESS_COOKIE = 'mm_at';

const getToken = (req) => {
    // 1) HttpOnly cookie (browser clients) — manual parse, no cookie-parser dep
    const cookieToken = getCookie(req, ACCESS_COOKIE);
    if (cookieToken) return cookieToken;
    // 2) x-auth-token header (non-browser / legacy clients)
    const headerToken = req.header('x-auth-token');
    if (headerToken) return headerToken;
    // 3) Authorization: Bearer header
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return null;
};

const auth = async (req, res, next) => {
    const token = getToken(req);
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.user?.id || !/^[0-9a-fA-F]{24}$/.test(decoded.user.id)) {
            return res.status(401).json({ msg: 'Token is not valid' });
        }
        // Platform suspension check (cheap indexed lookup on every request)
        const suspended = await User.findById(decoded.user.id).select('suspended').lean();
        if (!suspended) return res.status(401).json({ msg: 'Account unavailable' });
        if (suspended.suspended) return res.status(403).json({ msg: 'Account suspended' });
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default auth;

// Expose cookie name so controllers can set/clear it when X-Client: web
export { ACCESS_COOKIE };

