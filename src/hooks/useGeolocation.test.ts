import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGeolocation } from './useGeolocation';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/geolocation', () => ({
    Geolocation: {
        requestPermissions: vi.fn(),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
    }
}));
vi.mock('@capacitor/device', () => ({
    Device: {
        getBatteryInfo: vi.fn(),
    }
}));
vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
    }
}));

const USER_ID = 'motoboy-123';

describe('useGeolocation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'token' } } } as any);
        vi.mocked(Device.getBatteryInfo).mockResolvedValue({ batteryLevel: 0.8, isCharging: false } as any);
        vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { session: null }, error: null } as any);

        // Mock watchPosition to return a watch ID
        vi.mocked(Geolocation.watchPosition).mockResolvedValue('watch-123' as any);
    });

    it('deve iniciar sem rastreamento se userId estiver ausente', () => {
        const { result } = renderHook(() => useGeolocation(null, true));
        expect(result.current.isTracking).toBe(false);
    });

    it('deve iniciar sem rastreamento se shouldTrack for false', () => {
        const { result } = renderHook(() => useGeolocation(USER_ID, false));
        expect(result.current.isTracking).toBe(false);
    });

    it('deve iniciar rastreamento quando userId e shouldTrack forem true', async () => {
        const { result } = renderHook(() => useGeolocation(USER_ID, true));
        await waitFor(() => expect(result.current.isTracking).toBe(true));
        expect(Geolocation.watchPosition).toHaveBeenCalled();
    });

    it('deve chamar tracking-engine quando a posição mudar', async () => {
        let callback: any;
        vi.mocked(Geolocation.watchPosition).mockImplementation(async (options, cb) => {
            callback = cb;
            return 'watch-123';
        });

        renderHook(() => useGeolocation(USER_ID, true));

        await waitFor(() => expect(callback).toBeDefined());

        // Simulate position update
        const mockPosition = {
            coords: {
                latitude: -22.9,
                longitude: -43.1,
                accuracy: 10,
                altitude: null,
                heading: null,
                speed: null,
                altitudeAccuracy: null
            },
            timestamp: Date.now()
        };

        await act(async () => {
            await callback(mockPosition, null);
        });

        expect(supabase.functions.invoke).toHaveBeenCalledWith('tracking-engine', expect.objectContaining({
            body: expect.objectContaining({
                motoboyId: USER_ID,
                latitude: -22.9,
                longitude: -43.1
            })
        }));
    });

    it('deve usar fallback para DB se tracking-engine falhar', async () => {
        let callback: any;
        vi.mocked(Geolocation.watchPosition).mockImplementation(async (options, cb) => {
            callback = cb;
            return 'watch-123';
        });

        // Simulate Edge Function failure
        vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: { message: 'Edge Error' } } as any);

        // Mock update and insert for fallback
        const mockFrom = vi.mocked(supabase.from);
        mockFrom.mockReturnValue({
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
        } as any);

        renderHook(() => useGeolocation(USER_ID, true));

        await waitFor(() => expect(callback).toBeDefined());

        const mockPosition = {
            coords: { latitude: -22.9, longitude: -43.1, accuracy: 10 },
            timestamp: Date.now()
        };

        await act(async () => {
            await callback(mockPosition, null);
        });

        expect(mockFrom).toHaveBeenCalledWith('profiles');
        expect(mockFrom).toHaveBeenCalledWith('route_history');
    });

    it('deve limpar o watch ao desmontar', async () => {
        const { unmount, result } = renderHook(() => useGeolocation(USER_ID, true));
        // Wait for the hook to start tracking (watchPosition resolves async)
        await waitFor(() => expect(result.current.isTracking).toBe(true), { timeout: 3000 });
        unmount();
        expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'watch-123' });
    });
});
