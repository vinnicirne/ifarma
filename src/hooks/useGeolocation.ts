import { useEffect, useState } from 'react';
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
                        setState(prev => ({ ...prev, error: 'Permissao de localizacao negada', isTracking: false }));
                        return;
                    }
                }

                setState(prev => ({ ...prev, isTracking: true }));

                watchId = await Geolocation.watchPosition(
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
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

                            setState(prev => ({
                                ...prev,
                                latitude,
                                longitude,
                                accuracy,
                                error: null,
                                isTracking: true
                            }));

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

                            // 1. Atualizar perfil com última localização e telemetria
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

                            // 2. Invocar tracking-engine para Geofencing e Histórico (Inteligente)
                            // Isso substitui a inserção direta em tabelas de histórico
                            try {
                                const { error: trackingError } = await supabase.functions.invoke('tracking-engine', {
                                    body: {
                                        motoboyId: userId,
                                        latitude,
                                        longitude,
                                        orderId: state.orderId || null // Adicionar suporte a orderId no estado se necessário
                                    }
                                });
                                if (trackingError) console.warn('Erro na tracking-engine:', trackingError);
                            } catch (e) {
                                // Fallback para inserção direta caso a Edge Function falhe
                                await supabase
                                    .from('location_history')
                                    .insert({
                                        motoboy_id: userId,
                                        latitude,
                                        longitude
                                    });
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
            if (watchId) {
                Geolocation.clearWatch({ id: watchId });
            }
            setState(prev => ({ ...prev, isTracking: false }));
        };
    }, [userId, shouldTrack, orderId]);

    return state;
};
