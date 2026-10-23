import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { User } from '../models/userModel.js';
import { buildApp, clearDb, createVerifiedUser, loginAgent, startDb, stopDb } from './helpers.js';

let ctx;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
    await clearDb();
    ctx = buildApp();
});

const promote = (email) => User.updateOne({ email }, { role: 'admin' }); // what `npm run admin:promote` does

describe('GET /api/users (admin only, checked on the server)', () => {
    it('401 without a session', async () => {
        await request(ctx.app).get('/api/users').expect(401);
    });

    it('403 for a client, even if the client tampers with its front-end state', async () => {
        const client = await createVerifiedUser(ctx, { email: 'client@example.com' });
        const { agent } = await loginAgent(ctx.app, client);
        const res = await agent.get('/api/users');
        expect(res.status).toBe(403);
        expect(res.body.users).toBeUndefined();
    });

    it('200 for an admin, without any password, hash or token field', async () => {
        const admin = await createVerifiedUser(ctx, { email: 'admin@example.com', username: 'Admin' });
        await createVerifiedUser(ctx, { email: 'client@example.com', username: 'Client' });
        await promote(admin.email);

        const { agent } = await loginAgent(ctx.app, admin);
        const res = await agent.get('/api/users').expect(200);

        expect(res.body.total).toBe(2);
        expect(res.body.users.map((u) => u.email).sort()).toEqual(['admin@example.com', 'client@example.com']);
        for (const user of res.body.users) {
            expect(Object.keys(user).sort()).toEqual(['createdAt', 'email', 'id', 'isVerified', 'lastLogin', 'role', 'username']);
        }
    });

    it('a demoted admin loses access immediately (the role is read from the database, not from the JWT)', async () => {
        const admin = await createVerifiedUser(ctx, { email: 'admin@example.com' });
        await promote(admin.email);
        const { agent } = await loginAgent(ctx.app, admin);
        await agent.get('/api/users').expect(200);

        await User.updateOne({ email: admin.email }, { role: 'client' });
        await agent.get('/api/users').expect(403);
    });

    it('a deleted account loses access with a still-valid access token', async () => {
        const client = await createVerifiedUser(ctx);
        const { agent } = await loginAgent(ctx.app, client);
        await User.deleteOne({ email: client.email });
        await agent.get('/api/auth/check-auth').expect(401);
    });
});
