import { User } from '../models/userModel.js';
import { ACCESS_COOKIE, verifyAccessToken } from '../services/sessionService.js';

/**
 * Requires a valid access token cookie. The user (and therefore the role) is always
 * reloaded from the database: a demoted or deleted account loses access immediately.
 */
export const VerifyToken = async (req, res, next) => {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: no token provided.' });
    }

    let payload;
    try {
        payload = verifyAccessToken(token, req.app.locals.config);
    } catch (err) {
        const message = err.name === 'TokenExpiredError' ? 'Unauthorized: token expired.' : 'Unauthorized: invalid token.';
        return res.status(401).json({ success: false, message });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.isVerified) {
        return res.status(401).json({ success: false, message: 'Unauthorized: invalid token.' });
    }

    req.user = user;
    return next();
};
