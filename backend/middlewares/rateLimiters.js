import { rateLimit } from 'express-rate-limit';

const tooMany = (req, res) =>
    res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });

/**
 * Builds a fresh set of limiters (in-memory store, per process).
 * Behind a reverse proxy, set TRUST_PROXY so that the client IP is used, not the proxy's.
 */
export const createRateLimiters = ({ windowMs, general, sensitive, email }) => {
    const common = { windowMs, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany };
    return {
        general: rateLimit({ ...common, limit: general }),
        sensitive: rateLimit({ ...common, limit: sensitive }),
        // Failed logins only: a user who types the right password is not slowed down.
        login: rateLimit({ ...common, limit: sensitive, skipSuccessfulRequests: true }),
        email: rateLimit({ ...common, limit: email }),
    };
};
