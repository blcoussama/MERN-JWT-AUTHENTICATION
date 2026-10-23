import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['backend/tests/**/*.test.js'],
        environment: 'node',
        hookTimeout: 120_000, // first run downloads the MongoDB binary used by mongodb-memory-server
        testTimeout: 30_000,
    },
});
