import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { connectDB } from './db/connectDB.js';
import { createMailer } from './mails/emails.js';
import { createConsoleTransport, createSendgridTransport } from './mails/transports.js';

let config;
try {
    config = loadConfig();
} catch (err) {
    console.error(err.message);
    process.exit(1);
}

const transport =
    config.mail.transport === 'sendgrid'
        ? createSendgridTransport(config.mail.sendgridApiKey)
        : createConsoleTransport();

const mailer = createMailer(transport, {
    from: config.mail.from,
    fromName: config.mail.fromName,
    clientUrl: config.clientUrl,
});

try {
    await connectDB(config.mongoUri);
} catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
}

createApp({ config, mailer }).listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.env}, mail transport: ${transport.name}).`);
});
