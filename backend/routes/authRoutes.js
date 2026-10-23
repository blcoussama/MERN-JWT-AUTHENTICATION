import express from 'express';
import {
    CheckAuth,
    ForgotPassword,
    Login,
    Logout,
    RefreshToken,
    ResendVerification,
    ResetPassword,
    SignUp,
    VerifyEmail,
} from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { VerifyToken } from '../middlewares/verifyToken.js';
import {
    emailOnlySchema,
    loginSchema,
    resetPasswordSchema,
    resetTokenParamsSchema,
    signUpSchema,
    verifyEmailSchema,
} from '../validation/authSchemas.js';

export const createAuthRouter = (limiters) => {
    const router = express.Router();
    router.use(limiters.general);

    router.get('/check-auth', VerifyToken, CheckAuth);

    router.post('/signup', limiters.email, validate(signUpSchema), SignUp);
    router.post('/resend-verification', limiters.email, validate(emailOnlySchema), ResendVerification);
    router.post('/verify-email', limiters.sensitive, validate(verifyEmailSchema), VerifyEmail);
    router.post('/login', limiters.login, validate(loginSchema), Login);
    router.post('/logout', Logout);
    router.post('/forgot-password', limiters.email, validate(emailOnlySchema), ForgotPassword);
    router.post(
        '/reset-password/:token',
        limiters.sensitive,
        validate(resetTokenParamsSchema, 'params'),
        validate(resetPasswordSchema),
        ResetPassword,
    );
    router.post('/refresh-token', RefreshToken);

    return router;
};
