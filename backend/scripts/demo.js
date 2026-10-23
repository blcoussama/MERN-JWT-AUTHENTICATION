/**
 * Local demo without MongoDB nor SendGrid: an in-memory MongoDB (mongodb-memory-server),
 * random secrets and the console mail transport (codes and links are printed below).
 * A verified admin account is created with a random password printed at startup.
 * Usage: npm run dev:demo   (then: npm run dev --prefix frontend)
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();

process.env.NODE_ENV = 'development';
process.env.MONGO_URI = mongo.getUri('mern-jwt-auth-demo');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.REFRESH_SECRET = randomBytes(32).toString('hex');
process.env.MAIL_TRANSPORT = 'console';

await import('../index.js');

const { User } = await import('../models/userModel.js');
const adminPassword = `Demo-${randomBytes(6).toString('base64url')}1!`;
const hash = (p) => bcrypt.hash(p, 10);
const randomPassword = () => randomBytes(16).toString('hex');

await User.create([
    { username: 'Demo Admin', email: 'admin@example.com', password: await hash(adminPassword), role: 'admin', isVerified: true },
    { username: 'Alice Martin', email: 'alice@example.com', password: await hash(randomPassword()), isVerified: true, lastLogin: new Date() },
    { username: 'Karim Benali', email: 'karim@example.com', password: await hash(randomPassword()), isVerified: true },
    { username: 'Sara Idrissi', email: 'sara@example.com', password: await hash(randomPassword()), isVerified: false },
]);

console.log(`\n[demo] In-memory database ready (data is lost when the process stops).`);
console.log(`[demo] Admin account: admin@example.com / ${adminPassword}\n`);

const stop = async () => {
    await mongo.stop();
    process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
