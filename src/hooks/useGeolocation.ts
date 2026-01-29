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
}

export const useGeolocation = (userId: string | null, shouldTrack: boolean = false) => {
    const [state, setState] = useState<GeolocationState>({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: null,
        isTracking: false
    });

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

                            setState({
                                latitude,
                                longitude,
                                accuracy,
                                error: null,
                                isTracking: true
                            });

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

                            // Atualizar no banco de dados (Otimizado + Telemetria)
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

                            // Salvar no historico de rotas
                            await supabase
                                .from('route_history')
                                .insert({
                                    motoboy_id: userId,
                                    latitude,
                                    longitude
                                });
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
    }, [userId, shouldTrack]);

    return state;
};
