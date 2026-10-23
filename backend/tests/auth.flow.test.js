import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
} from './helpers.js';

let ctx;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
    await clearDb();
    ctx = buildApp();
});

describe('sign-up and e-mail verification', () => {
    it('creates a pending "client" account and e-mails a 6-digit code', async () => {
        const res = await signUp(ctx.app);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ success: true, message: expect.any(String) });

        const user = await User.findOne({ email: 'alice@example.com' });
        expect(user.role).toBe('client');
        expect(user.isVerified).toBe(false);
        expect(lastCode(ctx.mail, 'alice@example.com')).toMatch(/^\d{6}$/);
    });

    it('verifies the e-mail with the right code, then the user logs in', async () => {
        await signUp(ctx.app);
        const code = lastCode(ctx.mail, 'alice@example.com');

        const verify = await request(ctx.app).post('/api/auth/verify-email').send({ email: 'alice@example.com', code });
        expect(verify.status).toBe(200);
        expect(verify.headers['set-cookie']).toBeUndefined(); // the code does not open a session
        expect(ctx.mail.last('alice@example.com', 'welcome')).toBeDefined();

        const { res } = await loginAgent(ctx.app, { email: 'alice@example.com', password: STRONG_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ email: 'alice@example.com', role: 'client', isVerified: true });
    });

    it('normalises the e-mail address (case and spaces)', async () => {
        await signUp(ctx.app, { email: '  Alice@Example.COM ' });
        const code = lastCode(ctx.mail, 'alice@example.com');
        expect(code).toBeDefined();

        await request(ctx.app).post('/api/auth/verify-email').send({ email: 'ALICE@example.com', code }).expect(200);
        const { res } = await loginAgent(ctx.app, { email: 'alice@EXAMPLE.com', password: STRONG_PASSWORD });
        expect(res.status).toBe(200);
    });

    it('refuses a weak password on the server side', async () => {
        ctx = buildApp({ configure: (c) => (c.rateLimit.email = 100) });
        const weak = ['Sh0rt!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigits!!', 'NoSpecial123', `A1!${'a'.repeat(70)}`];
        for (const password of weak) {
            const res = await signUp(ctx.app, { password });
            expect(res.status, password).toBe(400);
        }
        expect(await User.countDocuments()).toBe(0);
    });

    it('resends a new code (at most once a minute) and only the latest code is valid', async () => {
        ctx = buildApp({ configure: (c) => (c.verification.resendCooldownMs = 0) });
        await signUp(ctx.app);
        const first = lastCode(ctx.mail, 'alice@example.com');

        await request(ctx.app).post('/api/auth/resend-verification').send({ email: 'alice@example.com' }).expect(200);
        const second = lastCode(ctx.mail, 'alice@example.com');

        expect(ctx.mail.sent.filter((m) => m.type === 'verification-code')).toHaveLength(2);
        if (first !== second) {
            // (1 chance in a million that both random codes are equal)
            await request(ctx.app).post('/api/auth/verify-email').send({ email: 'alice@example.com', code: first }).expect(400);
        }
        await request(ctx.app).post('/api/auth/verify-email').send({ email: 'alice@example.com', code: second }).expect(200);
    });

    it('applies the resend cooldown', async () => {
        await signUp(ctx.app);
        ctx.mail.clear();
        await request(ctx.app).post('/api/auth/resend-verification').send({ email: 'alice@example.com' }).expect(200);
        expect(ctx.mail.sent).toHaveLength(0);
    });
});

describe('login, session and logout', () => {
    it('sets httpOnly, SameSite=Strict cookies and updates lastLogin', async () => {
        const creds = await createVerifiedUser(ctx);
        const before = Date.now();
        const { res } = await loginAgent(ctx.app, creds);

        const cookies = parseCookies(res);
        expect(cookies.AccessToken.attributes).toEqual(expect.arrayContaining(['httponly', 'samesite=strict', 'path=/']));
        expect(cookies.RefreshToken.attributes).toEqual(
            expect.arrayContaining(['httponly', 'samesite=strict', 'path=/api/auth']),
        );
        expect(cookies.AccessToken.attributes).not.toContain('secure'); // HTTP in tests/dev

        const user = await User.findOne({ email: creds.email });
        expect(user.lastLogin.getTime()).toBeGreaterThanOrEqual(before - 1000);
        expect(new Date(res.body.user.lastLogin).getTime()).toBe(user.lastLogin.getTime());
    });

    it('marks the cookies Secure in production', async () => {
        ctx = buildApp({ env: { NODE_ENV: 'production', MAIL_TRANSPORT: 'sendgrid', SENDGRID_API_KEY: 'SG.fake', EMAIL_FROM: 'no-reply@example.com' } });
        const creds = await createVerifiedUser(ctx);
        const { res } = await loginAgent(ctx.app, creds);
        const cookies = parseCookies(res);
        expect(cookies.AccessToken.attributes).toContain('secure');
        expect(cookies.RefreshToken.attributes).toContain('secure');
    });

    it('returns the current user on /check-auth', async () => {
        const creds = await createVerifiedUser(ctx);
        const { agent } = await loginAgent(ctx.app, creds);

        const res = await agent.get('/api/auth/check-auth').expect(200);
        expect(res.body.user).toEqual({
            id: expect.any(String),
            username: 'Alice',
            email: creds.email,
            role: 'client',
            isVerified: true,
            lastLogin: expect.any(String),
            createdAt: expect.any(String),
        });
    });

    it('refreshes the session with the refresh cookie', async () => {
        const creds = await createVerifiedUser(ctx);
        const { agent } = await loginAgent(ctx.app, creds);

        const res = await agent.post('/api/auth/refresh-token').expect(200);
        const cookies = parseCookies(res);
        expect(cookies.AccessToken.value).toBeTruthy();
        expect(cookies.RefreshToken.value).toBeTruthy();
        await agent.get('/api/auth/check-auth').expect(200);
    });

    it('logout revokes the refresh token server-side', async () => {
        const creds = await createVerifiedUser(ctx);
        const { agent, res } = await loginAgent(ctx.app, creds);
        const refresh = parseCookies(res).RefreshToken.value;

        await agent.post('/api/auth/logout').expect(200);
        await request(ctx.app).post('/api/auth/refresh-token').set('Cookie', `RefreshToken=${refresh}`).expect(401);
    });
});

describe('password reset', () => {
    it('resets the password with the e-mailed link, once, and logs every device out', async () => {
        const creds = await createVerifiedUser(ctx);
        const { res: loginRes } = await loginAgent(ctx.app, creds);
        const oldRefresh = parseCookies(loginRes).RefreshToken.value;

        await request(ctx.app).post('/api/auth/forgot-password').send({ email: creds.email }).expect(200);
        const { token, resetUrl } = ctx.mail.last(creds.email, 'password-reset').data;
        expect(resetUrl).toBe(`http://localhost:5173/reset-password/${token}`);

        const newPassword = 'An0ther!Passw0rd';
        await request(ctx.app).post(`/api/auth/reset-password/${token}`).send({ password: newPassword }).expect(200);

        // The link only works once.
        await request(ctx.app).post(`/api/auth/reset-password/${token}`).send({ password: newPassword }).expect(400);
        // Old sessions are revoked, the old password no longer works, the new one does.
        await request(ctx.app).post('/api/auth/refresh-token').set('Cookie', `RefreshToken=${oldRefresh}`).expect(401);
        expect((await loginAgent(ctx.app, creds)).res.status).toBe(401);
        expect((await loginAgent(ctx.app, { email: creds.email, password: newPassword })).res.status).toBe(200);
    });

    it('rejects an expired reset link', async () => {
        const creds = await createVerifiedUser(ctx);
        await request(ctx.app).post('/api/auth/forgot-password').send({ email: creds.email }).expect(200);
        const { token } = ctx.mail.last(creds.email, 'password-reset').data;
        await User.updateOne({ email: creds.email }, { resetPasswordExpiresAt: new Date(Date.now() - 1000) });

        await request(ctx.app).post(`/api/auth/reset-password/${token}`).send({ password: 'An0ther!Passw0rd' }).expect(400);
    });
});
