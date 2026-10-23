import mongoose from 'mongoose';

export const ROLES = ['client', 'admin'];

const userSchema = new mongoose.Schema(
    {
        // Always "client" at sign-up; "admin" can only be granted server-side (npm run admin:promote).
        role: { type: String, enum: ROLES, default: 'client', required: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        username: { type: String, required: true, trim: true },
        password: { type: String, required: true, select: false },
        lastLogin: { type: Date, default: null },
        isVerified: { type: Boolean, default: false },

        // E-mail verification: only an HMAC of the 6-digit code is stored.
        verificationCodeHash: { type: String, select: false },
        verificationCodeExpiresAt: { type: Date, select: false },
        verificationCodeSentAt: { type: Date, select: false },
        verificationAttempts: { type: Number, default: 0, select: false },

        // Password reset: only a SHA-256 hash of the token is stored.
        resetPasswordTokenHash: { type: String, select: false },
        resetPasswordExpiresAt: { type: Date, select: false },
    },
    { timestamps: true },
);

/** Fields that can safely be sent to the browser. */
export const toPublicUser = (user) => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
});

export const User = mongoose.model('User', userSchema);
