import { z } from 'zod';

// Every request body is parsed with a strict schema: unknown keys (e.g. "role")
// and non-string values (e.g. {"$ne": null}) are rejected before reaching MongoDB.

export const emailField = z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email({ error: 'Please enter a valid e-mail address.' }));

// Same rules as the strength meter shown on the sign-up form.
export const passwordField = z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password must be at most 72 bytes long.')
    .refine((p) => /[a-z]/.test(p), 'Password must contain a lowercase letter.')
    .refine((p) => /[A-Z]/.test(p), 'Password must contain an uppercase letter.')
    .refine((p) => /\d/.test(p), 'Password must contain a number.')
    .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must contain a special character.');

const usernameField = z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters long.')
    .max(50, 'Username must be at most 50 characters long.')
    .regex(/^[\p{L}\p{N} ._-]+$/u, 'Username may only contain letters, numbers, spaces, ".", "_" and "-".');

export const signUpSchema = z.strictObject({
    username: usernameField,
    email: emailField,
    password: passwordField,
});

export const verifyEmailSchema = z.strictObject({
    email: emailField,
    code: z.string().regex(/^\d{6}$/, 'The code must contain 6 digits.'),
});

export const emailOnlySchema = z.strictObject({ email: emailField });

export const loginSchema = z.strictObject({
    email: emailField,
    password: z.string().min(1, 'Password is required.').max(256),
});

export const resetPasswordSchema = z.strictObject({ password: passwordField });

export const resetTokenParamsSchema = z.strictObject({
    token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid or expired reset link.'),
});
