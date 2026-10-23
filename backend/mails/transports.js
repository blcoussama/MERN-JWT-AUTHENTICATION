import sgMail from '@sendgrid/mail';

/** Production transport: SendGrid. */
export const createSendgridTransport = (apiKey) => {
    sgMail.setApiKey(apiKey);
    return {
        name: 'sendgrid',
        // eslint-disable-next-line no-unused-vars
        send: async ({ type, data, ...message }) => {
            await sgMail.send({ ...message, categories: [type] });
        },
    };
};

/** Development transport: prints the message in the terminal instead of sending it (never allowed in production). */
export const createConsoleTransport = () => ({
    name: 'console',
    send: async ({ to, subject, text }) => {
        console.log(`\n[mail:console] To: ${to}\n[mail:console] Subject: ${subject}\n[mail:console] ${text}\n`);
    },
});

/** Test transport: keeps the messages in memory. */
export const createMemoryTransport = () => {
    const sent = [];
    return {
        name: 'memory',
        sent,
        send: async (message) => {
            sent.push(message);
        },
        last: (to, type) => [...sent].reverse().find((m) => m.to === to && (!type || m.type === type)),
        clear: () => sent.splice(0, sent.length),
    };
};
