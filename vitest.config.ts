import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: true,
        // Exclude Playwright E2E specs — run with `npx playwright test`
        exclude: [
            'node_modules/**',
            'tests/e2e/**',
            '**/*.spec.ts'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                'dist/',
                '.capacitor/',
                'android/',
                'ios/'
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
