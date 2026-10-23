import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { RefreshToken } from '../models/refreshTokenModel.js';
import { sha256 } from '../utils/tokens.js';

export const ACCESS_COOKIE = 'AccessToken';
export const REFRESH_COOKIE = 'RefreshToken';
const REFRESH_COOKIE_PATH = '/api/auth'; // the refresh token is only sent to the auth routes

const JWT_ALGORITHM = 'HS256';

const baseCookieOptions = (config) => ({
    httpOnly: true, // not readable from JavaScript (XSS)
    secure: config.cookies.secure, // HTTPS only in production
    sameSite: 'strict', // never sent on cross-site requests (CSRF)
});

export const signAccessToken = (user, config) =>
    jwt.sign({ sub: user._id.toString() }, config.jwt.accessSecret, {
        algorithm: JWT_ALGORITHM,
        expiresIn: config.jwt.accessTtlSeconds,
    });

export const verifyAccessToken = (token, config) =>
    jwt.verify(token, config.jwt.accessSecret, { algorithms: [JWT_ALGORITHM] });

const verifyRefreshJwt = (token, config, options = {}) =>
    jwt.verify(token, config.jwt.refreshSecret, { algorithms: [JWT_ALGORITHM], ...options });

const setAuthCookies = (res, config, accessToken, refreshToken) => {
    res.cookie(ACCESS_COOKIE, accessToken, {
        ...baseCookieOptions(config),
        path: '/',
        maxAge: config.jwt.accessTtlSeconds * 1000,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...baseCookieOptions(config),
        path: REFRESH_COOKIE_PATH,
        maxAge: config.jwt.refreshTtlSeconds * 1000,
    });
};

export const clearAuthCookies = (res, config) => {
    res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(config), path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(config), path: REFRESH_COOKIE_PATH });
};

/** Issues an access token + a refresh token (new family unless one is given) and sets both cookies. */
export const issueSession = async (res, user, config, family = randomUUID()) => {
    const refreshToken = jwt.sign({ sub: user._id.toString(), fam: family }, config.jwt.refreshSecret, {
        algorithm: JWT_ALGORITHM,
        expiresIn: config.jwt.refreshTtlSeconds,
        jwtid: randomUUID(), // makes every token unique, even within the same second
    });

    // Only the hash is stored: a database leak does not leak usable refresh tokens.
    await RefreshToken.create({
        user: user._id,
        family,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000),
    });

    setAuthCookies(res, config, signAccessToken(user, config), refreshToken);
};

export const revokeFamily = (family) =>
    RefreshToken.updateMany({ family, revokedAt: null }, { revokedAt: new Date() });

export const revokeAllSessions = (userId) =>
    RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });

/**
 * Consumes a refresh token (one-time use).
 * @returns {{ status: 'ok', record } | { status: 'invalid' } | { status: 'reuse' }}
 */
export const consumeRefreshToken = async (token, config) => {
    let payload;
    try {
        payload = verifyRefreshJwt(token, config);
    } catch {
        return { status: 'invalid' };
    }

    const tokenHash = sha256(token);
    // Atomically mark the token as used: two concurrent requests cannot both succeed.
    const record = await RefreshToken.findOneAndUpdate(
        { tokenHash, usedAt: null, revokedAt: null },
        { usedAt: new Date() },
        { returnDocument: 'after' },
    );
    if (record) return { status: 'ok', record };

    const known = await RefreshToken.findOne({ tokenHash });
    if (known) {
        // Already used or revoked: the token was replayed -> kill the whole session family.
        await revokeFamily(known.family);
        return { status: 'reuse' };
    }
    if (payload?.fam) await revokeFamily(payload.fam); // signed by us but unknown: be conservative
    return { status: 'invalid' };
};

/** Revokes the session family of the given refresh token (logout). Expired tokens are accepted here. */
export const revokeRefreshToken = async (token, config) => {
    try {
        const payload = verifyRefreshJwt(token, config, { ignoreExpiration: true });
        if (typeof payload.fam === 'string') await revokeFamily(payload.fam);
    } catch {
        // Invalid token: nothing to revoke.
    }
};
