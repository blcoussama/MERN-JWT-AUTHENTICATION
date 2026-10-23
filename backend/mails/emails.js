import {
    ACCOUNT_EXISTS_TEMPLATE,
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
    WELCOME_EMAIL_TEMPLATE,
} from './emailTemplates.js';

const escapeHtml = (value) =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

/** Replaces every {placeholder} with its HTML-escaped value (user input never reaches the HTML raw). */
const render = (template, vars) =>
    template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? escapeHtml(vars[key]) : match));

/**
 * Builds the application e-mails and hands them to a transport.
 * A transport is any object with `async send(message)`; see transports.js.
 * `type` and `data` are not sent to the provider: they let tests and the console
 * transport read the message without parsing HTML.
 */
export const createMailer = (transport, { from, fromName, clientUrl, appName = 'MERN JWT Auth' }) => {
    const send = (message) => transport.send({ from: { email: from, name: fromName }, ...message });

    return {
        transport,

        sendVerificationCode: (to, code) =>
            send({
                to,
                type: 'verification-code',
                data: { code },
                subject: 'Verify your e-mail',
                text: `Your verification code is ${code}. It expires in 15 minutes.`,
                html: render(VERIFICATION_EMAIL_TEMPLATE, { verificationCode: code }),
            }),

        sendWelcome: (to, username) =>
            send({
                to,
                type: 'welcome',
                data: {},
                subject: `Welcome to ${appName}!`,
                text: `Hi ${username}, welcome to ${appName}! Your e-mail address is verified.`,
                html: render(WELCOME_EMAIL_TEMPLATE, { username, appName }),
            }),

        sendAccountExists: (to) =>
            send({
                to,
                type: 'account-exists',
                data: {},
                subject: 'Sign-up attempt on your account',
                text: `An account already exists for this address. Log in: ${clientUrl}/login`,
                html: render(ACCOUNT_EXISTS_TEMPLATE, { appName, loginURL: `${clientUrl}/login` }),
            }),

        sendPasswordReset: (to, token) => {
            const resetUrl = `${clientUrl}/reset-password/${token}`;
            return send({
                to,
                type: 'password-reset',
                data: { token, resetUrl },
                subject: 'Reset your password',
                text: `Reset your password (link valid for 1 hour): ${resetUrl}`,
                html: render(PASSWORD_RESET_REQUEST_TEMPLATE, { resetURL: resetUrl }),
            });
        },

        sendPasswordResetSuccess: (to) =>
            send({
                to,
                type: 'password-reset-success',
                data: {},
                subject: 'Your password has been reset',
                text: 'Your password has been reset. If it was not you, contact support immediately.',
                html: PASSWORD_RESET_SUCCESS_TEMPLATE,
            }),
    };
};
