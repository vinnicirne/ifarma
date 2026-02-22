import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateHeading, lerp } from '../lib/navigationUtils';

export const useMotoboyMap = (
    currentOrder: any,
    latitude: number | null,
    longitude: number | null,
    currentView: string,
    isNavigationMode: boolean,
    darkModeStyle: any[]
) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const directionsRenderer = useRef<any>(null);
    const userMarker = useRef<any>(null);
    const destMarkerRef = useRef<any>(null);
    const pharmacyMarkerRef = useRef<any>(null);

    const [mapReady, setMapReady] = useState(false);
    const [distanceToDest, setDistanceToDest] = useState<number | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const lastFetchRef = useRef<string>('');
    const hasInitialFit = useRef<string>('');
    const lastPos = useRef({ lat: latitude || 0, lng: longitude || 0, heading: 0 });
    const isFetchingRoute = useRef(false);

    const fetchRoute = useCallback((startLat: number, startLng: number, destLat: number, destLng: number) => {
        if (!(window as any).google || !directionsRenderer.current || !mapInstance.current) {
            console.warn('📍 Map não pronto para fetchRoute', { google: !!(window as any).google, dr: !!directionsRenderer.current, mi: !!mapInstance.current });
            return;
        }

        const google = (window as any).google;
        const ds = new google.maps.DirectionsService();

        console.log(`📍 Calculando rota: [${startLat}, ${startLng}] -> [${destLat}, ${destLng}]`);

        ds.route({
            origin: { lat: startLat, lng: startLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING
        }, async (result: any, status: any) => {
            if (status === 'OK') {
                console.log('✅ Rota recebida com sucesso');
                directionsRenderer.current.setMap(mapInstance.current);
                directionsRenderer.current.setDirections(result);

                const leg = result.routes[0].legs[0];
                const polyline = result.routes[0].overview_polyline;
                const distanceText = leg.distance?.text || '';
                const durationText = leg.duration?.text || '';

                if (leg.distance?.value) setDistanceToDest(leg.distance.value);
                if (leg.duration?.text) setEta(leg.duration.text);

                // --- CACHE DE ROTA PREMIUM ---
                if (currentOrder?.id && polyline) {
                    supabase.from('orders').update({
                        route_polyline: polyline,
                        route_distance_text: distanceText,
                        route_duration_text: durationText,
                        updated_at: new Date().toISOString()
                    }).eq('id', currentOrder.id).then(({ error }) => {
                        if (error) console.error('Erro ao salvar cache de rota:', error);
                    });
                }

                pathPoints.current = result.routes[0].overview_path;

                // Forçar o mapa a mostrar a rota
                if (mapInstance.current) {
                    const destKey = `${destLat},${destLng}-${currentOrder?.status || ''}`;

                    const updateViewport = () => {
                        const bounds = new google.maps.LatLngBounds();
                        bounds.extend({ lat: startLat, lng: startLng });
                        bounds.extend({ lat: destLat, lng: destLng });

                        google.maps.event.trigger(mapInstance.current, 'resize');
                        mapInstance.current.fitBounds(bounds, { top: 120, bottom: 220, left: 60, right: 60 });

                        // Garante um zoom mínimo decente para não ver apenas o oceano
                        setTimeout(() => {
                            if (mapInstance.current && mapInstance.current.getZoom() < 12) {
                                mapInstance.current.setZoom(15);
                            }
                        }, 500);
                    };

                    // Executa ajuste de viewport IMEDIATAMENTE e após delay (para garantir que a animação de transição terminou)
                    updateViewport();
                    setTimeout(updateViewport, 600);
                    hasInitialFit.current = destKey;
                }

                // Destino Marker Estilizado
                const isGoingToPharmacy = ['aceito', 'pronto_entrega', 'aguardando_retirada'].includes(currentOrder.status);
                const iconUrl = isGoingToPharmacy
                    ? 'https://img.icons8.com/3d-fluency/94/pharmacy-shop.png'
                    : 'https://img.icons8.com/3d-fluency/94/home-address.png';

                if (!destMarkerRef.current) {
                    destMarkerRef.current = new google.maps.Marker({
                        position: { lat: destLat, lng: destLng },
                        map: mapInstance.current,
                        zIndex: 150,
                        icon: {
                            url: iconUrl,
                            scaledSize: new google.maps.Size(40, 40),
                            anchor: new google.maps.Point(20, 35)
                        }
                    });
                } else {
                    destMarkerRef.current.setMap(mapInstance.current);
                    destMarkerRef.current.setPosition({ lat: destLat, lng: destLng });
                    destMarkerRef.current.setIcon({
                        url: iconUrl,
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 35)
                    });
                }
            } else {
                console.error('❌ Falha ao buscar rota:', status);
            }
        });
    }, [currentOrder?.id, currentOrder?.status, isNavigationMode]);

    useEffect(() => {
        const google = (window as any).google;
        if (!google) return;

        if (currentView !== 'delivery' || !mapRef.current) {
            setMapReady(false);
            return;
        }

        // ✅ Se o mapa já existe, reativa o estado e força resize
        if (mapInstance.current) {
            setMapReady(true);
            setTimeout(() => {
                google.maps.event.trigger(mapInstance.current, 'resize');
                if (latitude && longitude) {
                    mapInstance.current.setCenter({ lat: latitude, lng: longitude });
                }
            }, 50);
            return;
        }

        mapInstance.current = new google.maps.Map(mapRef.current, {
            center: { lat: latitude || -22.9, lng: longitude || -43.1 },
            zoom: 18,
            minZoom: 10,
            maxZoom: 20,
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            styles: document.documentElement.classList.contains('dark') ? darkModeStyle : []
        });

        directionsRenderer.current = new google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: true,
            preserveViewport: true, // Crucial: Impede o Google de resetar nosso zoom
            polylineOptions: {
                strokeColor: '#13ec6d',
                strokeWeight: 7,
                strokeOpacity: 0.8,
                zIndex: 100
            }
        });

        userMarker.current = new google.maps.Marker({
            map: mapInstance.current,
            position: { lat: latitude || -22.9, lng: longitude || -43.1 },
            zIndex: 200,
            icon: {
                path: 'M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z',
                fillColor: '#13ec6d',
                fillOpacity: 1,
                strokeColor: '#000',
                strokeWeight: 2,
                scale: 2,
                anchor: new google.maps.Point(12, 12),
                rotation: lastPos.current.heading
            }
        });

        setMapReady(true);
        setTimeout(() => google.maps.event.trigger(mapInstance.current, 'resize'), 300);

        return () => {
            // No cleanup here if we want the map to persist
        };
    }, [currentView, darkModeStyle, latitude, longitude]);

    // ✅ ResizeObserver para lidar com mudanças de layout (ex.: expansão do bottom sheet)
    useEffect(() => {
        const google = (window as any).google;
        if (!google || !mapRef.current || !mapInstance.current) return;

        const el = mapRef.current;
        const ro = new ResizeObserver(() => {
            google.maps.event.trigger(mapInstance.current, 'resize');
            // Opcional: manter o centro no motoboy durante o resize
            if (latitude && longitude && isNavigationMode) {
                mapInstance.current.setCenter({ lat: latitude, lng: longitude });
            }
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, [mapReady, latitude, longitude, isNavigationMode]);

    const pathPoints = useRef<any[]>([]);
    const gpsBuffer = useRef<{ lat: number, lng: number }[]>([]);
    const animFrameRef = useRef<number | null>(null);

    const resolveAndFetch = useCallback(async () => {
        if (!currentOrder || !mapReady || !latitude || !longitude) return;

        // PRIORIDADE MÁXIMA: Coleta na Farmácia
        const needsToCollect = ['aceito', 'pronto_entrega', 'aguardando_retirada'].includes(currentOrder.status);

        let dLat: number | null = null;
        let dLng: number | null = null;

        if (needsToCollect) {
            if (currentOrder.pharmacies?.latitude && currentOrder.pharmacies?.longitude) {
                dLat = Number(currentOrder.pharmacies.latitude);
                dLng = Number(currentOrder.pharmacies.longitude);
            } else if (currentOrder.pharmacies?.address && (window as any).google) {
                // Pharmacy coords missing — geocode the pharmacy address
                const geocoder = new (window as any).google.maps.Geocoder();
                geocoder.geocode({ address: currentOrder.pharmacies.address }, (results: any, status: any) => {
                    if (status === 'OK' && results[0]) {
                        fetchRoute(latitude, longitude,
                            results[0].geometry.location.lat(),
                            results[0].geometry.location.lng());
                    }
                });
                return;
            }
        } else {
            dLat = Number(currentOrder.delivery_lat ?? currentOrder.latitude);
            dLng = Number(currentOrder.delivery_lng ?? currentOrder.longitude);
        }

        if (!dLat || !dLng || isNaN(dLat)) {
            // Tentar Geocodificação se lat/lng falhar
            const address = currentOrder.address || currentOrder.delivery_address;
            if (address && (window as any).google) {
                const geocoder = new (window as any).google.maps.Geocoder();
                geocoder.geocode({ address }, (results: any, status: any) => {
                    if (status === 'OK' && results[0]) {
                        fetchRoute(latitude, longitude, results[0].geometry.location.lat(), results[0].geometry.location.lng());
                    }
                });
                return;
            }
        }

        if (dLat && dLng) {
            const fetchKey = `${currentOrder.id}-${currentOrder.status}-${dLat}-${dLng}`;
            if (lastFetchRef.current === fetchKey) return;
            lastFetchRef.current = fetchKey;
            fetchRoute(latitude, longitude, dLat, dLng);
        }
    }, [currentOrder, mapReady, latitude, longitude, fetchRoute]);

    useEffect(() => {
        if (latitude && longitude && userMarker.current && mapInstance.current) {
            const pos = { lat: latitude, lng: longitude };

            // Rotação suave
            if (lastPos.current.lat !== 0) {
                const newHeading = calculateHeading(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
                if (Math.abs(latitude - lastPos.current.lat) > 0.00001 || Math.abs(longitude - lastPos.current.lng) > 0.00001) {
                    lastPos.current.heading = newHeading;
                    userMarker.current.setIcon({ ...userMarker.current.getIcon(), rotation: newHeading });
                }
            }

            // Animação de movimento
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            let frame = 0;
            const totalFrames = 30;
            const startPos = { lat: lastPos.current.lat, lng: lastPos.current.lng };

            const animateMove = () => {
                if (frame >= totalFrames) return;
                frame++;
                const progress = frame / totalFrames;
                const pos = {
                    lat: lerp(startPos.lat, latitude, progress),
                    lng: lerp(startPos.lng, longitude, progress)
                };
                userMarker.current.setPosition(pos);

                if (isNavigationMode && mapInstance.current) {
                    mapInstance.current.setCenter(pos);
                    mapInstance.current.setHeading(lastPos.current.heading);
                    if (mapInstance.current.getTilt() !== 45) mapInstance.current.setTilt(45);
                }
                animFrameRef.current = requestAnimationFrame(animateMove);
            };

            if (lastPos.current.lat !== 0) animateMove();
            else userMarker.current.setPosition(pos);

            lastPos.current = { lat: latitude, lng: longitude, heading: lastPos.current.heading };
        }
    }, [latitude, longitude, isNavigationMode, mapReady]);

    useEffect(() => {
        if (!currentOrder || !mapReady || !latitude || !longitude) return;

        const isGoingToPharmacy = ['aceito', 'pronto_entrega', 'aguardando_retirada'].includes(currentOrder.status);

        // Pharmacy Marker (Ponto de Origem/Coleta)
        if (currentOrder.pharmacies && mapInstance.current) {
            const google = (window as any).google;
            const pharmaPos = { lat: Number(currentOrder.pharmacies.latitude), lng: Number(currentOrder.pharmacies.longitude) };

            if (!pharmacyMarkerRef.current) {
                pharmacyMarkerRef.current = new google.maps.Marker({
                    map: mapInstance.current,
                    position: pharmaPos,
                    zIndex: 90,
                    icon: {
                        url: 'https://img.icons8.com/3d-fluency/94/pharmacy-shop.png',
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20)
                    }
                });
            } else {
                pharmacyMarkerRef.current.setMap(mapInstance.current);
                pharmacyMarkerRef.current.setPosition(pharmaPos);
            }
        }

        resolveAndFetch();
    }, [currentOrder?.id, currentOrder?.status, mapReady, latitude, longitude, resolveAndFetch]);

    return { mapRef, mapReady, distanceToDest, eta, mapInstance, userMarker };
};
