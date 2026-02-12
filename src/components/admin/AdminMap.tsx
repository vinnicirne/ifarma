import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer, Marker, Polyline } from '@react-google-maps/api';

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '32px'
};

const center = {
    lat: -22.9068, // Rio de Janeiro
    lng: -43.1729
};

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#060a08" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#060a08" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#13ec6d" }, { opacity: 0.5 }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#ffffff" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#13ec6d" }, { opacity: 0.3 }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1a2b23" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#060a08" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0a0f0d" }],
    },
];

interface AdminMapProps {
    type: 'heatmap' | 'tracking';
    data?: any[];
    markers?: { id: string; lat: number; lng: number; type: 'pharmacy' | 'order' | 'user'; orderId?: string }[];
    fleet?: { id: string; lat: number; lng: number; currentOrderId?: string; bearing?: number }[];
    polylines?: { path: { lat: number; lng: number }[]; color?: string }[];
    onMarkerClick?: (id: string, type: 'pharmacy' | 'order' | 'user', orderId?: string) => void;
    onMotoboyClick?: (orderId: string) => void;
    theme?: 'dark' | 'light';     // New prop
    autoCenter?: boolean;         // New prop
    googleMapsApiKey?: string;    // Dynamic API Key from DB
    isLoaded?: boolean;          // Optional external loading state
}

const libraries: ("places" | "visualization")[] = ["places", "visualization"];

const AdminMap = ({
    type,
    data,
    markers = [],
    fleet = [],
    polylines = [],
    onMarkerClick,
    onMotoboyClick,
    onMapClick, // New prop
    theme = 'dark',
    autoCenter = false,
    center: customCenter, // New prop
    googleMapsApiKey,
    isLoaded: externalIsLoaded // Destructure here
}: AdminMapProps & { onMapClick?: (e: google.maps.MapMouseEvent) => void, center?: { lat: number; lng: number } }) => {
    const { isLoaded: internalIsLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: libraries
    });

    const isLoaded = externalIsLoaded !== undefined ? externalIsLoaded : internalIsLoaded;

    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

    // 2.0: Melhores Bounds
    useEffect(() => {
        if (!mapInstance || !autoCenter || !(window as any).google) return;

        const google = (window as any).google;
        const bounds = new google.maps.LatLngBounds();
        let hasContent = false;

        // Adicionar motoboys
        if (fleet.length > 0) {
            fleet.forEach(mob => {
                if (mob.lat && mob.lng) {
                    bounds.extend({ lat: mob.lat, lng: mob.lng });
                    hasContent = true;
                }
            });
        }

        // Adicionar marcadores
        if (markers.length > 0) {
            markers.forEach(m => {
                if (m.lat && m.lng) {
                    bounds.extend({ lat: m.lat, lng: m.lng });
                    hasContent = true;
                }
            });
        }

        if (hasContent) {
            mapInstance.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });

            // Adjust zoom if too close (e.g. single point)
            const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
                if (mapInstance.getZoom()! > 16) mapInstance.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }
    }, [mapInstance, autoCenter, fleet, markers]);

    const heatmapData = useMemo(() => {
        if (!isLoaded || !data || type !== 'heatmap') return [];
        return data.map(point => {
            const google = (window as any).google;
            const latLng = new google.maps.LatLng(point.lat, point.lng);
            return point.weight ? { location: latLng, weight: point.weight } : latLng;
        }) as any;
    }, [data, type, isLoaded]);

    const mapOptions = useMemo(() => ({
        styles: theme === 'dark' ? darkMapStyle : [],
        disableDefaultUI: true,
        zoomControl: true,
    }), [theme]);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMapInstance(map);
    }, []);

    if (!isLoaded) return (
        <div className="w-full h-full bg-[#0a0f0d] animate-pulse rounded-[32px] flex items-center justify-center">
            <p className="text-primary font-black italic text-xs uppercase tracking-widest">Carregando Mapa...</p>
        </div>
    );

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={customCenter || center} // Use custom center if provided
            zoom={12}
            options={mapOptions}
            onLoad={onLoad}
            onClick={onMapClick} // Handle map clicks
        >
            {type === 'heatmap' && heatmapData.length > 0 && (
                <HeatmapLayer
                    data={heatmapData}
                    options={{
                        radius: 30,
                        opacity: 0.8,
                        gradient: [
                            'rgba(0, 255, 255, 0)',
                            'rgba(0, 255, 255, 1)',
                            'rgba(0, 191, 255, 1)',
                            'rgba(0, 127, 255, 1)',
                            'rgba(0, 63, 255, 1)',
                            'rgba(0, 0, 255, 1)',
                            'rgba(0, 0, 223, 1)',
                            'rgba(0, 0, 191, 1)',
                            'rgba(0, 0, 159, 1)',
                            'rgba(0, 0, 127, 1)',
                            'rgba(63, 0, 91, 1)',
                            'rgba(127, 0, 63, 1)',
                            'rgba(191, 0, 31, 1)',
                            'rgba(255, 0, 0, 1)'
                        ]
                    }}
                />
            )}

            {/* Polylines (Rotas) */}
            {polylines.map((p, i) => (
                <Polyline
                    key={i}
                    path={p.path}
                    options={{
                        strokeColor: p.color || "#13ec6d",
                        strokeOpacity: 0.9,
                        strokeWeight: 6,
                        geodesic: true,
                        zIndex: 100
                    }}
                />
            ))}

            {/* Marcadores Estáticos (Farmácias e Pedidos) */}
            {markers.map(m => (
                <Marker
                    key={m.id}
                    position={{ lat: m.lat, lng: m.lng }}
                    onClick={() => onMarkerClick?.(m.id, m.type, m.orderId)}
                    icon={{
                        url: m.type === 'pharmacy'
                            ? 'https://img.icons8.com/3d-fluency/94/pharmacy-shop.png'
                            : m.type === 'user'
                                ? 'https://img.icons8.com/3d-fluency/94/home-address.png'
                                : 'https://img.icons8.com/3d-fluency/94/pill.png',
                        scaledSize: (window as any).google?.maps?.Size
                            ? new (window as any).google.maps.Size(32, 32)
                            : undefined
                    }}
                />
            ))}

            {/* Frota Móvel (Simulador/Real-time) com Interpolação Suave */}
            {fleet.map(mob => (
                <SmoothedMarker
                    key={mob.id}
                    mob={mob}
                    onClick={() => mob.currentOrderId && onMotoboyClick?.(mob.currentOrderId)}
                />
            ))}
        </GoogleMap>
    );
};

// Componente interno para gerenciar a suavização de um único motoboy
const SmoothedMarker = ({ mob, onClick }: { mob: any, onClick: () => void }) => {
    const [pos, setPos] = useState({ lat: mob.lat, lng: mob.lng });
    const targetPos = useRef({ lat: mob.lat, lng: mob.lng });
    const requestRef = useRef<number>(null as any);

    useEffect(() => {
        targetPos.current = { lat: mob.lat, lng: mob.lng };
    }, [mob.lat, mob.lng]);

    const animate = useCallback(() => {
        let reached = false;

        setPos(current => {
            const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;
            const newLat = lerp(current.lat, targetPos.current.lat, 0.1);
            const newLng = lerp(current.lng, targetPos.current.lng, 0.1);

            if (Math.abs(newLat - targetPos.current.lat) < 0.00001 && Math.abs(newLng - targetPos.current.lng) < 0.00001) {
                reached = true;
                return targetPos.current;
            }

            return { lat: newLat, lng: newLng };
        });

        if (!reached) {
            requestRef.current = requestAnimationFrame(animate);
        }
    }, []);

    useEffect(() => {
        // Start or restart animation when target moves
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [mob.lat, mob.lng, animate]);

    return (
        <Marker
            position={pos}
            onClick={onClick}
            icon={{
                url: 'https://img.icons8.com/3d-fluency/94/motorcycle.png',
                scaledSize: (window as any).google?.maps?.Size
                    ? new (window as any).google.maps.Size(42, 42)
                    : undefined,
                anchor: (window as any).google?.maps?.Point
                    ? new (window as any).google.maps.Point(21, 21)
                    : undefined
            }}
            zIndex={200}
            options={{ optimized: false }}
        />
    );
};

export default AdminMap;
