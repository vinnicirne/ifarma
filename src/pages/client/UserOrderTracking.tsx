import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import AdminMap from '../../components/admin/AdminMap';
import { OrderCancellationModal } from '../../components/OrderCancellationModal';

export const UserOrderTracking = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [motoboy, setMotoboy] = useState<{ id: string, lat: number, lng: number, name?: string } | null>(null);
    const [googleKey, setGoogleKey] = useState<string | null>(null);
    const [realTimeRoute, setRealTimeRoute] = useState<{ distance: string, duration: string } | null>(null);
    const [routePath, setRoutePath] = useState<{ lat: number, lng: number }[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Função para decodificar Polyline do Google
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

            shift = 0;
            result = 0;
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

    // Função para calcular o ângulo (bearing) entre dois pontos
    const calculateBearing = (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        const lat1 = start.lat * Math.PI / 180;
        const lon1 = start.lng * Math.PI / 180;
        const lat2 = end.lat * Math.PI / 180;
        const lon2 = end.lng * Math.PI / 180;

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        const θ = Math.atan2(y, x);
        const brng = (θ * 180 / Math.PI + 360) % 360;
        return brng;
    };

    // Função para calcular distância em KM
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const hasNotifiedProximity = useRef(false);

    // Função para enviar notificação de proximidade
    const notifyProximity = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (hasNotifiedProximity.current || !order || !session) return;

        hasNotifiedProximity.current = true;

        // Play horn sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
        audio.play().catch(e => console.warn("Audio play blocked:", e));

        await supabase.from('notifications').insert({
            user_id: session.user.id,
            title: '🛵 Seu pedido está chegando!',
            message: 'O entregador está a menos de 1km de distância. Prepare-se!',
            type: 'order'
        });
    };

    // Função para calcular distância e ETA
    const fetchGoogleKey = async () => {
        const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (envKey) {
            setGoogleKey(envKey);
            return;
        }
        const { data: settings } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'google_maps_api_key')
            .single();

        if (settings?.value) {
            setGoogleKey(settings.value);
        }
    };

    const fetchRoute = async (mbLat: number, mbLng: number) => {
        if (!order || typeof google === 'undefined') return;
        const destLat = order.latitude || order.pharmacies?.latitude;
        const destLng = order.longitude || order.pharmacies?.longitude;
        if (!destLat || !destLng) return;

        try {
            const service = new google.maps.DirectionsService();
            service.route({
                origin: { lat: mbLat, lng: mbLng },
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
                        if (leg.distance && leg.distance.value < 1000) {
                            notifyProximity();
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Error using DirectionsService:", e);
        }
    };

    const fetchOsrmEta = async (startLat: number, startLng: number, destLat: number, destLng: number) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=false`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const durationSeconds = data.routes[0].duration;
                const minutes = Math.ceil(durationSeconds / 60);
                setRealTimeRoute({
                    distance: `${(data.routes[0].distance / 1000).toFixed(1)} km`,
                    duration: `${minutes} min`
                });
            }
        } catch (err) {
            console.warn("OSRM ETA Error:", err);
        }
    };

    const updateRealTimeETA = async (mbLat: number, mbLng: number) => {
        if (!order) return;
        const destLat = order.latitude || order.pharmacies?.latitude;
        const destLng = order.longitude || order.pharmacies?.longitude;
        if (!destLat || !destLng) return;

        if (googleKey) {
            fetchRoute(mbLat, mbLng);
        } else {
            fetchOsrmEta(mbLat, mbLng, destLat, destLng);
        }
    };

    const calculateETA = () => {
        if (order?.status === 'entregue') return 'Entregue';
        if (order?.status === 'cancelado') return 'Cancelado';
        if (realTimeRoute) return realTimeRoute.duration;
        if (!motoboy && !order?.motoboy_id) return 'Aguardando entregador...';
        if (!motoboy || !order?.pharmacies) return 'Calculando...';

        const destLat = order.latitude || order.pharmacies.latitude;
        const destLng = order.longitude || order.pharmacies.longitude;
        if (!destLat || !destLng) return 'Calculando...';

        const R = 6371;
        const dLat = (destLat - motoboy.lat) * Math.PI / 180;
        const dLon = (destLng - motoboy.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(motoboy.lat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        const baseSpeed = 22;
        let trafficFactor = 1.0;
        const hour = new Date().getHours();
        if ((hour >= 17 && hour <= 19) || (hour >= 11 && hour <= 13)) trafficFactor = 0.7;
        const effectiveSpeed = baseSpeed * trafficFactor;
        const travelTime = (distance / effectiveSpeed) * 60;
        let additionalTime = 2;
        if (order.status === 'aguardando_motoboy') additionalTime += 5;
        if (order.status === 'preparando') additionalTime += 10;
        if (order.status === 'pendente') additionalTime += 15;
        const totalMinutes = Math.round(travelTime + additionalTime);
        return `${totalMinutes} min (est.)`;
    };

    useEffect(() => {
        if (motoboy && googleKey && order) {
            updateRealTimeETA(motoboy.lat, motoboy.lng);
        }
    }, [motoboy?.lat, motoboy?.lng, googleKey, order?.id]);

    useEffect(() => {
        if (!orderId) return;
        fetchGoogleKey();

        const hasBuzzered = { current: false };

        const fetchOrder = async () => {
            try {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select('*, pharmacies(*), order_items(*, products(*))')
                    .eq('id', orderId)
                    .maybeSingle();

                if (supabaseError) throw supabaseError;
                if (!data) {
                    setError("Pedido não encontrado ou ID inválido.");
                    return;
                }

                setOrder(data);
                if (data.order_items) {
                    const mappedItems = data.order_items.map((it: any) => ({
                        name: it.products?.name || it.product_name || 'Produto',
                        qty: `${it.quantity}x`,
                        price: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((it.price || it.unit_price || 0) * it.quantity),
                        icon: 'medication'
                    }));
                    setItems(mappedItems);
                }

                if (data.motoboy_id) {
                    const { data: mbData } = await supabase
                        .from('profiles')
                        .select('id, last_lat, last_lng')
                        .eq('id', data.motoboy_id)
                        .single();

                    if (mbData && mbData.last_lat && mbData.last_lng) {
                        setMotoboy({ id: mbData.id, lat: mbData.last_lat, lng: mbData.last_lng });
                    }
                }
            } catch (err: any) {
                console.error("Error fetching order:", err);
                setError("Erro ao carregar pedido. Verifique sua conexão.");
            }
        };

        fetchOrder();

        const orderSubscription = supabase
            .channel(`order_tracking_${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
                const newArrived = payload.new.motoboy_arrived_at;
                const oldArrived = order?.motoboy_arrived_at;
                setOrder(prev => ({ ...prev, ...payload.new }));

                if (newArrived && !oldArrived && !hasBuzzered.current) {
                    hasBuzzered.current = true;
                    console.log("📢 Motoboy chegou! Disparando buzina...");
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
                    audio.volume = 1.0;
                    audio.play().catch(e => {
                        console.warn("Erro ao tocar buzina de chegada:", e);
                        window.addEventListener('click', () => audio.play(), { once: true });
                    });
                }
            }).subscribe();

        const messageSubscription = supabase
            .channel(`order_messages_${orderId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` }, async (payload) => {
                const { data: { session } } = await supabase.auth.getSession();
                if (payload.new.message_type === 'horn') {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
                    audio.volume = 1.0;
                    audio.play().catch(e => {
                        console.warn("Erro ao tocar buzina (bloqueado):", e);
                        window.addEventListener('click', () => audio.play(), { once: true });
                    });
                }
                if (payload.new.sender_id !== session?.user.id) {
                    setUnreadCount(prev => prev + 1);
                }
            }).subscribe();

        let motoboySubscription: any = null;
        if (order?.motoboy_id) {
            motoboySubscription = supabase
                .channel(`motoboy_loc_${orderId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${order.motoboy_id}` }, (payload) => {
                    const newLoc = { id: payload.new.id, lat: payload.new.last_lat, lng: payload.new.last_lng };
                    setMotoboy(newLoc);
                    if (googleKey) updateRealTimeETA(newLoc.lat, newLoc.lng);
                }).subscribe();
        }

        return () => {
            orderSubscription.unsubscribe();
            messageSubscription.unsubscribe();
            if (motoboySubscription) motoboySubscription.unsubscribe();
        };
    }, [orderId, order?.motoboy_id, googleKey]);

    useEffect(() => {
        if (order?.status === 'entregue') {
            const timer = setTimeout(() => navigate('/'), 4000);
            return () => clearTimeout(timer);
        }
    }, [order?.status, navigate]);

    if (error) return (
        <div className="flex h-screen flex-col items-center justify-center p-6 bg-background-dark text-white text-center">
            <MaterialIcon name="error_outline" className="text-6xl text-red-500 mb-4" />
            <h2 className="text-xl font-black mb-2">{error}</h2>
            <button onClick={() => navigate('/')} className="mt-4 bg-primary text-black px-6 py-2 rounded-full font-bold">Voltar ao Início</button>
        </div>
    );

    if (!order) return (
        <div className="flex h-screen flex-col items-center justify-center bg-background-dark text-white">
            <div className="relative">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <MaterialIcon name="local_shipping" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
            </div>
            <p className="mt-4 font-black tracking-widest uppercase text-xs animate-pulse">Buscando seu pedido...</p>
        </div>
    );

    const steps = [
        {
            status: 'pendente',
            label: order.status === 'cancelado' ? 'Pedido Cancelado' : (order.status === 'pendente' ? 'Aguardando Confirmação' : 'Pedido Aceito'),
            sub: order.status === 'cancelado' ? 'Este pedido foi cancelado pela loja' : (order.status === 'pendente' ? 'Aguardando a loja aceitar...' : `Confirmado às ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
            icon: order.status === 'cancelado' ? 'cancel' : (order.status === 'pendente' ? 'hourglass_top' : 'check')
        },
        { status: 'preparando', label: 'Preparando seu pedido', sub: 'Em andamento', icon: 'pill' },
        { status: 'aguardando_motoboy', label: 'Aguardando entregador', sub: order.motoboy_id ? 'Entregador à caminho da farmácia' : 'Procurando entregador...', icon: 'person_search' },
        { status: 'retirado', label: 'Pedido retirado', sub: 'O entregador já está com seu pedido', icon: 'inventory' },
        { status: 'em_rota', label: 'Em rota de entrega', sub: 'O entregador está a caminho do seu endereço', icon: 'local_shipping' },
        { status: 'entregue', label: 'Entregue', sub: 'Pedido finalizado', icon: 'home' }
    ];

    let currentStepIndex = 0;
    const statusIdxMap: any = { 'pendente': 0, 'preparando': 1, 'aguardando_motoboy': 2, 'pronto_entrega': 2, 'retirado': 3, 'em_rota': 4, 'entregue': 5, 'cancelado': 0 };
    currentStepIndex = statusIdxMap[order.status] || 0;

    return (
        <div className="relative mx-auto flex h-auto min-h-screen max-w-[480px] flex-col overflow-x-hidden shadow-2xl bg-white dark:bg-background-dark pb-10">
            <header className="sticky top-0 z-20 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between">
                <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                    <MaterialIcon name="arrow_back_ios" className="ml-2" />
                </button>
                <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12 font-sans">Acompanhamento</h2>
            </header>

            <div className="px-4 py-3">
                <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-zinc-800 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    {order && (order.latitude || order.pharmacies?.latitude) ? (
                        <AdminMap
                            type="tracking"
                            googleMapsApiKey={googleKey || ""}
                            fleet={motoboy ? [{ id: motoboy.id, lat: motoboy.lat, lng: motoboy.lng, bearing: calculateBearing(motoboy, { lat: order.latitude || order.pharmacies?.latitude || 0, lng: order.longitude || order.pharmacies?.longitude || 0 }) }] : []}
                            markers={[
                                { id: order.pharmacies?.id || 'pharmacy', lat: order.pharmacies?.latitude || 0, lng: order.pharmacies?.longitude || 0, type: 'pharmacy' },
                                { id: 'destination', lat: order.latitude || order.pharmacies?.latitude || 0, lng: order.longitude || order.pharmacies?.longitude || 0, type: 'user' }
                            ]}
                            polylines={[{ path: routePath.length > 0 ? routePath : (motoboy ? [{ lat: motoboy.lat, lng: motoboy.lng }, { lat: order.latitude || order.pharmacies.latitude, lng: order.longitude || order.pharmacies.longitude }] : []), color: "#13ec6d" }]}
                            theme="light"
                            autoCenter={true}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <MaterialIcon name="pending_actions" className="text-4xl text-primary/20" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aguardando Motoboy</p>
                        </div>
                    )}
                    {order.status !== 'cancelado' && (
                        <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl p-4 shadow-lg flex items-center justify-between border-l-4 border-primary border border-white/20 z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/20 p-2.5 rounded-2xl shadow-inner"><MaterialIcon name="moped" className="text-primary" /></div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Chegada estimada</p>
                                    <p className="text-lg font-black leading-tight">{calculateETA()}</p>
                                </div>
                            </div>
                            <MaterialIcon name="info" className="text-gray-300" />
                        </div>
                    )}
                </div>
            </div>

            {order.status === 'cancelado' && (
                <div className="px-6 py-2">
                    <div className="bg-red-500 text-white p-5 rounded-3xl flex items-start gap-4 shadow-xl shadow-red-500/20 border border-red-400">
                        <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 mt-1">
                            <MaterialIcon name="block" className="text-2xl" />
                        </div>
                        <div>
                            <p className="font-black italic text-xl leading-tight uppercase tracking-tighter">Pedido Cancelado</p>
                            <p className="text-sm font-bold opacity-90 mt-1">
                                Motivo: {order.cancellation_reason || 'Não informado'}
                            </p>
                            <p className="text-[10px] font-medium opacity-70 uppercase tracking-widest mt-2">
                                Entre em contato com a loja via chat para mais detalhes.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {order.motoboy_arrived_at && order.status !== 'cancelado' && (
                <div className="px-6 py-2">
                    <div className="bg-green-500 text-white p-4 rounded-3xl flex items-center gap-4 animate-bounce shadow-lg shadow-green-500/20">
                        <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center"><MaterialIcon name="notifications_active" className="text-2xl" /></div>
                        <div>
                            <p className="font-black italic text-lg leading-tight uppercase">O entregador chegou!</p>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Ele está na sua porta agora</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h3 className="text-[#0d1b13] dark:text-white text-xl font-black leading-tight tracking-[-0.015em]">Status do Pedido</h3>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ring-1 ring-primary/5">Pedido #{orderId?.substring(0, 8)}</span>
            </div>

            <div className="grid grid-cols-[48px_1fr] gap-x-2 px-8 py-4">
                {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;
                    const isPending = index > currentStepIndex;
                    return (
                        <React.Fragment key={index}>
                            <div className="flex flex-col items-center gap-1">
                                <div className={`rounded-full p-2 shadow-sm z-10 ${isActive ? 'bg-primary ring-8 ring-primary/10 scale-110 text-slate-900' : isCompleted ? 'bg-primary text-slate-900' : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 grayscale opacity-50'}`}>
                                    <MaterialIcon name={step.icon} className="text-[18px]" fill={isActive} />
                                </div>
                                {index < steps.length - 1 && <div className={`w-[3px] h-12 ${isCompleted ? 'bg-primary opacity-50' : 'bg-gray-100 dark:bg-zinc-800'}`}></div>}
                            </div>
                            <div className="flex flex-1 flex-col pb-8">
                                <p className={`text-base font-black leading-normal italic ${isPending ? 'text-gray-400 dark:text-gray-600 opacity-60' : 'text-[#0d1b13] dark:text-white'}`}>{step.label}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isActive ? 'text-primary pulse' : 'text-gray-400 opacity-80'}`}>{isActive ? step.sub : isCompleted ? 'Concluído' : 'Pendente'}</p>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="flex flex-col gap-3 px-6 py-4">
                <button
                    onClick={() => { setUnreadCount(0); navigate(`/chat/${orderId}`); }}
                    className="relative flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[28px] h-14 px-5 bg-primary text-slate-900 gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98] uppercase tracking-tighter ring-1 ring-primary/5"
                >
                    <MaterialIcon name="chat" className="text-2xl font-bold" fill />
                    <span className="truncate text-base font-black leading-normal">Chat com a Farmácia</span>
                    {unreadCount > 0 && <div className="absolute right-6 top-3 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg ring-2 ring-white dark:ring-zinc-900">{unreadCount}</div>}
                </button>

                {/* Botão Cancelar Pedido (Apenas se não saiu para entrega) */}
                {['pendente', 'preparando', 'aguardando_motoboy', 'pronto_entrega'].includes(order.status) && (
                    <button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full py-4 text-xs font-black text-red-500 hover:bg-red-500/5 rounded-[28px] transition-colors uppercase tracking-[0.2em]"
                    >
                        Cancelar Pedido
                    </button>
                )}

                <OrderCancellationModal
                    isOpen={isCancelModalOpen}
                    onClose={() => setIsCancelModalOpen(false)}
                    userRole="customer"
                    onConfirm={async (reason) => {
                        try {
                            const { error: updateError } = await supabase
                                .from('orders')
                                .update({ status: 'cancelado', cancellation_reason: reason })
                                .eq('id', orderId);

                            if (updateError) throw updateError;

                            // Notificar Farmácia (Opcional, mas bom)
                            setIsCancelModalOpen(false);
                            navigate('/');
                        } catch (err) {
                            console.error("Erro ao cancelar:", err);
                            alert("Não foi possível cancelar o pedido. Tente novamente.");
                        }
                    }}
                />
            </div>

            <div className="px-6 pb-12 mt-4">
                <h3 className="text-[#0d1b13] dark:text-white text-lg font-black leading-tight tracking-[-0.015em] pb-6 font-sans">Itens do Pedido</h3>
                <div className="space-y-4">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 group shadow-sm">
                            <div className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center p-2 border border-gray-100 dark:border-white/5 transition-transform group-hover:scale-110"><MaterialIcon name={item.icon} className="text-primary/30 text-2xl" /></div>
                            <div className="flex-1">
                                <p className="text-sm font-black line-clamp-1">{item.name}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.qty}</p>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-white">{item.price}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-8 pt-6 border-t border-dashed border-gray-100 dark:border-gray-800 flex justify-between items-center px-2">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total com entrega</span>
                    <span className="text-2xl font-black text-primary tracking-tighter">R$ {(order?.total_price || order?.total_amount || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};
