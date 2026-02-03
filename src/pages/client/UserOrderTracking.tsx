import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import AdminMap from '../../components/admin/AdminMap';

export const UserOrderTracking = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [motoboy, setMotoboy] = useState<{ id: string, lat: number, lng: number, name?: string } | null>(null);
    const [googleKey, setGoogleKey] = useState<string | null>(null);
    const [realTimeRoute, setRealTimeRoute] = useState<{ distance: string, duration: string } | null>(null);
    const [routePath, setRoutePath] = useState<{ lat: number, lng: number }[]>([]);

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
        const { data: settings } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'google_maps_api_key')
            .single();
        if (settings?.value) setGoogleKey(settings.value);
    };

    const fetchRoute = async (mbLat: number, mbLng: number) => {
        if (!googleKey || !order) return;

        const destLat = order.latitude || order.pharmacies?.latitude;
        const destLng = order.longitude || order.pharmacies?.longitude;

        if (!destLat || !destLng) return;

        // Fetch Directions
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${mbLat},${mbLng}&destination=${destLat},${destLng}&mode=driving&key=${googleKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.routes.length > 0) {
                const points = decodePolyline(data.routes[0].overview_polyline.points);
                setRoutePath(points);

                // Update ETA from directions if available
                const leg = data.routes[0].legs[0];
                if (leg) {
                    setRealTimeRoute({
                        distance: leg.distance.text,
                        duration: leg.duration.text // Use normal duration or duration_in_traffic if fetched with traffic model
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching route:', error);
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
                // Mocking structure to match realTimeRoute state
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
        if (realTimeRoute) return realTimeRoute.duration;

        // Se ainda não tem motoboy, mostra aguardando
        if (!motoboy && !order?.motoboy_id) return 'Aguardando entregador...';

        // Se tem motoboy mas ainda não temos a localização (está carregando), ou googleKey falhou
        if (!motoboy || !order?.pharmacies) return 'Calculando...';

        const destLat = order.latitude || order.pharmacies.latitude;
        const destLng = order.longitude || order.pharmacies.longitude;

        if (!destLat || !destLng) return 'Calculando...';

        const R = 6371; // Raio da Terra em km
        const dLat = (destLat - motoboy.lat) * Math.PI / 180;
        const dLon = (destLng - motoboy.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(motoboy.lat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const baseSpeed = 22; // km/h (Média urbana para moto)
        let trafficFactor = 1.0;

        // Simulação de tráfego baseada na hora (Pico: 17h-19h)
        const hour = new Date().getHours();
        if ((hour >= 17 && hour <= 19) || (hour >= 11 && hour <= 13)) {
            trafficFactor = 0.7; // Tráfego pesado reduz velocidade em 30%
        }

        const effectiveSpeed = baseSpeed * trafficFactor;
        const travelTime = (distance / effectiveSpeed) * 60;

        // Tempo adicional baseado no status
        let additionalTime = 2; // Margem de segurança
        if (order.status === 'aguardando_motoboy') additionalTime += 5;
        if (order.status === 'preparando') additionalTime += 10;
        if (order.status === 'pendente') additionalTime += 15;

        const totalMinutes = Math.round(travelTime + additionalTime);

        if (order.status === 'entregue') return 'Entregue';
        return `${totalMinutes} min (est.)`;
    };

    // Efeito para atualizar ETA automaticamente quando motoboy ou chave Google mudarem
    useEffect(() => {
        if (motoboy && googleKey && order) {
            updateRealTimeETA(motoboy.lat, motoboy.lng);
        }
    }, [motoboy?.lat, motoboy?.lng, googleKey, order?.id]);

    useEffect(() => {
        if (!orderId) return;
        fetchGoogleKey();

        // Ref para evitar disparos duplicados em uma mesma sessão de visualização
        const hasBuzzered = { current: false };

        const fetchOrder = async () => {

            const { data } = await supabase
                .from('orders')
                .select('*, pharmacies(*)')
                .eq('id', orderId)
                .single();

            if (data) {
                console.log("Order Data:", data);
                console.log("Pharmacy Data:", data.pharmacies);
                setOrder(data);

                // Fetch Motoboy Initial Location
                if (data.motoboy_id) {
                    const { data: mbData } = await supabase
                        .from('profiles')
                        .select('id, last_lat, last_lng')
                        .eq('id', data.motoboy_id)
                        .single();

                    if (mbData && mbData.last_lat && mbData.last_lng) {
                        const mbLoc = { id: mbData.id, lat: mbData.last_lat, lng: mbData.last_lng };
                        setMotoboy(mbLoc);

                        // Force ETA update with initial data
                        // We use the function if available, otherwise just setting state prompts the map to render
                        if (googleKey) {
                            updateRealTimeETA(mbLoc.lat, mbLoc.lng);
                        } else {
                            // Calculates fallback ETA if no Google Key or just to show something
                            // We can trigger a re-calc or just let the effect handle it when 'googleKey' changes?
                            // But usually fetchGoogleKey is async.
                            // Let's at least ensure the Map shows the marker.
                        }
                    }
                }
            }
        };

        fetchOrder();

        // Realtime subscription for order status and arrival
        const orderSubscription = supabase
            .channel(`order_tracking_${orderId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${orderId}`
            }, (payload) => {
                const oldStatus = order?.status;
                const newStatus = payload.new.status;
                const oldArrived = order?.motoboy_arrived_at;
                const newArrived = payload.new.motoboy_arrived_at;

                setOrder(payload.new);

                // Disparar BUZINA se o motoboy acabou de sinalizar chegada
                if (newArrived && !oldArrived && !hasBuzzered.current) {
                    hasBuzzered.current = true;
                    console.log("📢 Motoboy chegou! Disparando buzina...");
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
                    audio.volume = 1.0;
                    audio.play().catch(e => console.warn("Erro ao tocar buzina:", e));
                }
            })
            .subscribe();

        // Realtime subscription for motoboy location if we have an order with motoboy_id
        let motoboySubscription: any = null;
        if (order?.motoboy_id) {
            motoboySubscription = supabase
                .channel(`motoboy_loc_${orderId}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${order.motoboy_id}`
                }, (payload) => {
                    const newLoc = { id: payload.new.id, lat: payload.new.last_lat, lng: payload.new.last_lng };
                    setMotoboy(newLoc);
                    if (googleKey) updateRealTimeETA(newLoc.lat, newLoc.lng);

                    // Geofencing Realtime
                    if (order && (order.latitude || order.pharmacies?.latitude)) {
                        const destLat = order.latitude || order.pharmacies?.latitude;
                        const destLng = order.longitude || order.pharmacies?.longitude;
                        const dist = calculateDistance(payload.new.last_lat, payload.new.last_lng, destLat, destLng);
                        if (dist < 1.0) notifyProximity();
                    }
                })
                .subscribe();
        }

        // Subscription para mensagens (Buzina)
        const messageSubscription = supabase
            .channel(`order_messages_${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'order_messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
                if (payload.new.message_type === 'horn') {
                    console.log("🎺 BUZINA RECEBIDA!");
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1271/1271-preview.mp3');
                    audio.volume = 1.0;
                    audio.play().catch(e => console.warn("Erro ao tocar buzina:", e));
                }
            })
            .subscribe();

        return () => {
            orderSubscription.unsubscribe();
            messageSubscription.unsubscribe();
            if (motoboySubscription) motoboySubscription.unsubscribe();
        };
    }, [orderId, order?.motoboy_id]);

    // Auto-redirect to Home
    useEffect(() => {
        if (order?.status === 'entregue' || order?.status === 'cancelado') {
            const timer = setTimeout(() => {
                navigate('/');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [order?.status, navigate]);

    if (!order) return <div className="p-8 text-center text-white">Carregando pedido...</div>;

    const allSteps = [
        {
            status: 'pendente',
            label: order.status === 'pendente' ? 'Aguardando Confirmação' : 'Pedido Aceito',
            sub: order.status === 'pendente' ? 'Aguardando a loja aceitar...' : `Confirmado às ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            icon: order.status === 'pendente' ? 'hourglass_top' : 'check'
        },
        { status: 'preparando', label: 'Preparando seu pedido', sub: 'Em andamento', icon: 'pill' },
        // Step "Aguardando Entregador" - Only show if NO Motoboy or specifically in 'aguardando_motoboy' status (Pool)
        {
            status: 'aguardando_motoboy',
            label: 'Aguardando entregador',
            sub: order.motoboy_id ? 'Entregador à caminho da farmácia' : 'Procurando entregador...',
            icon: 'person_search'
        },
        { status: 'em_rota', label: 'Em rota de entrega', sub: 'A caminho', icon: 'local_shipping' },
        { status: 'entregue', label: 'Entregue', sub: 'Pedido finalizado', icon: 'home' }
    ];

    // Use all steps (no hidden steps in this tracker)
    const steps = allSteps;

    // Calc index based on filtered steps
    // Mapping DB status to Step Index needs care if we remove steps.
    // We should find the index based on the current status matching the step status OR previous ones.

    let currentStepIndex = 0;
    if (order.status === 'pendente') {
        currentStepIndex = steps.findIndex(s => s.status === 'pendente');
    } else if (order.status === 'preparando') {
        currentStepIndex = steps.findIndex(s => s.status === 'preparando');
    } else if (order.status === 'aguardando_motoboy') {
        currentStepIndex = steps.findIndex(s => s.status === 'aguardando_motoboy');
    } else if (order.status === 'pronto_entrega') {
        currentStepIndex = steps.findIndex(s => s.status === 'aguardando_motoboy');
    } else if (order.status === 'em_rota') {
        currentStepIndex = steps.findIndex(s => s.status === 'em_rota');
    } else if (order.status === 'entregue') {
        currentStepIndex = steps.findIndex(s => s.status === 'entregue');
    }
    // Ensure currentStepIndex is not -1 if a status doesn't directly map or is hidden
    if (currentStepIndex === -1) {
        // Fallback: find the closest preceding step or default to 0
        const statusOrder = ['pendente', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'em_rota', 'entregue'];
        const currentStatusIndexInOrder = statusOrder.indexOf(order.status);
        for (let i = currentStatusIndexInOrder; i >= 0; i--) {
            const mappedStepIndex = steps.findIndex(s => s.status === statusOrder[i]);
            if (mappedStepIndex !== -1) {
                currentStepIndex = mappedStepIndex;
                break;
            }
        }
    }


    return (
        <div className="relative mx-auto flex h-auto min-h-screen max-w-[480px] flex-col overflow-x-hidden shadow-2xl bg-white dark:bg-background-dark pb-10">
            {/* TopAppBar */}
            <header className="sticky top-0 z-20 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between">
                <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                    <MaterialIcon name="arrow_back_ios" className="ml-2" />
                </button>
                <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12 font-sans">Acompanhamento</h2>
            </header>

            {/* Map Section */}
            <div className="px-4 py-3">
                <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-zinc-800 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    {order && (order.latitude || order.pharmacies?.latitude) ? (
                        <AdminMap
                            type="tracking"
                            fleet={motoboy ? [{
                                id: motoboy.id,
                                lat: motoboy.lat,
                                lng: motoboy.lng,
                                bearing: calculateBearing(motoboy, { lat: order.latitude || order.pharmacies?.latitude || 0, lng: order.longitude || order.pharmacies?.longitude || 0 })
                            }] : []}
                            markers={[
                                { id: order.pharmacies?.id || 'pharmacy', lat: order.pharmacies?.latitude || 0, lng: order.pharmacies?.longitude || 0, type: 'pharmacy' },
                                { id: 'destination', lat: order.latitude || order.pharmacies?.latitude || 0, lng: order.longitude || order.pharmacies?.longitude || 0, type: 'user' }
                            ]}
                            polylines={[{
                                path: routePath.length > 0 ? routePath : (motoboy ? [
                                    { lat: motoboy.lat, lng: motoboy.lng },
                                    { lat: order.latitude || order.pharmacies.latitude, lng: order.longitude || order.pharmacies.longitude }
                                ] : []),
                                color: "#13ec6d"
                            }]}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <MaterialIcon name="pending_actions" className="text-4xl text-primary/20" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aguardando Motoboy</p>
                        </div>
                    )}
                    {/* Overlay badge for ETA */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl p-4 shadow-lg flex items-center justify-between border-l-4 border-primary border border-white/20 z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2.5 rounded-2xl shadow-inner">
                                <MaterialIcon name="moped" className="text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Chegada estimada</p>
                                <p className="text-lg font-black leading-tight">
                                    {calculateETA()}
                                </p>
                            </div>
                        </div>
                        <MaterialIcon name="info" className="text-gray-300" />
                    </div>
                </div>
            </div>

            {/* Alerta de Chegada - NOVO */}
            {order.motoboy_arrived_at && (
                <div className="px-6 py-2">
                    <div className="bg-green-500 text-white p-4 rounded-3xl flex items-center gap-4 animate-bounce shadow-lg shadow-green-500/20">
                        <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <MaterialIcon name="notifications_active" className="text-2xl" />
                        </div>
                        <div>
                            <p className="font-black italic text-lg leading-tight uppercase">O entregador chegou!</p>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Ele está na sua porta agora</p>
                        </div>
                    </div>
                </div>
            )}

            {/* SectionHeader */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h3 className="text-[#0d1b13] dark:text-white text-xl font-black leading-tight tracking-[-0.015em]">Status do Pedido</h3>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ring-1 ring-primary/5">
                    Pedido #{orderId?.substring(0, 8)}
                </span>
            </div>

            {/* Timeline */}
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
                                {index < steps.length - 1 && (
                                    <div className={`w-[3px] h-12 ${isCompleted ? 'bg-primary opacity-50' : 'bg-gray-100 dark:bg-zinc-800'}`}></div>
                                )}
                            </div>
                            <div className="flex flex-1 flex-col pb-8">
                                <p className={`text-base font-black leading-normal italic ${isPending ? 'text-gray-400 dark:text-gray-600 opacity-60' : 'text-[#0d1b13] dark:text-white'}`}>{step.label}</p>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isActive ? 'text-primary pulse' : 'text-gray-400 opacity-80'}`}>{isActive ? step.sub : isCompleted ? 'Concluído' : 'Pendente'}</p>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Chat Button */}
            <div className="flex flex-col gap-3 px-6 py-4">
                <button
                    onClick={() => navigate(`/chat/${orderId}`)}
                    className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[28px] h-14 px-5 bg-primary text-slate-900 gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98] uppercase tracking-tighter ring-1 ring-primary/5"
                >
                    <MaterialIcon name="chat" className="text-2xl font-bold" fill />
                    <span className="truncate text-base font-black leading-normal">Chat com a Farmácia</span>
                </button>

                {['pendente', 'aguardando_motoboy'].includes(order.status) && (
                    <button
                        onClick={async () => {
                            if (window.confirm('Deseja realmente cancelar este pedido?')) {
                                const { error } = await supabase
                                    .from('orders')
                                    .update({ status: 'cancelado' })
                                    .eq('id', orderId);

                                if (error) {
                                    alert('Erro ao cancelar pedido. Tente novamente.');
                                } else {
                                    alert('Pedido cancelado com sucesso.');
                                    navigate('/meus-pedidos');
                                }
                            }
                        }}
                        className="w-full h-12 rounded-2xl bg-red-50 text-red-600 font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-colors"
                    >
                        Cancelar Pedido
                    </button>
                )}
            </div>

            {/* Resumo do Pedido */}
            <div className="px-6 pb-12 mt-4">
                <h3 className="text-[#0d1b13] dark:text-white text-lg font-black leading-tight tracking-[-0.015em] pb-6 font-sans">Itens do Pedido</h3>
                <div className="space-y-4">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 group shadow-sm">
                            <div className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center p-2 border border-gray-100 dark:border-white/5 transition-transform group-hover:scale-110">
                                <MaterialIcon name={item.icon} className="text-primary/30 text-2xl" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black line-clamp-1">{item.name}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.qty}</p>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-white">{item.price}</p>
                        </div>
                    ))}
                </div>

                {/* Summary Footer */}
                <div className="mt-8 pt-6 border-t border-dashed border-gray-100 dark:border-gray-800 flex justify-between items-center px-2">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total com entrega</span>
                    <span className="text-2xl font-black text-primary tracking-tighter">
                        R$ {order.total_price?.toFixed(2) || items.reduce((acc, it) => acc + (Number(it.price) || 0), 0).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Bottom Indicator Area (iOS Style) */}
            <div className="h-10 flex justify-center items-center">
                <div className="w-32 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full opacity-50"></div>
            </div>
        </div >
    );
};
