import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import AdminMap from '../../components/admin/AdminMap';
import { OrderCancellationModal } from '../../components/OrderCancellationModal';
import { useNotifications } from '../../hooks/useNotifications';

export const UserOrderTracking = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [motoboy, setMotoboy] = useState<{ id: string, lat: number, lng: number, name?: string } | null>(null);
    const [googleKey, setGoogleKey] = useState<string | null>(null);
    const [realTimeRoute, setRealTimeRoute] = useState<{ distance: string, duration: string } | null>(null);
    const [routePath, setRoutePath] = useState<{ lat: number, lng: number }[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    const { unreadCount: notificationCount } = useNotifications(userId);

    // Decoding Google Polyline
    const decodePolyline = (encoded: string) => {
        const points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            shift = 0; result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            points.push({ lat: lat / 1e5, lng: lng / 1e5 });
        }
        return points;
    };

    const calculateBearing = (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        const lat1 = start.lat * Math.PI / 180;
        const lon1 = start.lng * Math.PI / 180;
        const lat2 = end.lat * Math.PI / 180;
        const lon2 = end.lng * Math.PI / 180;
        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };

    const hasNotifiedProximity = useRef(false);
    const notifyProximity = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (hasNotifiedProximity.current || !order || !session) return;
        hasNotifiedProximity.current = true;
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
        audio.play().catch(e => console.warn("Audio play blocked:", e));
        await supabase.from('notifications').insert({
            user_id: session.user.id,
            title: '🛵 Seu pedido está chegando!',
            message: 'O entregador está a menos de 1km de distância. Prepare-se!',
            type: 'order',
            is_read: false
        });
    };

    const fetchGoogleKey = async () => {
        const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (envKey) { setGoogleKey(envKey); return; }
        const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'google_maps_api_key').single();
        if (settings?.value) setGoogleKey(settings.value);
    };

    const fetchRoute = async (mbLat: number, mbLng: number) => {
        if (!order || typeof google === 'undefined') return;

        let dLat = order.latitude;
        let dLng = order.longitude;

        if (!dLat || !dLng) {
            dLat = order.profiles?.last_lat || order.profiles?.latitude;
            dLng = order.profiles?.last_lng || order.profiles?.longitude;
        }

        if (!dLat || !dLng) {
            const address = order.address || order.delivery_address;
            if (address) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        const loc = results[0].geometry.location;
                        executeRouteFetch(mbLat, mbLng, loc.lat(), loc.lng());
                    }
                });
                return;
            }
        }

        if (dLat && dLng) executeRouteFetch(mbLat, mbLng, dLat, dLng);
    };

    const executeRouteFetch = (startLat: number, startLng: number, destLat: number, destLng: number) => {
        if (typeof google === 'undefined') return;
        try {
            const service = new google.maps.DirectionsService();
            service.route({
                origin: { lat: startLat, lng: startLng },
                destination: { lat: destLat, lng: destLng },
                travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === 'OK' && result) {
                    const path = result.routes[0].overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
                    setRoutePath(path);
                    const leg = result.routes[0].legs[0];
                    if (leg) {
                        setRealTimeRoute({
                            distance: leg.distance?.text || '',
                            duration: leg.duration?.text || ''
                        });
                        if (leg.distance && leg.distance.value < 1000) notifyProximity();
                    }
                }
            });
        } catch (e) { console.error("Error DirectionsService:", e); }
    };

    const fetchOsrmEta = async (sLat: number, sLng: number, dLat: number, dLng: number) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${dLng},${dLat}?overview=false`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes?.length > 0) {
                setRealTimeRoute({
                    distance: `${(data.routes[0].distance / 1000).toFixed(1)} km`,
                    duration: `${Math.ceil(data.routes[0].duration / 60)} min`
                });
            }
        } catch (err) { console.warn("OSRM ETA Error:", err); }
    };

    const updateRealTimeETA = async (mbLat: number, mbLng: number) => {
        if (!order) return;

        // PRIORIDADE: Rota Cacheada no Banco (Economia de API)
        if (order.route_polyline) {
            console.log("📍 Usando rota cacheada do servidor...");
            const decodedPath = decodePolyline(order.route_polyline);
            setRoutePath(decodedPath);
            setRealTimeRoute({
                distance: order.route_distance_text || '',
                duration: order.route_duration_text || ''
            });
            return;
        }

        const dLat = order.latitude || order.profiles?.last_lat || order.pharmacies?.latitude;
        const dLng = order.longitude || order.profiles?.last_lng || order.pharmacies?.longitude;
        if (!dLat || !dLng) return;
        if (googleKey) fetchRoute(mbLat, mbLng);
        else fetchOsrmEta(mbLat, mbLng, dLat, dLng);
    };

    const calculateETA = () => {
        if (order?.status === 'entregue') return 'Entregue';
        if (order?.status === 'cancelado') return 'Cancelado';
        if (realTimeRoute) return realTimeRoute.duration;
        if (!motoboy && !order?.motoboy_id) return 'Aguardando entregador...';
        if (order?.status === 'em_rota') return 'A caminho...';
        return 'Calculando...';
    };

    useEffect(() => {
        if (motoboy && googleKey && order) updateRealTimeETA(motoboy.lat, motoboy.lng);
    }, [motoboy?.lat, motoboy?.lng, googleKey, order?.id]);

    useEffect(() => {
        if (!orderId) return;
        fetchGoogleKey();

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });

        const hasBuzzered = { current: false };

        const fetchOrder = async () => {
            const { data, error } = await supabase.from('orders').select('*, pharmacies(*), order_items(*, products(*)), profiles:customer_id(*)').eq('id', orderId).maybeSingle();
            if (error || !data) { setError("Pedido não encontrado."); return; }
            setOrder(data);

            // Carregar rota cacheada se existir
            if (data.route_polyline) {
                const path = decodePolyline(data.route_polyline);
                setRoutePath(path);
                setRealTimeRoute({
                    distance: data.route_distance_text || '',
                    duration: data.route_duration_text || ''
                });
            }

            if (data.order_items) {
                setItems(data.order_items.map((it: any) => ({
                    name: it.products?.name || 'Produto',
                    qty: `${it.quantity}x`,
                    price: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.price * it.quantity),
                    icon: 'medication'
                })));
            }
            if (data.motoboy_id) {
                const { data: mbData } = await supabase.from('profiles').select('id, last_lat, last_lng').eq('id', data.motoboy_id).single();
                if (mbData?.last_lat) setMotoboy({ id: mbData.id, lat: mbData.last_lat, lng: mbData.last_lng });
            }
        };

        fetchOrder();

        const orderSub = supabase.channel(`order_tracking_${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
                const newArrived = payload.new.motoboy_arrived_at;
                const oldArrived = order?.motoboy_arrived_at;
                setOrder(prev => ({ ...prev, ...payload.new }));

                // Atualizar rota se o cache mudar (ex: recaptulado pelo motoboy)
                if (payload.new.route_polyline) {
                    const path = decodePolyline(payload.new.route_polyline);
                    setRoutePath(path);
                    setRealTimeRoute({
                        distance: payload.new.route_distance_text || '',
                        duration: payload.new.route_duration_text || ''
                    });
                }

                if (newArrived && !oldArrived && !hasBuzzered.current) {
                    hasBuzzered.current = true;
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
                    audio.play().catch(() => window.addEventListener('click', () => audio.play(), { once: true }));
                }
            })
            .subscribe();

        // Chat Realtime Badge
        const chatSub = supabase.channel(`chat_tracking_${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${orderId}`
            }, async (payload) => {
                const { data: { session } } = await supabase.auth.getSession();
                if (payload.new.sender_id !== session?.user?.id) {
                    setUnreadChatCount(prev => prev + 1);
                    // Som de notificação
                    const chimeSound = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
                    new Audio(chimeSound).play().catch(() => { });
                }
            })
            .subscribe();

        // Subscribe to motoboy location updates
        let motoboySub: any = null;
        if (order?.motoboy_id) {
            motoboySub = supabase.channel(`motoboy_loc_${orderId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${order.motoboy_id}` }, (payload) => {
                    if (payload.new.last_lat && payload.new.last_lng) {
                        setMotoboy({ id: payload.new.id, lat: payload.new.last_lat, lng: payload.new.last_lng });
                    }
                })
                .subscribe();
        }

        return () => {
            supabase.removeChannel(orderSub);
            supabase.removeChannel(chatSub);
            if (motoboySub) supabase.removeChannel(motoboySub);
        };
    }, [orderId, order?.motoboy_id]);

    // Listen for chat_opened event to reset unread count
    useEffect(() => {
        const handleChatOpened = (e: CustomEvent) => {
            if (e.detail?.orderId === orderId) {
                setUnreadChatCount(0);
            }
        };

        window.addEventListener('chat_opened', handleChatOpened as EventListener);

        return () => {
            window.removeEventListener('chat_opened', handleChatOpened as EventListener);
        };
    }, [orderId]);

    useEffect(() => {
        if (order?.status === 'entregue') {
            const timer = setTimeout(() => navigate('/'), 4000);
            return () => clearTimeout(timer);
        }
    }, [order?.status]);

    if (error) return <div className="p-6 bg-background-dark text-white text-center"><h2>{error}</h2></div>;
    if (!order) return <div className="p-6 bg-background-dark text-white text-center">Carregando...</div>;

    const steps = [
        { status: 'pendente', label: 'Pedido Recebido', icon: 'check' },
        { status: 'preparando', label: 'Em Preparo', icon: 'pill' },
        { status: 'aguardando_motoboy', label: 'Aguardando Entregador', icon: 'person_search' },
        { status: 'retirado', label: 'Pedido Retirado', icon: 'inventory' },
        { status: 'em_rota', label: 'Em rota para seu endereço', icon: 'local_shipping' },
        { status: 'entregue', label: 'Entregue', icon: 'home' }
    ];
    const statusIdxMap: any = {
        'pendente': 0,
        'preparando': 1,
        'aguardando_motoboy': 2,
        'pronto_entrega': 2,
        'aceito': 2,
        'aguardando_retirada': 2,
        'retirado': 3,
        'em_rota': 4,
        'entregue': 5
    };
    const currentStepIndex = statusIdxMap[order.status] ?? -1;

    return (
        <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-white dark:bg-background-dark">
            <header className="p-4 flex items-center justify-between border-b dark:border-gray-800">
                <button onClick={() => navigate(-1)}><MaterialIcon name="arrow_back_ios" /></button>
                <h2 className="font-bold">Acompanhamento</h2>
                <Link to="/notifications" className="relative size-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full">
                    <MaterialIcon name="notifications" />
                    {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-background-dark animate-pulse text-white">
                            {notificationCount}
                        </span>
                    )}
                </Link>
            </header>

            <div className="p-4">
                <div className="aspect-video bg-gray-100 rounded-3xl overflow-hidden mb-4">
                    <AdminMap
                        type="tracking"
                        googleMapsApiKey={googleKey || ""}
                        fleet={motoboy ? [{ id: motoboy.id, lat: motoboy.lat, lng: motoboy.lng, bearing: 0 }] : []}
                        markers={[
                            { id: 'pharmacy', lat: order.pharmacies?.latitude || 0, lng: order.pharmacies?.longitude || 0, type: 'pharmacy' },
                            {
                                id: 'destination',
                                lat: order.latitude || order.profiles?.last_lat || order.profiles?.latitude || order.pharmacies?.latitude || 0,
                                lng: order.longitude || order.profiles?.last_lng || order.profiles?.longitude || order.pharmacies?.longitude || 0,
                                type: 'user'
                            }
                        ]}
                        polylines={[{ path: routePath, color: "#13ec6d" }]}
                        autoCenter={true}
                    />
                </div>

                <div className="bg-primary/10 p-4 rounded-2xl flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-primary">Previsão</p>
                        <p className="text-xl font-bold">{calculateETA()}</p>
                    </div>
                </div>

                <div className="space-y-6 px-4">
                    {steps.map((step, idx) => (
                        <div key={idx} className={`flex gap-4 items-start ${idx > currentStepIndex ? 'opacity-30' : ''}`}>
                            <div className={`mt-1 size-8 rounded-full flex items-center justify-center ${idx <= currentStepIndex ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                                <MaterialIcon name={step.icon} className="text-sm" />
                            </div>
                            <div>
                                <p className="font-bold">{step.label}</p>
                                <p className="text-xs text-gray-500">{idx === currentStepIndex ? 'Status atual' : idx < currentStepIndex ? 'Concluído' : ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="h-32"></div>

            <div className="px-6 py-4 fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex flex-col gap-3 bg-gradient-to-t from-white dark:from-background-dark via-white dark:via-background-dark to-transparent pt-10">
                <div className="relative">
                    <button
                        onClick={() => navigate(`/chat/${orderId}`)}
                        className="w-full bg-primary py-4 rounded-full font-bold shadow-lg transition-transform active:scale-95 text-[#0d1b13]"
                    >
                        Chat com a Farmácia
                    </button>
                    {unreadChatCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-bounce">
                            {unreadChatCount}
                        </div>
                    )}
                </div>

                {/* Cancel Button - Only visible if status is NOT yet removed/en route/delivered/canceled */}
                {['pendente', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'aceito'].includes(order?.status) && (
                    <button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 py-3 rounded-full font-bold text-xs transition-all active:scale-95"
                    >
                        Cancelar Pedido
                    </button>
                )}
            </div>

            {/* Modal de Cancelamento */}
            <OrderCancellationModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                orderId={orderId || ""}
                onSuccess={() => {
                    setIsCancelModalOpen(false);
                    // Refresh data or status will auto-update via realtime
                }}
            />
        </div>
    );
};
