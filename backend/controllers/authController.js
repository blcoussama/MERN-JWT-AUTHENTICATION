import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { toPublicUser, User } from '../models/userModel.js';
import {
    clearAuthCookies,
    consumeRefreshToken,
    issueSession,
    REFRESH_COOKIE,
    revokeAllSessions,
    revokeRefreshToken,
} from '../services/sessionService.js';
import { generateRandomToken, generateVerificationCode, hashCode, safeEqualHex, sha256 } from '../utils/tokens.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the e-mail is unknown, so that a login takes the same time either way.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

// Neutral messages: the API never reveals whether an e-mail address has an account.
const SIGNUP_MESSAGE = 'If this e-mail address can be used, a 6-digit verification code has been sent to it.';
const RESEND_MESSAGE = 'If an account is waiting for verification with this address, a new code has been sent.';
const FORGOT_MESSAGE = 'If an account exists for this address, a password reset link has been sent.';
const INVALID_CODE_MESSAGE = 'Invalid or expired verification code.';

const logMailError = (kind, err) => console.error(`[mail] failed to send ${kind} e-mail:`, err.message);

/** Stores a fresh verification code (HMAC only) and e-mails it. */
const sendNewVerificationCode = async (req, user) => {
    const { config, mailer } = req.app.locals;
    const code = generateVerificationCode();
    const now = Date.now();

    await User.updateOne(
        { _id: user._id },
        {
            verificationCodeHash: hashCode(code, config.codeHashKey),
            verificationCodeExpiresAt: new Date(now + config.verification.codeTtlMs),
            verificationCodeSentAt: new Date(now),
            verificationAttempts: 0,
        },
    );

    try {
        await mailer.sendVerificationCode(user.email, code);
    } catch (err) {
        logMailError('verification', err);
    }
};

/** One code per minute at most for a given account. */
const canResend = (req, user) => {
    const { resendCooldownMs } = req.app.locals.config.verification;
    return !user.verificationCodeSentAt || Date.now() - user.verificationCodeSentAt.getTime() >= resendCooldownMs;
};

export const SignUp = async (req, res) => {
    const { email, password, username } = req.body;
    const { mailer } = req.app.locals;

    // Hash first so that the response time does not depend on the e-mail being known.
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const existingUser = await User.findOne({ email }).select('+verificationCodeSentAt');

    if (existingUser) {
        if (existingUser.isVerified) {
            // Tell the real owner instead of telling the requester.
            mailer.sendAccountExists(existingUser.email).catch((err) => logMailError('account-exists', err));
        } else if (canResend(req, existingUser)) {
            await sendNewVerificationCode(req, existingUser);
        }
        return res.status(201).json({ success: true, message: SIGNUP_MESSAGE });
    }

    let user;
    try {
        // The role is never taken from the request: every new account is a "client".
        user = await User.create({ email, username, password: hashedPassword, role: 'client' });
    } catch (err) {
        if (err.code === 11000) return res.status(201).json({ success: true, message: SIGNUP_MESSAGE }); // concurrent sign-up
        throw err;
    }

    await sendNewVerificationCode(req, user);
    return res.status(201).json({ success: true, message: SIGNUP_MESSAGE });
};

export const ResendVerification = async (req, res) => {
    const user = await User.findOne({ email: req.body.email, isVerified: false }).select('+verificationCodeSentAt');
    if (user && canResend(req, user)) {
        await sendNewVerificationCode(req, user);
    }
    return res.status(200).json({ success: true, message: RESEND_MESSAGE });
};

export const VerifyEmail = async (req, res) => {
    const { email, code } = req.body;
    const { config, mailer } = req.app.locals;

    // Each attempt is counted atomically BEFORE the comparison: parallel requests
    // cannot exceed `maxAttempts` guesses for a given code.
    const user = await User.findOneAndUpdate(
        {
            email,
            isVerified: false,
            verificationCodeExpiresAt: mongoose.trusted({ $gt: new Date() }),
            verificationAttempts: mongoose.trusted({ $lt: config.verification.maxAttempts }),
        },
        { $inc: { verificationAttempts: 1 } },
        { returnDocument: 'after' },
    ).select('+verificationCodeHash');

    if (!user || !safeEqualHex(hashCode(code, config.codeHashKey), user.verificationCodeHash)) {
        return res.status(400).json({ success: false, message: INVALID_CODE_MESSAGE });
    }

    await User.updateOne(
        { _id: user._id },
        {
            isVerified: true,
            $unset: { verificationCodeHash: 1, verificationCodeExpiresAt: 1, verificationCodeSentAt: 1, verificationAttempts: 1 },
        },
    );

    mailer.sendWelcome(user.email, user.username).catch((err) => logMailError('welcome', err));

    // The code only proves ownership of the mailbox: it does not open a session.
    // The user logs in with the password afterwards, so guessing a code never gives access to an account.
    return res.status(200).json({ success: true, message: 'E-mail verified successfully. You can now log in.' });
};

export const Login = async (req, res) => {
    const { email, password } = req.body;
    const { config } = req.app.locals;

    const user = await User.findOne({ email }).select('+password');
    const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);

    if (!user || !isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Only revealed to someone who knows the password.
    if (!user.isVerified) {
        return res.status(403).json({
            success: false,
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your e-mail before logging in.',
        });
    }

    user.lastLogin = new Date();
    await user.save();
    await issueSession(res, user, config);

    return res.status(200).json({ success: true, message: 'Logged in successfully.', user: toPublicUser(user) });
};

export const Logout = async (req, res) => {
    const { config } = req.app.locals;
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) await revokeRefreshToken(refreshToken, config);

    clearAuthCookies(res, config);
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

export const RefreshToken = async (req, res) => {
    const { config } = req.app.locals;
    const token = req.cookies?.[REFRESH_COOKIE]; // cookie only, never the body

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: no refresh token provided.' });
    }

    const result = await consumeRefreshToken(token, config);
    if (result.status !== 'ok') {
        clearAuthCookies(res, config);
        const message =
            result.status === 'reuse'
                ? 'Unauthorized: refresh token reuse detected, all sessions of this login have been revoked.'
                : 'Unauthorized: invalid or expired refresh token.';
        return res.status(401).json({ success: false, message });
    }

    const user = await User.findById(result.record.user);
    if (!user || !user.isVerified) {
        clearAuthCookies(res, config);
        return res.status(401).json({ success: false, message: 'Unauthorized: invalid or expired refresh token.' });
    }

    // Rotation: a new refresh token (same family) replaces the one that was just used.
    await issueSession(res, user, config, result.record.family);
    return res.status(200).json({ success: true, message: 'Session refreshed.' });
};

export const ForgotPassword = async (req, res) => {
    const { config, mailer } = req.app.locals;
    const user = await User.findOne({ email: req.body.email });

    if (user) {
        const token = generateRandomToken();
        await User.updateOne(
            { _id: user._id },
            {
                resetPasswordTokenHash: sha256(token), // the link token itself is never stored
                resetPasswordExpiresAt: new Date(Date.now() + config.passwordReset.tokenTtlMs),
            },
        );
        try {
            await mailer.sendPasswordReset(user.email, token);
        } catch (err) {
            logMailError('password reset', err);
        }
    }

    // Same answer whether the account exists or not.
    return res.status(200).json({ success: true, message: FORGOT_MESSAGE });
};

export const ResetPassword = async (req, res) => {
    const { token } = req.validated.params;
    const { mailer } = req.app.locals;

    const user = await User.findOneAndUpdate(
        { resetPasswordTokenHash: sha256(token), resetPasswordExpiresAt: mongoose.trusted({ $gt: new Date() }) },
        {
            password: await bcrypt.hash(req.body.password, BCRYPT_ROUNDS),
            $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 },
        },
        { returnDocument: 'after' },
    );

    if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }

    // A password change logs every device out.
    await revokeAllSessions(user._id);
    mailer.sendPasswordResetSuccess(user.email).catch((err) => logMailError('reset success', err));

    return res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
};

export const CheckAuth = (req, res) => res.status(200).json({ success: true, user: toPublicUser(req.user) });
