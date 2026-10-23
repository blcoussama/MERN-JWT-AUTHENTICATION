import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import './db/connectDB.js'; // applies the global mongoose settings (sanitizeFilter, strictQuery)
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { createRateLimiters } from './middlewares/rateLimiters.js';
import { createAuthRouter } from './routes/authRoutes.js';
import UserRoute from './routes/userRoutes.js';

const frontendDist = fileURLToPath(new URL('../frontend/dist', import.meta.url));

/**
 * Builds the Express application. Dependencies are injected so that tests can use
 * an in-memory database and an in-memory mail transport.
 * @param {{ config: object, mailer: object }} deps
 */
export const createApp = ({ config, mailer }) => {
    const app = express();
    app.locals.config = config;
    app.locals.mailer = mailer;

    app.disable('x-powered-by');
    if (config.trustProxy) app.set('trust proxy', config.trustProxy);

    app.use(helmet());
    app.use(express.json({ limit: '10kb' }));
    app.use(cookieParser());

    // The front end is served from the same origin (Vite proxy in development,
    // Express static files in production): no CORS is needed, cookies stay SameSite=Strict.
    app.use('/api/auth', createAuthRouter(createRateLimiters(config.rateLimit)));
    app.use('/api/users', UserRoute);
    app.use('/api', notFound);

    if (config.isProduction && existsSync(frontendDist)) {
        app.use(express.static(frontendDist));
        app.get('/{*splat}', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
    }

    app.use(notFound);
    app.use(errorHandler);
    return app;
};
