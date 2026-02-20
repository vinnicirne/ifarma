import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMotoboyMap } from './useMotoboyMap';
import { supabase } from '../lib/supabase';
import React from 'react';

// Mock Supabase
vi.mock('../lib/supabase');

// Mock Google Maps Objects
const mockMap = {
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn().mockReturnValue(15),
    setHeading: vi.fn(),
    setTilt: vi.fn(),
    getTilt: vi.fn().mockReturnValue(0),
};

const mockDirectionsRenderer = {
    setMap: vi.fn(),
    setDirections: vi.fn(),
};

const mockMarker = {
    setMap: vi.fn(),
    setPosition: vi.fn(),
    setIcon: vi.fn(),
    getIcon: vi.fn().mockReturnValue({ rotation: 0 }),
};

// Global google mock with proper constructors
(globalThis as any).google = {
    maps: {
        Map: vi.fn().mockImplementation(function () { return mockMap; }),
        Marker: vi.fn().mockImplementation(function () { return mockMarker; }),
        DirectionsRenderer: vi.fn().mockImplementation(function () { return mockDirectionsRenderer; }),
        DirectionsService: vi.fn().mockImplementation(function () {
            return {
                route: vi.fn((req, cb) => {
                    cb({
                        routes: [{
                            legs: [{
                                distance: { text: '2 km', value: 2000 },
                                duration: { text: '5 min' }
                            }],
                            overview_polyline: 'mock_polyline',
                            overview_path: []
                        }]
                    }, 'OK');
                })
            };
        }),
        DirectionsTravelMode: { DRIVING: 'DRIVING' },
        TravelMode: { DRIVING: 'DRIVING' },
        DirectionsStatus: { OK: 'OK' },
        LatLngBounds: vi.fn().mockImplementation(function () {
            return {
                extend: vi.fn(),
            };
        }),
        LatLng: vi.fn().mockImplementation(function (lat, lng) {
            return { lat, lng };
        }),
        Size: vi.fn().mockImplementation(function (w, h) {
            return { width: w, height: h };
        }),
        Point: vi.fn().mockImplementation(function (x, y) {
            return { x, y };
        }),
        event: {
            trigger: vi.fn(),
            clearInstanceListeners: vi.fn(),
        },
        Geocoder: vi.fn().mockImplementation(function () {
            return {
                geocode: vi.fn((req, cb) => cb([{ geometry: { location: { lat: () => -22.9, lng: () => -43.1 } } }], 'OK')),
            };
        }),
    }
};

interface TestWrapperProps {
    params: any;
    onData?: (data: any) => void;
}

const TestWrapper = ({ params, onData }: TestWrapperProps) => {
    const data = useMotoboyMap(
        params.currentOrder,
        params.latitude,
        params.longitude,
        params.currentView,
        params.isNavigationMode,
        params.darkModeStyle
    );

    React.useEffect(() => {
        if (onData) onData(data);
    }, [data, onData]);

    return <div ref={data.mapRef} data-testid="map-container" style={{ width: 400, height: 400 }} />;
};

const DEFAULT_PARAMS = {
    currentOrder: {
        id: 'order-1',
        status: 'entregando',
        delivery_lat: -22.95,
        delivery_lng: -43.15
    },
    latitude: -22.9,
    longitude: -43.1,
    currentView: 'home',
    isNavigationMode: false,
    darkModeStyle: []
};

describe('useMotoboyMap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).window.google = (globalThis as any).google;
        // Mock supabase resolve
        vi.mocked(supabase.from).mockReturnValue({
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
        } as any);
    });

    it('deve inicializar com mapReady = false e ficar pronto ao mudar para delivery', async () => {
        let hookData: any = { mapReady: false };
        const { rerender } = render(
            <TestWrapper
                params={DEFAULT_PARAMS}
                onData={(d) => { hookData = d; }}
            />
        );

        expect(hookData.mapReady).toBe(false);

        const deliveryParams = { ...DEFAULT_PARAMS, currentView: 'delivery' };

        rerender(
            <TestWrapper
                params={deliveryParams}
                onData={(d) => { hookData = d; }}
            />
        );

        await waitFor(() => expect(hookData.mapReady).toBe(true));
        expect(globalThis.google.maps.Map).toHaveBeenCalled();
    });

    it('deve buscar rota e atualizar status quando o mapa estiver pronto', async () => {
        let hookData: any;
        const deliveryParams = { ...DEFAULT_PARAMS, currentView: 'delivery' };

        render(
            <TestWrapper
                params={deliveryParams}
                onData={(d) => { hookData = d; }}
            />
        );

        await waitFor(() => expect(hookData.mapReady).toBe(true));

        await waitFor(() => {
            expect(hookData.distanceToDest).toBe(2000);
            expect(hookData.eta).toBe('5 min');
        }, { timeout: 3000 });

        expect(mockDirectionsRenderer.setDirections).toHaveBeenCalled();
    });

    it('deve limpar marcadores ao desmontar', async () => {
        let hookData: any;
        const { unmount } = render(
            <TestWrapper
                params={{ ...DEFAULT_PARAMS, currentView: 'delivery' }}
                onData={(d) => { hookData = d; }}
            />
        );

        await waitFor(() => expect(hookData.mapReady).toBe(true));

        unmount();

        expect(mockMarker.setMap).toHaveBeenCalledWith(null);
        expect(globalThis.google.maps.event.clearInstanceListeners).toHaveBeenCalled();
    });
});
