/**
 * Grants the "admin" role to an existing, verified account.
 * Usage: npm run admin:promote -- user@example.com
 * The admin role can never be chosen through the API: this script is the only way to obtain it.
 */
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '../db/connectDB.js';
import { User } from '../models/userModel.js';

const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(process.argv[2] ?? '');
if (!email.success) {
    console.error('Usage: npm run admin:promote -- <e-mail>');
    process.exit(1);
}
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
}

await connectDB(process.env.MONGO_URI);
const user = await User.findOneAndUpdate(
    { email: email.data, isVerified: true },
    { role: 'admin' },
    { returnDocument: 'after' },
);
console.log(user ? `${user.email} is now an admin.` : 'No verified account found for this e-mail.');
await mongoose.disconnect();
process.exit(user ? 0 : 1);
