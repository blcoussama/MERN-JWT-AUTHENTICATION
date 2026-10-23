import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RefreshToken } from '../models/refreshTokenModel.js';
import { User } from '../models/userModel.js';
import {
    buildApp,
    clearDb,
    createVerifiedUser,
    lastCode,
    loginAgent,
    parseCookies,
    signUp,
    startDb,
    stopDb,
    STRONG_PASSWORD,
    TEST_ENV,
} from './helpers.js';

let ctx;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
    await clearDb();
    ctx = buildApp();
});

const verify = (body) => request(ctx.app).post('/api/auth/verify-email').send(body);

describe('NoSQL injection on e-mail verification (critical)', () => {
    it('rejects {"code": {"$ne": null}} and leaves the pending account unverified', async () => {
        await signUp(ctx.app);

        const res = await verify({ email: 'alice@example.com', code: { $ne: null } });
        expect(res.status).toBe(400);

        // Without an e-mail at all (the original attack payload).
        expect((await verify({ code: { $ne: null } })).status).toBe(400);
        expect((await verify({ email: { $ne: null }, code: { $ne: null } })).status).toBe(400);

        const user = await User.findOne({ email: 'alice@example.com' });
        expect(user.isVerified).toBe(false);
    });

    it('rejects operator objects on login and forgot-password', async () => {
        await createVerifiedUser(ctx);
        const login = await request(ctx.app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
        expect(login.status).toBe(400);
        expect(login.headers['set-cookie']).toBeUndefined();

        const forgot = await request(ctx.app).post('/api/auth/forgot-password').send({ email: { $gt: '' } });
        expect(forgot.status).toBe(400);
        expect(ctx.mail.sent.filter((m) => m.type === 'password-reset')).toHaveLength(0);
    });

    it('mongoose sanitizeFilter neutralises operators even if validation were bypassed', async () => {
        await signUp(ctx.app);
        // Direct model call with an attacker-controlled object: it is wrapped in $eq, so it is never
        // executed as an operator (here the cast to string fails and the query is refused).
        await expect(User.findOne({ verificationCodeHash: { $ne: null } })).rejects.toThrow(/Cast to string failed/);
        expect(await User.findOne({ email: { $ne: null } }).catch(() => null)).toBeNull();
    });
});

describe('the verification code is bound to its e-mail, expires and cannot be brute-forced', () => {
    it("Bob cannot verify Alice's account with his own code (and vice versa)", async () => {
        await signUp(ctx.app, { email: 'alice@example.com' });
        await signUp(ctx.app, { email: 'bob@example.com', username: 'Bob' });
        const aliceCode = lastCode(ctx.mail, 'alice@example.com');
        const bobCode = lastCode(ctx.mail, 'bob@example.com');

        if (aliceCode !== bobCode) {
            expect((await verify({ email: 'alice@example.com', code: bobCode })).status).toBe(400);
        }
        expect((await verify({ email: 'bob@example.com', code: bobCode })).status).toBe(200);
        expect((await User.findOne({ email: 'alice@example.com' })).isVerified).toBe(false);
    });

    it('locks the code after 5 wrong attempts, even if the 6th guess is right', async () => {
        ctx = buildApp({ configure: (c) => (c.rateLimit.sensitive = 100) });
        await signUp(ctx.app);
        const code = lastCode(ctx.mail, 'alice@example.com');
        const wrong = code === '000000' ? '111111' : '000000';

        for (let i = 0; i < 5; i += 1) {
            expect((await verify({ email: 'alice@example.com', code: wrong })).status).toBe(400);
        }
        expect((await verify({ email: 'alice@example.com', code })).status).toBe(400);
        expect((await User.findOne({ email: 'alice@example.com' })).isVerified).toBe(false);
    });

    it('counts parallel guesses atomically (no more than 5 guesses per code)', async () => {
        ctx = buildApp({ configure: (c) => (c.rateLimit.sensitive = 100) });
        await signUp(ctx.app);
        const code = lastCode(ctx.mail, 'alice@example.com');
        const guesses = Array.from({ length: 20 }, (_, i) => String((Number(code) + 1 + i) % 1_000_000).padStart(6, '0'));

        await Promise.all(guesses.map((g) => verify({ email: 'alice@example.com', code: g })));
        const user = await User.findOne({ email: 'alice@example.com' }).select('+verificationAttempts');
        expect(user.verificationAttempts).toBe(5);
        expect((await verify({ email: 'alice@example.com', code })).status).toBe(400);
    });

    it('rejects an expired code', async () => {
        await signUp(ctx.app);
        const code = lastCode(ctx.mail, 'alice@example.com');
        await User.updateOne({ email: 'alice@example.com' }, { verificationCodeExpiresAt: new Date(Date.now() - 1000) });

        expect((await verify({ email: 'alice@example.com', code })).status).toBe(400);
    });

    it('stores only an HMAC of the code, never the code itself', async () => {
        await signUp(ctx.app);
        const code = lastCode(ctx.mail, 'alice@example.com');
        const raw = await mongoose.connection.db.collection('users').findOne({ email: 'alice@example.com' });

        expect(raw.verificationCodeHash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(raw)).not.toContain(code);
    });
});

describe('role escalation at sign-up (high)', () => {
    it('refuses a client-chosen "admin" role and creates nothing', async () => {
        const res = await request(ctx.app)
            .post('/api/auth/signup')
            .send({ email: 'mallory@example.com', username: 'Mallory', password: STRONG_PASSWORD, role: 'admin' });

        expect(res.status).toBe(400);
        expect(await User.countDocuments()).toBe(0);
    });

    it('a normal sign-up is always a "client"', async () => {
        await createVerifiedUser(ctx, { email: 'mallory@example.com' });
        expect((await User.findOne({ email: 'mallory@example.com' })).role).toBe('client');
    });
});

describe('no secret in JSON responses (high / medium)', () => {
    it('sign-up, verification, login and check-auth never return a token, code or hash', async () => {
        const signup = await signUp(ctx.app);
        const code = lastCode(ctx.mail, 'alice@example.com');
        const verification = await verify({ email: 'alice@example.com', code });
        const { agent, res: login } = await loginAgent(ctx.app, { email: 'alice@example.com', password: STRONG_PASSWORD });
        const checkAuth = await agent.get('/api/auth/check-auth');
        const cookies = parseCookies(login);

        for (const res of [signup, verification, login, checkAuth]) {
            const body = JSON.stringify(res.body);
            expect(body).not.toContain(code);
            expect(body).not.toMatch(/token|password|hash|\$2[aby]\$/i);
            expect(body).not.toContain(cookies.AccessToken.value);
            expect(body).not.toContain(cookies.RefreshToken.value);
        }
    });

    it('forgot-password stores only a hash of the reset token', async () => {
        const creds = await createVerifiedUser(ctx);
        const res = await request(ctx.app).post('/api/auth/forgot-password').send({ email: creds.email });
        const { token } = ctx.mail.last(creds.email, 'password-reset').data;
        const raw = await mongoose.connection.db.collection('users').findOne({ email: creds.email });

        expect(JSON.stringify(res.body)).not.toContain(token);
        expect(raw.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(raw)).not.toContain(token);
    });
});

describe('refresh token rotation and replay detection (medium)', () => {
    it('rotates the refresh token on every use and revokes the family when an old one is replayed', async () => {
        const creds = await createVerifiedUser(ctx);
        const { res: login } = await loginAgent(ctx.app, creds);
        const r1 = parseCookies(login).RefreshToken.value;

        const refresh = (token) => request(ctx.app).post('/api/auth/refresh-token').set('Cookie', `RefreshToken=${token}`);

        const first = await refresh(r1);
        expect(first.status).toBe(200);
        const r2 = parseCookies(first).RefreshToken.value;
        expect(r2).not.toBe(r1);

        const second = await refresh(r2);
        expect(second.status).toBe(200);
        const r3 = parseCookies(second).RefreshToken.value;

        // An attacker replays the stolen r1: rejected and the whole session family is revoked...
        const replay = await refresh(r1);
        expect(replay.status).toBe(401);
        expect(replay.body.message).toMatch(/reuse/i);
        // ...including the legitimate latest token.
        expect((await refresh(r3)).status).toBe(401);
    });

    it('replay revokes only the compromised login, not the other devices', async () => {
        const creds = await createVerifiedUser(ctx);
        const laptop = parseCookies((await loginAgent(ctx.app, creds)).res).RefreshToken.value;
        const phone = parseCookies((await loginAgent(ctx.app, creds)).res).RefreshToken.value;
        const refresh = (token) => request(ctx.app).post('/api/auth/refresh-token').set('Cookie', `RefreshToken=${token}`);

        await refresh(laptop).expect(200);
        await refresh(laptop).expect(401); // replay
        await refresh(phone).expect(200);
    });

    it('stores refresh tokens hashed, never in clear', async () => {
        const creds = await createVerifiedUser(ctx);
        const { res } = await loginAgent(ctx.app, creds);
        const token = parseCookies(res).RefreshToken.value;

        const records = await RefreshToken.find().lean();
        expect(records).toHaveLength(1);
        expect(records[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(records)).not.toContain(token);
        const rawUser = await mongoose.connection.db.collection('users').findOne({ email: creds.email });
        expect(JSON.stringify(rawUser)).not.toContain(token);
    });

    it('does not accept the refresh token from the request body', async () => {
        const creds = await createVerifiedUser(ctx);
        const token = parseCookies((await loginAgent(ctx.app, creds)).res).RefreshToken.value;
        await request(ctx.app).post('/api/auth/refresh-token').send({ RefreshToken: token }).expect(401);
    });
});

describe('forged or tampered access tokens', () => {
    it('rejects a token signed with another secret, an "alg: none" token and a refresh token used as access token', async () => {
        const creds = await createVerifiedUser(ctx);
        const { res } = await loginAgent(ctx.app, creds);
        const userId = (await User.findOne({ email: creds.email }))._id.toString();

        const forged = jwt.sign({ sub: userId }, 'not-the-server-secret-0123456789abcdef');
        const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
            JSON.stringify({ sub: userId }),
        ).toString('base64url')}.`;
        const refreshAsAccess = parseCookies(res).RefreshToken.value;

        for (const token of [forged, none, refreshAsAccess]) {
            await request(ctx.app).get('/api/auth/check-auth').set('Cookie', `AccessToken=${token}`).expect(401);
        }
        // Sanity check: a correctly signed token is accepted.
        const valid = jwt.sign({ sub: userId }, TEST_ENV.JWT_SECRET, { expiresIn: 60 });
        await request(ctx.app).get('/api/auth/check-auth').set('Cookie', `AccessToken=${valid}`).expect(200);
    });
});

describe('rate limiting', () => {
    it('blocks brute force on login after 10 failed attempts', async () => {
        const creds = await createVerifiedUser(ctx);
        const statuses = [];
        for (let i = 0; i < 11; i += 1) {
            const res = await request(ctx.app).post('/api/auth/login').send({ email: creds.email, password: `Wrong!${i}A` });
            statuses.push(res.status);
        }
        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
        expect(statuses[10]).toBe(429);

        // Even the right password is refused while the limit applies.
        const res = await request(ctx.app).post('/api/auth/login').send(creds);
        expect(res.status).toBe(429);
    });

    it('limits brute force on the verification code endpoint', async () => {
        await signUp(ctx.app);
        const statuses = [];
        for (let i = 0; i < 11; i += 1) {
            statuses.push((await verify({ email: 'alice@example.com', code: String(i).padStart(6, '0') })).status);
        }
        expect(statuses[10]).toBe(429);
    });

    it('limits the routes that send e-mails', async () => {
        const statuses = [];
        for (let i = 0; i < 6; i += 1) {
            statuses.push((await request(ctx.app).post('/api/auth/forgot-password').send({ email: 'x@example.com' })).status);
        }
        expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    });
});

describe('account enumeration (low)', () => {
    it('forgot-password answers the same for known and unknown addresses', async () => {
        const creds = await createVerifiedUser(ctx);
        const known = await request(ctx.app).post('/api/auth/forgot-password').send({ email: creds.email });
        const unknown = await request(ctx.app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });

        expect(known.status).toBe(unknown.status);
        expect(known.body).toEqual(unknown.body);
    });

    it('sign-up with an existing address answers like a new sign-up and warns the real owner', async () => {
        const creds = await createVerifiedUser(ctx);
        const existing = await signUp(ctx.app, { email: creds.email, password: 'Diff3rent!Pass' });
        const fresh = await signUp(ctx.app, { email: 'new@example.com' });

        expect(existing.status).toBe(fresh.status);
        expect(existing.body).toEqual(fresh.body);
        expect(ctx.mail.last(creds.email, 'account-exists')).toBeDefined();
        expect(await User.countDocuments({ email: creds.email })).toBe(1);
        // The existing password is untouched.
        expect((await loginAgent(ctx.app, creds)).res.status).toBe(200);
    });

    it('login gives the same answer for an unknown e-mail and a wrong password, and only reveals "not verified" with the right password', async () => {
        await createVerifiedUser(ctx);
        await signUp(ctx.app, { email: 'pending@example.com' });

        const unknown = await request(ctx.app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wr0ng!pass' });
        const wrong = await request(ctx.app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'Wr0ng!pass' });
        const pendingWrong = await request(ctx.app).post('/api/auth/login').send({ email: 'pending@example.com', password: 'Wr0ng!pass' });
        const pendingRight = await request(ctx.app).post('/api/auth/login').send({ email: 'pending@example.com', password: STRONG_PASSWORD });

        expect(unknown.status).toBe(401);
        expect(wrong.body).toEqual(unknown.body);
        expect(pendingWrong.body).toEqual(unknown.body);
        expect(pendingRight.status).toBe(403);
        expect(pendingRight.body.code).toBe('EMAIL_NOT_VERIFIED');
        expect(pendingRight.headers['set-cookie']).toBeUndefined();
    });

    it('verification answers the same for an unknown, already verified or pending address', async () => {
        await createVerifiedUser(ctx);
        await signUp(ctx.app, { email: 'pending@example.com' });
        const bodies = await Promise.all(
            ['nobody@example.com', 'alice@example.com', 'pending@example.com'].map(async (email) => {
                const code = lastCode(ctx.mail, email) === '123456' ? '654321' : '123456';
                return (await verify({ email, code })).body;
            }),
        );
        expect(bodies[0]).toEqual(bodies[1]);
        expect(bodies[1]).toEqual(bodies[2]);
    });
});

describe('HTTP hardening', () => {
    it('sends the helmet security headers and no x-powered-by', async () => {
        const res = await request(ctx.app).get('/api/auth/check-auth');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['content-security-policy']).toContain("default-src 'self'");
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('answers malformed JSON with a clean 400 (no stack trace)', async () => {
        const res = await request(ctx.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ success: false, message: 'Malformed JSON body.' });
    });

    it('returns a JSON 404 for unknown API routes (the old /api/users/*-dashboard routes are gone)', async () => {
        await request(ctx.app).get('/api/users/admin-dashboard').expect(404);
        await request(ctx.app).get('/api/nope').expect(404);
    });
});
