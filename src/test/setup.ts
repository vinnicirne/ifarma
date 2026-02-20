import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
});

// ─── Supabase mock ────────────────────────────────────────────────────────────
// NOTE: path must match what the hook files import (../lib/supabase)
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
            signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
            signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            onAuthStateChange: vi.fn().mockReturnValue({
                data: { subscription: { unsubscribe: vi.fn() } }
            }),
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
            unsubscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
}));

// ─── Firebase mock ────────────────────────────────────────────────────────────
vi.mock('../lib/firebase', () => ({
    requestNotificationPermission: vi.fn().mockResolvedValue('mock-fcm-token'),
    onMessageListener: vi.fn().mockReturnValue(new Promise(() => { })),
}));

// ─── Capacitor mocks ──────────────────────────────────────────────────────────
vi.mock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: vi.fn().mockReturnValue(false) },
}));

vi.mock('@capacitor/geolocation', () => ({
    Geolocation: {
        requestPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
        watchPosition: vi.fn().mockResolvedValue('watch-id-123'),
        clearWatch: vi.fn(),
    },
}));

vi.mock('@capacitor/device', () => ({
    Device: {
        getInfo: vi.fn().mockResolvedValue({ platform: 'web' }),
        getBatteryInfo: vi.fn().mockResolvedValue({ batteryLevel: 0.85, isCharging: false }),
    },
}));

vi.mock('@capacitor/push-notifications', () => ({
    PushNotifications: {
        requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
        register: vi.fn(),
        addListener: vi.fn(),
    },
}));

vi.mock('@capacitor/local-notifications', () => ({
    LocalNotifications: {
        createChannel: vi.fn(),
        schedule: vi.fn(),
    },
}));

// ─── Browser API mocks ────────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

Object.defineProperty(navigator, 'wakeLock', {
    writable: true,
    value: {
        request: vi.fn().mockResolvedValue({
            released: false,
            release: vi.fn().mockResolvedValue(undefined),
            addEventListener: vi.fn(),
        }),
    },
});

Object.defineProperty(navigator, 'vibrate', {
    writable: true,
    value: vi.fn(),
});

Object.defineProperty(window, 'Notification', {
    writable: true,
    value: class {
        static permission = 'granted';
        static requestPermission = vi.fn().mockResolvedValue('granted');
    },
});

(globalThis as any).IntersectionObserver = class {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() { return []; }
    unobserve() { }
};

(globalThis as any).ResizeObserver = class {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
};
