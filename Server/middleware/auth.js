import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.user?.id || !/^[0-9a-fA-F]{24}$/.test(decoded.user.id)) {
            return res.status(401).json({ msg: 'Token is not valid' });
        }
        // Platform suspension check (cheap indexed lookup on every request)
        const suspended = await User.findById(decoded.user.id).select('suspended').lean();
        if (suspended?.suspended) return res.status(403).json({ msg: 'Account suspended' });
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default auth;