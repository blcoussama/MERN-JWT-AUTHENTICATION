import mongoose from 'mongoose';

/**
 * One document per refresh token ever issued.
 * Tokens of the same login session share a `family`: when a token is used it is
 * marked `usedAt` and replaced by a new one. Presenting an already used (or revoked)
 * token means it was stolen and replayed, so the whole family is revoked.
 */
const refreshTokenSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        family: { type: String, required: true, index: true },
        tokenHash: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        usedAt: { type: Date, default: null },
        revokedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

// MongoDB removes expired documents automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
