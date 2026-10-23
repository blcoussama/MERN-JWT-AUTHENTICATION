import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['frontend/**', 'node_modules/**'] },
    {
        files: ['backend/**/*.js', '*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-console': 'off',
        },
    },
];
