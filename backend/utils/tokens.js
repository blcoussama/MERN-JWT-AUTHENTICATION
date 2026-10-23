import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** 6-digit code drawn from a CSPRNG (000000-999999). */
export const generateVerificationCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Keyed hash of a short code: a leaked database does not allow an offline brute force. */
export const hashCode = (code, key) => createHmac('sha256', key).update(code).digest('hex');

/** High-entropy random token (password reset links). */
export const generateRandomToken = () => randomBytes(32).toString('hex');

/** SHA-256 is enough for high-entropy tokens (reset links, refresh tokens). */
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const safeEqualHex = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
};
