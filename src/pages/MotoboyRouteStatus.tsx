import { useNavigate, useParams, Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMotoboyMap } from '../hooks/useMotoboyMap';
import { MaterialIcon } from '../components/Shared';

// Same dark mode style as Dashboard for consistency
const darkModeStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

const MotoboyRouteStatus = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // 1. Get User
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });
    }, []);

    // 2. Fetch Order
    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) { setLoading(false); return; }
            const { data, error } = await supabase
                .from('orders')
                .select('*, pharmacies(name, address, latitude, longitude), profiles:customer_id(*)')
                .eq('id', orderId)
                .single();

            if (error) console.error(error);
            setOrder(data);
            setLoading(false);
        };
        fetchOrder();
    }, [orderId]);

    // 3. Geolocation
    const { latitude, longitude } = useGeolocation(userId, true, orderId);

    // 4. Google Maps Hook
    // We treat this page as always in 'delivery' view and 'navigation' mode for the best map experience
    const {
        mapRef,
        mapReady,
        distanceToDest,
        eta,
        mapInstance
    } = useMotoboyMap(
        order,
        latitude,
        longitude,
        'delivery', // Force 'delivery' view to init map
        true,       // Force navigation mode for better bounds/zoom
        darkModeStyle
    );

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

    return (
        <div className="bg-[#102218] text-white min-h-screen flex flex-col font-display relative" style={routeTheme}>
            {/* TopAppBar Enterprise */}
            <header className="sticky top-0 z-[1001] bg-[#102218]/90 backdrop-blur-lg border-b border-white/5 pointer-events-auto">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
                    <button onClick={() => navigate(-1)} className="text-white flex size-12 items-center justify-center bg-white/5 rounded-2xl active:scale-90 transition-transform">
                        <MaterialIcon name="arrow_back_ios" className="ml-2" />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-[#13ec6d] uppercase tracking-[0.2em] mb-0.5">Em Entrega</p>
                        <h2 className="text-white text-lg font-black italic uppercase tracking-tighter leading-none">#{orderId?.substring(0, 8)}</h2>
                    </div>
                    <button onClick={() => navigate(`/motoboy-chat/${orderId}`)} className="text-white flex size-12 items-center justify-center bg-[#13ec6d]/10 text-[#13ec6d] rounded-2xl active:scale-90 transition-transform">
                        <MaterialIcon name="chat" />
                    </button>
                </div>
            </header>

            {/* Map Section - Full Screen */}
            <div className="absolute inset-0 z-0">
                <div ref={mapRef} className="w-full h-full" />
                {!mapReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#102218] z-10">
                        <p className="text-white/50 text-xs font-black uppercase tracking-widest animate-pulse">
                            {latitude ? 'Carregando Mapa...' : 'Aguardando GPS...'}
                        </p>
                    </div>
                )}
            </div>

            {/* Overlays Container (Pointer events fallthrough where possible) */}
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none pt-20">
                {/* Status Indicators */}
                <div className="p-4 flex justify-between items-start">
                    <div className="bg-[#102218]/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`size-2 rounded-full ${latitude ? 'bg-[#13ec6d] animate-pulse' : 'bg-red-500'}`}></div>
                            <p className="text-[10px] font-black text-[#92c9a9] uppercase tracking-widest">{latitude ? 'GPS Ativo' : 'Sem Sinal'}</p>
                        </div>
                        <p className="text-white font-black text-sm uppercase italic tracking-tighter">
                            {eta ? `${eta} até o destino` : 'Calculando rota...'}
                        </p>
                    </div>

                    <button
                        onClick={handleHorn}
                        className="bg-yellow-400 text-black p-4 rounded-2xl border-4 border-black/10 shadow-2xl pointer-events-auto active:scale-95 transition-transform"
                    >
                        <MaterialIcon name="notifications_active" className="font-black" />
                    </button>
                </div>

                <div className="mt-auto p-4 space-y-4 pointer-events-auto bg-gradient-to-t from-[#102218] via-[#102218]/80 to-transparent pb-8">
                    {/* Info Card */}
                    <div className="bg-[#102218]/90 backdrop-blur-xl rounded-[32px] p-6 border border-white/5 shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[10px] font-black text-[#92c9a9] uppercase tracking-[0.2em] mb-1">Destino Final</p>
                                <h4 className="text-white text-xl font-black italic uppercase leading-tight tracking-tighter">
                                    {order.customer_name || order.profiles?.full_name || 'Cliente'}
                                </h4>
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
        </div>
    );
};

export default MotoboyRouteStatus;
