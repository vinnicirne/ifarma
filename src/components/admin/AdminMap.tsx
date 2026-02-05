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
}

const libraries: ("visualization")[] = ["visualization"];

const AdminMap = ({
    type,
    data,
    markers = [],
    fleet = [],
    polylines = [],
    onMarkerClick,
    onMotoboyClick,
    theme = 'dark', // Default to dark mainly for admin dashboard
    autoCenter = false,
    googleMapsApiKey
}: AdminMapProps) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: libraries
    });

    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

    // Auto-center logic
    useEffect(() => {
        if (!mapInstance || !autoCenter) return;

        // Prioritize centering on the first fleet item (motoboy)
        if (fleet.length > 0) {
            const mob = fleet[0];
            mapInstance.panTo({ lat: mob.lat, lng: mob.lng });
        }
        // Fallback: Center on first marker if no fleet
        else if (markers.length > 0) {
            mapInstance.panTo({ lat: markers[0].lat, lng: markers[0].lng });
        }
    }, [mapInstance, autoCenter, fleet, markers]);

    const heatmapData = useMemo(() => {
        if (!isLoaded || !data || type !== 'heatmap') return [];
        return data.map(point => {
            const latLng = new google.maps.LatLng(point.lat, point.lng);
            return point.weight ? { location: latLng, weight: point.weight } : latLng;
        }) as any;
    }, [data, type, isLoaded]);

    const mapOptions = useMemo(() => ({
        styles: theme === 'dark' ? darkMapStyle : [], // Use empty array for default Google Maps (Light)
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
            center={center}
            zoom={12}
            options={mapOptions}
            onLoad={onLoad}
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
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        geodesic: true
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
                            ? 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'
                            : m.type === 'user'
                                ? 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'
                                : 'https://cdn-icons-png.flaticon.com/512/1047/1047711.png',
                        scaledSize: new google.maps.Size(30, 30)
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
    const prevPos = useRef({ lat: mob.lat, lng: mob.lng });
    const targetPos = useRef({ lat: mob.lat, lng: mob.lng });
    const requestRef = useRef<number>(null as any);

    useEffect(() => {
        targetPos.current = { lat: mob.lat, lng: mob.lng };
    }, [mob.lat, mob.lng]);

    const animate = useCallback(() => {
        setPos(current => {
            const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;
            const newLat = lerp(current.lat, targetPos.current.lat, 0.1);
            const newLng = lerp(current.lng, targetPos.current.lng, 0.1);

            // Para a animação se estiver muito perto do alvo
            if (Math.abs(newLat - targetPos.current.lat) < 0.00001 && Math.abs(newLng - targetPos.current.lng) < 0.00001) {
                return targetPos.current;
            }

            return { lat: newLat, lng: newLng };
        });
        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    return (
        <Marker
            position={pos}
            onClick={onClick}
            icon={{
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "#13ec6d",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
                rotation: mob.bearing || 0,
            }}
            options={{ optimized: false }}
        />
    );
};

export default AdminMap;
