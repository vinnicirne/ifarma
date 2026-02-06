import { useNavigate, Link, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

// Componente para centralizar o mapa na localização
function MapUpdater({ center, zoom = 15 }: { center: [number, number], zoom?: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, map, zoom]);
    return null;
}

// Utilitário para decodificar Polyline (OSRM/Google)
const decodePolyline = (encoded: string) => {
    const points: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
};

// Ícone customizado para o motoboy (Seta de Navegação)
const motoboyIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#13ec6d" stroke="#102218" stroke-width="2">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Ícone customizado para o destino
const destinationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff4444" stroke="#ffffff" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40]
});

const MotoboyRouteStatus = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [mapState, setMapState] = useState<{ center: [number, number], zoom: number }>({
        center: [-22.9068, -43.1729], // Default Rio
        zoom: 15
    });

    // 1. Obter usuário e seu último local conhecido
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                // Buscar último local no perfil para não começar no centro do Rio
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('last_lat, last_lng')
                    .eq('id', user.id)
                    .single();

                if (profile?.last_lat && profile?.last_lng) {
                    setCoords({ lat: profile.last_lat, lng: profile.last_lng });
                    setMapState(prev => ({ ...prev, center: [profile.last_lat, profile.last_lng] }));
                }
            }
        };
        init();
    }, []);

    // Hook de Geolocalização (Atualiza DB e Local)
    const { latitude, longitude, error: gpsError } = useGeolocation(userId, !!orderId, orderId || null);

    // Sincronizar coordenadas locais em tempo real
    useEffect(() => {
        if (latitude && longitude) {
            setCoords({ lat: latitude, lng: longitude });
            // Se for o primeiro sinal real, centraliza
            if (!coords) {
                setMapState(prev => ({ ...prev, center: [latitude, longitude] }));
            }
        }
    }, [latitude, longitude]);

    // Buscar dados do pedido
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, pharmacies(name, address, latitude, longitude)')
                    .eq('id', orderId)
                    .single();

                if (error) throw error;
                setOrder(data);

                // Se não temos localização do motoboy ainda, foca na farmácia
                if (!coords && data.pharmacies) {
                    setMapState(prev => ({
                        ...prev,
                        center: [data.pharmacies.latitude, data.pharmacies.longitude]
                    }));
                }
            } catch (error) {
                console.error('Erro ao buscar pedido:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    // Buscar Rota (OSRM)
    useEffect(() => {
        const fetchRouteOSRM = async () => {
            const destLat = order?.latitude || order?.delivery_lat;
            const destLng = order?.longitude || order?.delivery_lng;

            if (latitude && longitude && destLat && destLng) {
                try {
                    const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destLng},${destLat}?overview=full&geometries=polyline`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.code === 'Ok' && data.routes.length > 0) {
                        const points = decodePolyline(data.routes[0].geometry);
                        setRoutePath(points);
                    }
                } catch (err) {
                    console.error("Erro ao buscar rota OSRM:", err);
                }
            }
        };

        if (order) fetchRouteOSRM();
    }, [latitude, longitude, order?.id]);

    const handleHorn = async () => {
        if (!orderId || !userId) return;
        try {
            await supabase.from('order_messages').insert({
                order_id: orderId,
                sender_id: userId,
                content: '🛵 BIIIIIP! O entregador chegou na sua porta!',
                message_type: 'horn'
            });
            alert('Buzina enviada ao cliente!');
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="bg-[#102218] text-white min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin size-12 border-4 border-[#13ec6d] border-t-transparent rounded-full"></div>
                    <p className="text-sm font-bold text-white/60 uppercase tracking-widest">Carregando Rota...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="bg-[#102218] text-white min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <MaterialIcon name="error" className="text-6xl text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter italic">Pedido não encontrado</h2>
                    <button onClick={() => navigate(-1)} className="mt-4 bg-[#13ec6d] text-[#102218] px-8 py-3 rounded-xl font-black uppercase">Voltar</button>
                </div>
            </div>
        );
    }

    const routeTheme = {
        '--route-primary': '#13ec6d',
        '--route-bg-dark': '#102218',
        '--route-card-bg': '#193324',
        '--route-text-light': '#92c9a9',
    } as React.CSSProperties;

    const center: [number, number] = coords ? [coords.lat, coords.lng] : mapState.center;
    const destination: [number, number] | null = (order.latitude || order.delivery_lat) && (order.longitude || order.delivery_lng)
        ? [order.latitude || order.delivery_lat, order.longitude || order.delivery_lng]
        : null;

    return (
        <div className="bg-[#102218] text-white min-h-screen flex flex-col font-display" style={routeTheme}>
            {/* TopAppBar Premium */}
            <header className="sticky top-0 z-[1001] bg-[#102218]/90 backdrop-blur-lg border-b border-white/5">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
                    <button onClick={() => navigate(-1)} className="text-white flex size-12 items-center justify-center bg-white/5 rounded-2xl active:scale-90 transition-transform">
                        <MaterialIcon name="arrow_back_ios" className="ml-2" />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-[#13ec6d] uppercase tracking-[0.2em] mb-0.5">Em Entrega</p>
                        <h2 className="text-white text-lg font-black italic uppercase tracking-tighter leading-none">#{orderId?.substring(0, 8)}</h2>
                    </div>
                    <button onClick={() => navigate(`/chat/${orderId}`)} className="text-white flex size-12 items-center justify-center bg-[#13ec6d]/10 text-[#13ec6d] rounded-2xl active:scale-90 transition-transform">
                        <MaterialIcon name="chat" />
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col max-w-lg mx-auto w-full relative">
                {/* Map Section - Full Height Background Effect */}
                <div className="absolute inset-0 z-0">
                    <MapContainer
                        center={mapState.center}
                        zoom={mapState.zoom}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; CARTO'
                        />
                        {coords && (
                            <>
                                <MapUpdater center={[coords.lat, coords.lng]} />
                                <Marker position={[coords.lat, coords.lng]} icon={motoboyIcon} />
                            </>
                        )}
                        {!coords && order?.pharmacies && (
                            <Marker position={[order.pharmacies.latitude, order.pharmacies.longitude]} />
                        )}
                        {destination && (
                            <Marker position={destination} icon={destinationIcon} />
                        )}
                        {routePath.length > 0 && (
                            <Polyline
                                positions={routePath}
                                color="#13ec6d"
                                weight={5}
                                opacity={0.8}
                                lineJoin="round"
                            />
                        )}
                    </MapContainer>
                </div>

                {/* Overlays */}
                <div className="relative z-10 flex flex-col h-full pointer-events-none">
                    {/* Status Indicators */}
                    <div className="p-4 flex justify-between items-start pt-6">
                        <div className="bg-[#102218]/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="size-2 rounded-full bg-[#13ec6d] animate-pulse"></div>
                                <p className="text-[10px] font-black text-[#92c9a9] uppercase tracking-widest">Sinal GPS</p>
                            </div>
                            <p className="text-white font-black text-sm uppercase italic tracking-tighter">Ativo e Rastreando</p>
                        </div>

                        <button
                            onClick={handleHorn}
                            className="bg-yellow-400 text-black p-4 rounded-2xl border-4 border-black/10 shadow-2xl pointer-events-auto active:scale-95 transition-transform"
                        >
                            <MaterialIcon name="notifications_active" className="font-black" />
                        </button>
                    </div>

                    <div className="mt-auto p-4 space-y-4 pointer-events-auto">
                        {/* Info Card */}
                        <div className="bg-[#102218]/90 backdrop-blur-xl rounded-[32px] p-6 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-[#92c9a9] uppercase tracking-[0.2em] mb-1">Destino Final</p>
                                    <h4 className="text-white text-xl font-black italic uppercase leading-tight tracking-tighter">{order.customer_name || 'Cliente'}</h4>
                                </div>
                                <div className="size-12 bg-[#13ec6d]/20 rounded-2xl flex items-center justify-center border border-[#13ec6d]/30">
                                    <MaterialIcon name="person" className="text-[#13ec6d] text-2xl" />
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                <MaterialIcon name="location_on" className="text-[#13ec6d] mt-0.5" />
                                <p className="text-sm font-bold text-white/80 leading-relaxed">{order.address}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        const phone = order.phone || order.profiles?.phone;
                                        if (phone) window.location.href = `tel:${phone}`;
                                    }}
                                    className="flex items-center justify-center gap-2 bg-white/10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-colors"
                                >
                                    <MaterialIcon name="call" className="text-sm" />
                                    Ligar
                                </button>
                                <button
                                    onClick={() => {
                                        const destLat = order.latitude || order.delivery_lat;
                                        const destLng = order.longitude || order.delivery_lng;
                                        const url = Capacitor.isNativePlatform()
                                            ? `geo:${destLat},${destLng}?q=${destLat},${destLng}`
                                            : `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="flex items-center justify-center gap-2 bg-white/10 h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-colors"
                                >
                                    <MaterialIcon name="explore" className="text-sm" />
                                    Abrir GPS
                                </button>
                            </div>
                        </div>

                        {/* Complete Action */}
                        <Link
                            to={`/motoboy-confirm/${orderId}`}
                            className="w-full bg-[#13ec6d] text-[#102218] h-20 rounded-[32px] flex items-center justify-center gap-4 shadow-[0_15px_30px_rgba(19,236,109,0.3)] active:scale-[0.98] transition-all"
                        >
                            <span className="text-lg font-black uppercase italic tracking-tighter">Cheguei ao Local</span>
                            <div className="bg-black/10 size-10 rounded-xl flex items-center justify-center">
                                <MaterialIcon name="check_circle" className="font-bold" />
                            </div>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MotoboyRouteStatus;
