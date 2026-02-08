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
        if (!(window as any).google || !directionsRenderer.current || !mapInstance.current) return;

        const google = (window as any).google;
        const ds = new google.maps.DirectionsService();

        ds.route({
            origin: { lat: startLat, lng: startLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING
        }, async (result: any, status: any) => {
            if (status === 'OK') {
                directionsRenderer.current.setMap(mapInstance.current);
                directionsRenderer.current.setDirections(result);

                const leg = result.routes[0].legs[0];
                const polyline = result.routes[0].overview_polyline;
                const distanceText = leg.distance?.text || '';
                const durationText = leg.duration?.text || '';

                if (leg.distance?.value) setDistanceToDest(leg.distance.value);
                if (leg.duration?.text) setEta(leg.duration.text);

                // --- CACHE DE ROTA PREMIUM ---
                // Salvar a rota no banco para que o cliente não precise gastar API do Google recalculando
                if (currentOrder?.id && polyline) {
                    supabase.from('orders').update({
                        route_polyline: polyline,
                        route_distance_text: distanceText,
                        route_duration_text: durationText,
                        updated_at: new Date().toISOString()
                    }).eq('id', currentOrder.id).then(({ error }) => {
                        if (error) console.error('Erro ao salvar cache de rota:', error);
                        else console.log('📍 Rota cacheada no servidor com sucesso.');
                    });
                }

                pathPoints.current = result.routes[0].overview_path;

                if (mapInstance.current) {
                    const destKey = `${destLat},${destLng}-${currentOrder?.status || ''}`;
                    if (hasInitialFit.current !== destKey) {
                        const bounds = new google.maps.LatLngBounds();
                        bounds.extend({ lat: startLat, lng: startLng });
                        bounds.extend({ lat: destLat, lng: destLng });

                        // Padding generoso
                        mapInstance.current.fitBounds(bounds, { top: 150, bottom: 250, left: 80, right: 80 });
                        hasInitialFit.current = destKey;

                        // GARANTIA DE ZOOM: O fitBounds pode dar zoom muito longe. Nós travamos o mínimo.
                        setTimeout(() => {
                            if (mapInstance.current) {
                                const currentZoom = mapInstance.current.getZoom();
                                if (currentZoom < 16) mapInstance.current.setZoom(17);
                                mapInstance.current.panTo({ lat: startLat, lng: startLng });
                            }
                        }, 500);
                    }
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
            }
        });
    }, [currentOrder?.status, isNavigationMode]);

    useEffect(() => {
        if (currentView !== 'delivery' || !mapRef.current) {
            setMapReady(false);
            return;
        }

        if (mapInstance.current) return;
        if (!(window as any).google) return;
        const google = (window as any).google;

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
            if (mapInstance.current) {
                google.maps.event.clearInstanceListeners(mapInstance.current);
            }
            if (userMarker.current) userMarker.current.setMap(null);
            if (destMarkerRef.current) destMarkerRef.current.setMap(null);
            if (pharmacyMarkerRef.current) pharmacyMarkerRef.current.setMap(null);
            mapInstance.current = null;
        };
    }, [currentView, darkModeStyle]);

    const pathPoints = useRef<any[]>([]);
    const gpsBuffer = useRef<{ lat: number, lng: number }[]>([]);
    const animFrameRef = useRef<number | null>(null);

    const resolveAndFetch = useCallback(async () => {
        if (!currentOrder || !mapReady || !latitude || !longitude) return;

        // PRIORIDADE MÁXIMA: Coleta na Farmácia
        const needsToCollect = ['aceito', 'pronto_entrega', 'aguardando_retirada'].includes(currentOrder.status);

        let dLat: number | null = null;
        let dLng: number | null = null;

        if (needsToCollect && currentOrder.pharmacies?.latitude) {
            dLat = Number(currentOrder.pharmacies.latitude);
            dLng = Number(currentOrder.pharmacies.longitude);
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

        // Pharmacy Marker
        if (currentOrder.pharmacies && mapInstance.current) {
            if (!pharmacyMarkerRef.current) {
                const google = (window as any).google;
                pharmacyMarkerRef.current = new google.maps.Marker({
                    map: isGoingToPharmacy ? null : mapInstance.current,
                    position: { lat: Number(currentOrder.pharmacies.latitude), lng: Number(currentOrder.pharmacies.longitude) },
                    icon: {
                        url: 'https://img.icons8.com/3d-fluency/94/pharmacy-shop.png',
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20)
                    }
                });
            } else {
                pharmacyMarkerRef.current.setMap(isGoingToPharmacy ? null : mapInstance.current);
                pharmacyMarkerRef.current.setPosition({ lat: Number(currentOrder.pharmacies.latitude), lng: Number(currentOrder.pharmacies.longitude) });
            }
        }

        resolveAndFetch();
    }, [currentOrder?.id, currentOrder?.status, mapReady, latitude, longitude, resolveAndFetch]);

    return { mapRef, mapReady, distanceToDest, eta, mapInstance, userMarker };
};
