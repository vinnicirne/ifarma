import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false, // E2E tests often depend on state
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Stay sequential to avoid state conflicts in shared DB
    reporter: 'html',
    use: {
        baseURL: 'http://127.0.0.1:5174',
        trace: 'on-first-retry',
        viewport: { width: 375, height: 812 }, // Test in mobile viewport by default
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],

    webServer: {
        command: 'npm run preview -- --port 5174 --host 127.0.0.1',
        url: 'http://127.0.0.1:5174',
        reuseExistingServer: false,
        timeout: 120 * 1000,
    },
});
