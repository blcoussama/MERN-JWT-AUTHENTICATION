import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { loadConfig } from '../config/env.js';
import { createMailer } from '../mails/emails.js';
import { createMemoryTransport } from '../mails/transports.js';

export const TEST_ENV = {
    NODE_ENV: 'test',
    MONGO_URI: 'mongodb://set-by-mongodb-memory-server',
    JWT_SECRET: 'test-access-secret-0123456789abcdef0123456789',
    REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef012345678',
    CLIENT_URL: 'http://localhost:5173',
    MAIL_TRANSPORT: 'console',
};

export const STRONG_PASSWORD = 'Str0ng!Passw0rd';

let mongo;

export const startDb = async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri('mern-jwt-auth-test'));
    await mongoose.connection.syncIndexes();
};

export const stopDb = async () => {
    await mongoose.disconnect();
    await mongo?.stop();
};

export const clearDb = async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
};

/** A fresh app (fresh rate-limit counters) wired to an in-memory mail transport. */
export const buildApp = ({ env = {}, configure } = {}) => {
    const config = loadConfig({ ...TEST_ENV, ...env });
    configure?.(config);
    const mail = createMemoryTransport();
    const mailer = createMailer(mail, { from: config.mail.from, fromName: config.mail.fromName, clientUrl: config.clientUrl });
    return { app: createApp({ config, mailer }), config, mail };
};

/** Parses the Set-Cookie headers of a response into { name: { value, attributes } }. */
export const parseCookies = (res) => {
    const cookies = {};
    for (const header of res.headers['set-cookie'] ?? []) {
        const [pair, ...attrs] = header.split(';').map((s) => s.trim());
        const index = pair.indexOf('=');
        cookies[pair.slice(0, index)] = {
            value: decodeURIComponent(pair.slice(index + 1)),
            attributes: attrs.map((a) => a.toLowerCase()),
        };
    }
    return cookies;
};

export const lastCode = (mail, email) => mail.last(email, 'verification-code')?.data.code;

export const signUp = (app, { email = 'alice@example.com', username = 'Alice', password = STRONG_PASSWORD } = {}) =>
    request(app).post('/api/auth/signup').send({ email, username, password });

/** Creates a verified account through the public API. */
export const createVerifiedUser = async (ctx, user = {}) => {
    const email = user.email ?? 'alice@example.com';
    const res = await signUp(ctx.app, { ...user, email });
    if (res.status !== 201) throw new Error(`sign-up failed: ${res.status} ${res.text}`);
    const verify = await request(ctx.app).post('/api/auth/verify-email').send({ email, code: lastCode(ctx.mail, email) });
    if (verify.status !== 200) throw new Error(`verification failed: ${verify.status} ${verify.text}`);
    return { email, password: user.password ?? STRONG_PASSWORD };
};

/** Logs in with a supertest agent (keeps the cookies) and returns { agent, res }. */
export const loginAgent = async (app, { email, password }) => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email, password });
    return { agent, res };
};
