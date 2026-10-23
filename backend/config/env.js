import { hkdfSync } from 'node:crypto';
import { z } from 'zod';

const secret = (name) =>
    z.string({ error: `${name} is required` }).min(32, `${name} must be at least 32 characters long`);

const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().int().positive().default(3000),
        MONGO_URI: z.string({ error: 'MONGO_URI is required' }).min(1),
        JWT_SECRET: secret('JWT_SECRET'),
        REFRESH_SECRET: secret('REFRESH_SECRET'),
        CLIENT_URL: z.url().default('http://localhost:5173'),
        MAIL_TRANSPORT: z.enum(['sendgrid', 'console']).optional(),
        SENDGRID_API_KEY: z.string().optional(),
        EMAIL_FROM: z.email().optional(),
        EMAIL_FROM_NAME: z.string().default('MERN JWT Auth'),
        TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    })
    .superRefine((env, ctx) => {
        if (env.JWT_SECRET === env.REFRESH_SECRET) {
            ctx.addIssue({ code: 'custom', path: ['REFRESH_SECRET'], message: 'REFRESH_SECRET must differ from JWT_SECRET' });
        }
        const transport = env.MAIL_TRANSPORT ?? (env.NODE_ENV === 'production' ? 'sendgrid' : 'console');
        if (env.NODE_ENV === 'production' && transport === 'console') {
            ctx.addIssue({ code: 'custom', path: ['MAIL_TRANSPORT'], message: 'the console mail transport is not allowed in production' });
        }
        if (transport === 'sendgrid' && (!env.SENDGRID_API_KEY || !env.EMAIL_FROM)) {
            ctx.addIssue({ code: 'custom', path: ['SENDGRID_API_KEY'], message: 'SENDGRID_API_KEY and EMAIL_FROM are required with the sendgrid transport' });
        }
    });

/**
 * Builds the application configuration from environment variables.
 * Throws a readable error listing every invalid or missing variable.
 */
export const loadConfig = (source = process.env) => {
    const parsed = envSchema.safeParse(source);
    if (!parsed.success) {
        const details = parsed.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment configuration:\n${details}`);
    }
    const env = parsed.data;
    const isProduction = env.NODE_ENV === 'production';

    return {
        env: env.NODE_ENV,
        isProduction,
        port: env.PORT,
        mongoUri: env.MONGO_URI,
        clientUrl: env.CLIENT_URL.replace(/\/$/, ''),
        trustProxy: env.TRUST_PROXY,
        jwt: {
            accessSecret: env.JWT_SECRET,
            refreshSecret: env.REFRESH_SECRET,
            accessTtlSeconds: 15 * 60, // 15 minutes
            refreshTtlSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        // Key used to HMAC the 6-digit e-mail codes before storing them (derived, never stored).
        codeHashKey: Buffer.from(hkdfSync('sha256', env.JWT_SECRET, '', 'email-verification-code', 32)),
        verification: {
            codeTtlMs: 15 * 60 * 1000, // 15 minutes (matches the e-mail template)
            maxAttempts: 5,
            resendCooldownMs: 60 * 1000,
        },
        passwordReset: {
            tokenTtlMs: 60 * 60 * 1000, // 1 hour (matches the e-mail template)
        },
        cookies: {
            secure: isProduction,
        },
        mail: {
            transport: env.MAIL_TRANSPORT ?? (isProduction ? 'sendgrid' : 'console'),
            sendgridApiKey: env.SENDGRID_API_KEY,
            from: env.EMAIL_FROM ?? 'no-reply@example.com',
            fromName: env.EMAIL_FROM_NAME,
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            general: 200, // every /api/auth route
            sensitive: 10, // login, verify-email, reset-password
            email: 5, // routes that send an e-mail (signup, resend, forgot-password)
        },
    };
};
