import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    error: string | null;
    isTracking: boolean;
    orderId: string | null;
}

export const useGeolocation = (userId: string | null, shouldTrack: boolean = false, orderId: string | null = null) => {
    const [state, setState] = useState<GeolocationState>({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: null,
        isTracking: false,
        orderId: null
    });

    useEffect(() => {
        setState(prev => ({ ...prev, orderId }));
    }, [orderId]);

    const lastUpdate = useRef<{ lat: number; lng: number; time: number } | null>(null);

    useEffect(() => {
        if (!userId || !shouldTrack) {
            setState(prev => ({ ...prev, isTracking: false }));
            return;
        }

        let watchId: string | null = null;

        const startTracking = async () => {
            try {
                // Solicitar permissão explicitamente se estiver no mobile
                if (Capacitor.isNativePlatform()) {
                    const permission = await Geolocation.requestPermissions();
                    if (permission.location !== 'granted') {
                        console.warn('Permissão de geolocalização negada pelo usuário.');
                        setState(prev => ({ ...prev, error: 'Permissão de localização negada', isTracking: false }));
                        return;
                    }
                }

                setState(prev => ({ ...prev, isTracking: true }));

                watchId = await Geolocation.watchPosition(
                    {
                        enableHighAccuracy: true,
                        timeout: 30000,
                        maximumAge: 0
                    },
                    async (position, err) => {
                        if (err) {
                            console.error('Erro no rastreamento:', err);
                            setState(prev => ({ ...prev, error: err.message, isTracking: false }));
                            return;
                        }

                        if (position) {
                            const { latitude, longitude, accuracy } = position.coords;

                            // 1. Atualizar UI Local (Sempre Instantâneo para o Mapa fluir)
                            setState(prev => ({
                                ...prev,
                                latitude,
                                longitude,
                                accuracy,
                                error: null,
                                isTracking: true
                            }));

                            // 2. Throttling Inteligente para Backend (Economia de Bateria/Dados)
                            const now = Date.now();
                            const THROTTLE_TIME_MS = 30000; // 30 segundos
                            const THROTTLE_DIST_M = 20;     // 20 metros

                            let shouldUpdateDB = false;

                            if (!lastUpdate.current) {
                                shouldUpdateDB = true;
                            } else {
                                const timeDelta = now - lastUpdate.current.time;
                                const distDelta = calculateDistance(
                                    lastUpdate.current.lat,
                                    lastUpdate.current.lng,
                                    latitude,
                                    longitude
                                );

                                if (timeDelta > THROTTLE_TIME_MS || distDelta > THROTTLE_DIST_M) {
                                    shouldUpdateDB = true;
                                }
                            }

                            if (shouldUpdateDB) {
                                lastUpdate.current = { lat: latitude, lng: longitude, time: now };

                                // --- ELITE 2.0: Telemetria ---
                                let batteryLevel: number | undefined;
                                let connectionType: string = 'Desconhecido';

                                try {
                                    const info = await Device.getBatteryInfo();
                                    batteryLevel = Math.round((info.batteryLevel || 0) * 100);

                                    const status = await Network.getStatus();
                                    connectionType = status.connectionType.toUpperCase();
                                } catch (e) {
                                    console.warn('Falha ao obter telemetria:', e);
                                }

                                // Atualizar perfil com última localização e telemetria
                                const { error: updateError } = await supabase
                                    .from('profiles')
                                    .update({
                                        last_lat: latitude,
                                        last_lng: longitude,
                                        battery_level: batteryLevel,
                                        signal_status: connectionType,
                                        last_online: new Date().toISOString(),
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', userId);

                                if (updateError) console.error('Erro ao atualizar location:', updateError);

                                // Invocar tracking-engine
                                let invokeSuccess = false;
                                try {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (session?.access_token) {
                                        const { error: trackingError } = await supabase.functions.invoke('tracking-engine', {
                                            body: {
                                                motoboyId: userId,
                                                latitude,
                                                longitude,
                                                orderId: orderId || null
                                            },
                                            headers: { Authorization: `Bearer ${session.access_token}` }
                                        });

                                        if (!trackingError) invokeSuccess = true;
                                        else console.warn('Erro tracking-engine:', trackingError);
                                    }
                                } catch (e) {
                                    console.warn('Exceção tracking-engine:', e);
                                }

                                // Fallback
                                if (!invokeSuccess) {
                                    await supabase.from('location_history').insert({
                                        motoboy_id: userId,
                                        latitude,
                                        longitude
                                    });
                                }
                            }
                        }
                    }
                );
            } catch (e: any) {
                console.error('Falha ao iniciar rastreamento:', e);
                setState(prev => ({ ...prev, error: e.message, isTracking: false }));
            }
        };

        startTracking();

        return () => {
            if (watchId) Geolocation.clearWatch({ id: watchId });
            setState(prev => ({ ...prev, isTracking: false }));
        };
    }, [userId, shouldTrack, orderId]);

    // Helper simples de distância (Haversine simplificado) para o Hook não depender de lib externa
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    return state;
};
