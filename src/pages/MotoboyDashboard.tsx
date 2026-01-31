import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRouteData } from '../hooks/useRouteData';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

// Componente para centralizar o mapa na localização
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 16);
    }, [center, map]);
    return null;
}

// Ícone customizado para o motoboy
const motoboyIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00ff00" stroke="#ffffff" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
        </svg>
    `),
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const destinationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40]
});

const originIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <circle cx="12" cy="12" r="3" fill="white" />
        </svg>
    `),
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const MotoboyDashboard = ({ session, profile }: { session: any, profile: any }) => {
    const navigate = useNavigate();

    // Redirect to login if no session
    useEffect(() => {
        if (!session?.user) {
            navigate('/motoboy-login');
        }
    }, [session, navigate]);

    // Guard to prevent crash while redirecting
    if (!session?.user) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
                <p className="font-bold animate-pulse">Redirecionando...</p>
            </div>
        );
    }

    const [isOnline, setIsOnline] = useState(profile?.is_online || false);
    const [ordersQueue, setOrdersQueue] = useState<any[]>([]);
    const currentOrder = ordersQueue.length > 0 ? ordersQueue[0] : null;

    const [showMenu, setShowMenu] = useState(false);
    const [showNavOptions, setShowNavOptions] = useState(false);
    const [isNavigationMode, setIsNavigationMode] = useState(false); // Controls compact UI vs full details

    // Audio & Alerts States
    const [notificationSound, setNotificationSound] = useState<'voice' | 'bell'>(() => {
        return (localStorage.getItem('ifarma_motoboy_sound') as any) || 'voice';
    });
    const [isSoundBlocked, setIsSoundBlocked] = useState(false);
    const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
    // --- LÓGICA UBER STYLE: 3 TOQUES + GEOFENCING ---
    const [distanceToDest, setDistanceToDest] = useState<number | null>(null);
    const [loading, setLoading] = useState(false); // Assuming this state is needed for loading indicators

    // Assuming latitude and longitude are available from geoState or another source
    const { latitude, longitude } = useGeolocation(session?.user?.id, isOnline, currentOrder?.id); // Pass currentOrder ID to geolocation

    const routeData = useRouteData(
        (latitude && longitude) ? { lat: latitude, lng: longitude } : null,
        (currentOrder?.delivery_lat && currentOrder?.delivery_lng) ? { lat: currentOrder.delivery_lat, lng: currentOrder.delivery_lng } : null
    );

    // GPS Preference State
    const [gpsPreference, setGpsPreference] = useState<'google' | 'waze' | null>(() => {
        return (localStorage.getItem('ifarma_gps_preference') as 'google' | 'waze') || null;
    });

    const saveGpsPreference = (pref: 'google' | 'waze') => {
        setGpsPreference(pref);
        localStorage.setItem('ifarma_gps_preference', pref);
    };

    const handleAutoOpenMap = () => {
        if (gpsPreference) {
            openMap(gpsPreference);
        } else {
            setShowNavOptions(true);
        }
    };

    useEffect(() => {
        if (latitude && longitude && currentOrder?.delivery_lat && currentOrder?.delivery_lng) {
            const R = 6371e3; // Raio da Terra em metros
            const φ1 = latitude * Math.PI / 180;
            const φ2 = currentOrder.delivery_lat * Math.PI / 180;
            const Δφ = (currentOrder.delivery_lat - latitude) * Math.PI / 180;
            const Δλ = (currentOrder.delivery_lng - longitude) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const d = R * c; // Distância em metros
            setDistanceToDest(d);
        } else {
            setDistanceToDest(null);
        }
    }, [latitude, longitude, currentOrder]);

    const handleConfirmPickup = async () => {
        if (!currentOrder) return;
        setLoading(true);
        const { error } = await supabase
            .from('orders')
            .update({ status: 'em_rota', updated_at: new Date().toISOString() })
            .eq('id', currentOrder.id);
        if (!error) {
            // Em vez de mudar para em_rota aqui, apenas mantemos para o passo 2
            setNewOrderAlert('RETIRADA CONFIRMADA! AGORA INICIE A ROTA.');
            setTimeout(() => setNewOrderAlert(null), 4000);

            // Update local queue state
            setOrdersQueue(prev => prev.map(o =>
                o.id === currentOrder.id
                    ? { ...o, status: 'em_rota', picked_up_at: new Date().toISOString() }
                    : o
            ));
        } else {
            alert('Erro ao confirmar retirada: ' + error.message);
        }
        setLoading(false);
    };


    // ------------------------------------------------
    const notificationSoundRef = useRef(notificationSound);

    useEffect(() => {
        notificationSoundRef.current = notificationSound;
    }, [notificationSound]);

    const playNotificationSound = async (repeatCount = 1) => {
        const currentSound = notificationSoundRef.current;
        console.log("🔊 Tentando tocar som:", currentSound);

        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        for (let i = 0; i < repeatCount; i++) {
            try {
                if (currentSound === 'voice') {
                    if ('speechSynthesis' in window) {
                        await new Promise<void>((resolve) => {
                            const utterance = new SpeechSynthesisUtterance("Novo pedido Ifarma!");
                            utterance.lang = 'pt-BR';
                            const voices = window.speechSynthesis.getVoices();
                            const ptVoice = voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) ||
                                voices.find(v => v.lang.includes('pt-BR'));
                            if (ptVoice) utterance.voice = ptVoice;

                            const safetyTimeout = setTimeout(() => resolve(), 3000);
                            utterance.onend = () => { clearTimeout(safetyTimeout); resolve(); };
                            utterance.onerror = () => { clearTimeout(safetyTimeout); resolve(); };
                            window.speechSynthesis.speak(utterance);
                        });
                    }
                } else {
                    await new Promise<void>((resolve) => {
                        const src = 'https://assets.mixkit.co/active_storage/sfx/571/571-preview.mp3';
                        const audio = new Audio(src);
                        audio.volume = 0.8;
                        const safetyTimeout = setTimeout(() => resolve(), 3000);
                        audio.onended = () => { clearTimeout(safetyTimeout); resolve(); };
                        audio.onerror = () => { clearTimeout(safetyTimeout); resolve(); };
                        audio.play().catch(e => {
                            console.error("Audio block:", e);
                            setIsSoundBlocked(true);
                            clearTimeout(safetyTimeout);
                            resolve(); // Continue loop even if blocked
                        });
                    });
                }
                // Small delay between alerts
                if (repeatCount > 1) await new Promise(r => setTimeout(r, 1000));

            } catch (err) {
                console.warn("Audio playback error:", err);
            }
        }
    };

    // --- FETCH ORDERS QUEUE ---
    const fetchOrdersQueue = async () => {
        if (!session?.user?.id) return;

        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, profiles:customer_id(full_name, avatar_url, phone)')
                .eq('motoboy_id', session.user.id)
                .in('status', ['pronto_entrega', 'em_rota', 'aguardando_retirada'])
                .order('delivery_sequence', { ascending: true }) // Prioridade definida pelo motoboy
                .order('created_at', { ascending: true }); // Fallback para data de criação

            if (error) {
                console.error("Erro ao buscar fila de pedidos:", error);
                return;
            }

            if (data) {
                // Check if we have a NEW order at the top that wasn't there before
                const previousTopId = ordersQueue.length > 0 ? ordersQueue[0].id : null;
                const newTopId = data.length > 0 ? data[0].id : null;

                if (newTopId && newTopId !== previousTopId && data.length > (ordersQueue.length || 0)) {
                    // Only play sound if it's genuinely a new assignment or list grew
                    playNotificationSound(3);
                    setNewOrderAlert(`Você tem ${data.length} entregas na fila!`);
                    setTimeout(() => setNewOrderAlert(null), 5000);
                }

                setOrdersQueue(data);
            }
        } catch (err) {
            console.error("Exception fetching queue:", err);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchOrdersQueue();
    }, [session?.user?.id]);

    // Realtime Subscription
    useEffect(() => {
        if (!session?.user?.id) return;

        const sub = supabase
            .channel('motoboy-dashboard-queue')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `motoboy_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log("Realtime update:", payload);
                    fetchOrdersQueue(); // Refresh full queue to ensure correct sorting
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [session?.user?.id]);

    const openMap = async (app: 'google' | 'waze' | 'apple') => {
        if (!currentOrder?.id) return;

        // Atualizar status para 'em_rota' (INICIAR CORRIDA) se ainda não estiver
        await supabase
            .from('orders')
            .update({ status: 'em_rota' })
            .eq('id', currentOrder.id);

        // Tenta usar coordenadas do pedido, senão usa do cliente (fallback)
        // O ideal é ter lat/lng do destino no pedido. Vamos assumir que currentOrder tem delivery_lat/lng como visto no tracking-engine, 
        // mas aqui no select ele pegou '*, pharmacies(name, address)'. 
        // O código anterior usava currentOrder.address para display. 
        // Se não tiver lat/lng, vamos usar o endereço como string para busca.

        const destination = currentOrder.address; // Fallback string
        const lat = currentOrder.delivery_lat;
        const lng = currentOrder.delivery_lng;

        let url = '';

        if (lat && lng) {
            // Se tem coordenadas precisas
            switch (app) {
                case 'google':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    break;
                case 'waze':
                    url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                    break;
                case 'apple':
                    url = `http://maps.apple.com/?daddr=${lat},${lng}`;
                    break;
            }
        } else {
            // Se só tem endereço (menos preciso, mas funciona)
            const encodedDest = encodeURIComponent(destination);
            switch (app) {
                case 'google':
                    url = `https://www.google.com/maps/dir/?api=1&destination=${encodedDest}`;
                    break;
                case 'waze':
                    url = `https://waze.com/ul?q=${encodedDest}&navigate=yes`;
                    break;
                case 'apple':
                    url = `http://maps.apple.com/?daddr=${encodedDest}`;
                    break;
            }
        }

        window.open(url, '_blank');
        setShowNavOptions(false);
    };

    const moveOrder = async (index: number, direction: 'up' | 'down') => {
        if (index < 0 || index >= ordersQueue.length) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= ordersQueue.length) return;

        const newQueue = [...ordersQueue];
        // Swap
        [newQueue[index], newQueue[targetIndex]] = [newQueue[targetIndex], newQueue[index]];

        // Optimistic Update
        setOrdersQueue(newQueue);

        // Update DB
        // To ensure consistency, we update ALL orders with their new index as sequence
        try {
            const updates = newQueue.map((order, i) => ({
                id: order.id,
                delivery_sequence: i + 1
            }));

            // Since user might have many orders, let's do this via Promise.all for speed
            await Promise.all(updates.map(u =>
                supabase.from('orders').update({ delivery_sequence: u.delivery_sequence }).eq('id', u.id)
            ));
        } catch (err) {
            console.error("Failed to reorder:", err);
            fetchOrdersQueue(); // Revert
        }
    };

    const handleArrived = async () => {
        if (!currentOrder?.id) return;

        // 1. Marcar chegada no DB (telemetria)
        await supabase
            .from('orders')
            .update({ motoboy_arrived_at: new Date().toISOString() })
            .eq('id', currentOrder.id);

        // 2. Emitir Buzina Sonora para o Cliente (via Realtime)
        await supabase.from('order_messages').insert({
            order_id: currentOrder.id,
            sender_id: session?.user.id,
            message_type: 'horn',
            content: 'BI-BI! O motoboy chegou!'
        });

        // Feedback local
        setNewOrderAlert('BUZINA ACIONADA! CLIENTE NOTIFICADO.');
        setTimeout(() => setNewOrderAlert(null), 4000);

        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1271/1271-preview.mp3'); // Som de buzina
        audio.play().catch(() => { });
    };

    // --- RENDER QUEUE LIST HELPER ---
    const renderQueueList = () => {
        if (ordersQueue.length <= 1) return null;

        return (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MaterialIcon name="queue_music" className="text-lg" />
                    Próximas Entregas ({ordersQueue.length - 1})
                </h3>
                <div className="space-y-3">
                    {ordersQueue.slice(1).map((order, idx) => {
                        const originalIndex = idx + 1; // because we sliced 1
                        return (
                            <div key={order.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between group hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-slate-200 dark:bg-slate-700 size-8 rounded-full flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                                        {originalIndex + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-700 dark:text-slate-200 truncate text-sm">
                                            {order.profiles?.full_name || 'Cliente sem nome'}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {order.address?.split(',')[0]}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); moveOrder(originalIndex, 'up'); }}
                                    className="p-2 bg-white dark:bg-slate-700 rounded-lg text-primary shadow-sm active:scale-90 transition-transform"
                                    title="Priorizar / Subir"
                                >
                                    <MaterialIcon name="keyboard_arrow_up" className="text-xl" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };





    // ✅ Forçar solicitação de permissão de geolocalização E Notificação ao abrir o dashboard
    useEffect(() => {
        const requestInitialPermissions = async () => {
            try {
                // 1. Permissão de Geolocalização
                if (Capacitor.isNativePlatform()) {
                    await Geolocation.requestPermissions();
                } else {
                    navigator.geolocation.getCurrentPosition(
                        () => console.log('📍 Permissão de localização concedida (Web)'),
                        (err) => console.warn('⚠️ Permissão de localização (Web) negada ou fechada:', err)
                    );
                }

                // 2. Permissão de Notificação
                if (window.Notification && Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    console.log('🔔 Permissão de notificação status:', permission);
                }
            } catch (e) {
                console.error('Erro ao solicitar permissões iniciais:', e);
            }
        };

        requestInitialPermissions();
    }, []);

    useEffect(() => {
        if (profile?.current_order_id) {
            fetchCurrentOrder();
        }
    }, [profile]);

    // ✅ NOVO (V2): Escutar mudanças na tabela PEDIDOS diretamente (Mais robusto)
    useEffect(() => {
        if (!session?.user?.id) return;

        console.log("🔌 Conectando Realtime para PEDIDOS do Motoboy...", session.user.id);

        const channel = supabase
            .channel(`orders_motoboy_${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // ou INSERT se for nova atribuição que cria linha (mas é update)
                    schema: 'public',
                    table: 'orders',
                    filter: `motoboy_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log("📦 Pedido atribuído/atualizado via Realtime:", payload);

                    // Se fui atribuído ou status mudou, atualizo o estado
                    if (payload.new && payload.new.id) {
                        // Alerta Sonoro e Visual
                        playNotificationSound(2);
                        setNewOrderAlert(`VOCÊ TEM UM NOVO PEDIDO!`);
                        setTimeout(() => setNewOrderAlert(null), 6000);

                        console.log("🚀 Atualizando dashboard com pedido:", payload.new.id);
                        fetchOrderById(payload.new.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    const fetchOrderById = async (orderId: string) => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, pharmacies(name, address)')
            .eq('id', orderId)
            .single();

        if (error) {
            console.error("❌ Erro ao buscar dados do pedido (Provável RLS):", error);
        }

        if (data) setCurrentOrder(data);
    };

    const fetchCurrentOrder = async () => {
        // Try getting from profile first
        let orderId = profile?.current_order_id;


        // If not in profile, check if there's any active order assigned to me (Robustness)
        if (!orderId && session?.user?.id) {
            const { data: activeOrder } = await supabase
                .from('orders')
                .select('id')
                .eq('motoboy_id', session.user.id)
                .in('status', ['pronto_entrega', 'em_rota'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (activeOrder) orderId = activeOrder.id;
        }

        if (orderId) {
            const { data } = await supabase
                .from('orders')
                .select('*, pharmacies(name, address)')
                .eq('id', orderId)
                .single();

            if (data) setCurrentOrder(data);
        }
    };

    const toggleOnline = async () => {
        const newStatus = !isOnline;

        // Ao ficar online, já tenta pegar a bateria
        let batteryData = {};
        if (newStatus && 'getBattery' in navigator) {
            try {
                const battery: any = await (navigator as any).getBattery();
                batteryData = {
                    battery_level: Math.round(battery.level * 100),
                    is_charging: battery.charging
                };
            } catch (e) {
                console.error("Erro ao acessar bateria:", e);
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                is_online: newStatus,
                ...batteryData
            })
            .eq('id', session.user.id);

        if (!error) {
            setIsOnline(newStatus);
        }
    };

    // Monitorar bateria enquanto estiver online
    useEffect(() => {
        let batteryInterval: any;

        const updateBattery = async () => {
            if (isOnline && 'getBattery' in navigator) {
                try {
                    const battery: any = await (navigator as any).getBattery();
                    await supabase
                        .from('profiles')
                        .update({
                            battery_level: Math.round(battery.level * 100),
                            is_charging: battery.charging
                        })
                        .eq('id', session.user.id);
                } catch (e) {
                    console.error("Erro ao atualizar bateria:", e);
                }
            }
        };

        if (isOnline) {
            updateBattery();
            batteryInterval = setInterval(updateBattery, 60000 * 5); // Atualiza a cada 5 min
        }

        return () => {
            if (batteryInterval) clearInterval(batteryInterval);
        };
    }, [isOnline, session.user.id]);

    const center: [number, number] = [
        geoState.latitude || -22.9068,
        geoState.longitude || -43.1729
    ];

    // --- RENDER ---

    // 1. IDLE STATE (Aguardando Pedidos)
    if (!currentOrder) {
        return (
            <div className="relative flex h-full min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-[430px] mx-auto bg-white dark:bg-slate-900 shadow-2xl">
                {/* TopAppBar */}
                <div className="flex items-center bg-white dark:bg-slate-900 p-4 pb-2 justify-between sticky top-0 z-10 border-b border-[#dbe6df] dark:border-[#2a3d31]">
                    <div className="text-[#111813] dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => setShowMenu(true)}>
                        <MaterialIcon name="menu" className="text-3xl" />
                    </div>
                    <h2 className="text-[#111813] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Entregas</h2>
                    <div className="flex w-12 items-center justify-end">
                        <button
                            onClick={toggleOnline}
                            className={`flex items-center gap-1.5 transition-all active:scale-95 ${isOnline ? 'opacity-100' : 'opacity-50 grayscale'}`}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-primary' : 'bg-slate-400'} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-primary' : 'bg-slate-400'}`}></span>
                            </span>
                            <p className={`text-sm font-bold leading-normal tracking-[0.015em] shrink-0 ${isOnline ? 'text-primary' : 'text-slate-400'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </p>
                        </button>
                    </div>
                </div>

                {/* EmptyState Content */}
                <div className="flex flex-col px-4 py-8 flex-grow bg-slate-50 dark:bg-[#101a14]">
                    <div className="flex flex-col items-center gap-6">
                        {/* Illustration Placeholder */}
                        <div className="bg-center bg-no-repeat aspect-square bg-contain rounded-full w-48 h-48 bg-[#f0f4f2] dark:bg-[#1a2e20] flex items-center justify-center border-4 border-white dark:border-[#102216] shadow-sm relative overflow-hidden">
                            <img
                                src="https://img.freepik.com/free-vector/delivery-service-illustrated_23-2148505081.jpg"
                                className="w-full h-full object-cover opacity-80"
                                alt="Delivery"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent dark:from-black/20" />
                        </div>
                        <div className="flex max-w-[480px] flex-col items-center gap-2">
                            <p className="text-[#111813] dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em] text-center">
                                {isOnline ? 'Tudo limpo por aqui!' : 'Você está offline'}
                            </p>
                            <p className="text-[#111813]/70 dark:text-white/70 text-base font-normal leading-normal max-w-[480px] text-center">
                                {isOnline
                                    ? 'Você está na fila para o próximo pedido. Mantenha o app aberto.'
                                    : 'Fique online para começar a receber pedidos de entrega.'}
                            </p>
                        </div>
                    </div>

                    {/* SectionHeader */}
                    <div className="mt-8">
                        <h3 className="text-[#111813] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2">Resumo de hoje</h3>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-3 py-2">
                        <div className="flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl p-4 border border-[#dbe6df] dark:border-[#2a3d31] bg-white dark:bg-[#1a2e20]/50 shadow-sm">
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="local_shipping" className="text-primary text-xl" />
                                <p className="text-[#111813]/60 dark:text-white/60 text-sm font-medium leading-normal">Entregas</p>
                            </div>
                            <p className="text-[#111813] dark:text-white tracking-light text-2xl font-bold leading-tight">0</p>
                        </div>
                        <div className="flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl p-4 border border-[#dbe6df] dark:border-[#2a3d31] bg-white dark:bg-[#1a2e20]/50 shadow-sm">
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="payments" className="text-primary text-xl" />
                                <p className="text-[#111813]/60 dark:text-white/60 text-sm font-medium leading-normal">Total ganho</p>
                            </div>
                            <p className="text-[#111813] dark:text-white tracking-light text-2xl font-bold leading-tight">R$ 0,00</p>
                        </div>
                    </div>

                    {/* Info Message */}
                    {isOnline && (
                        <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3">
                            <MaterialIcon name="info" className="text-primary" />
                            <p className="text-[#111813] dark:text-white text-xs leading-relaxed">
                                Mantenha o GPS ligado e o aplicativo em primeiro plano para receber notificações mais rápidas.
                            </p>
                        </div>
                    )}
                </div>

                {/* SingleButton Footer (Optional: Sync/Refresh) */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-[#dbe6df] dark:border-[#2a3d31] safe-area-inset-bottom">
                    <button
                        onClick={fetchCurrentOrder}
                        className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-slate-100 dark:bg-slate-800 text-[#111813] dark:text-white gap-3 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
                    >
                        <MaterialIcon name="sync" className="font-bold" />
                        <span className="truncate">Sincronizar Agora</span>
                    </button>
                    <div className="mt-4 flex justify-center pb-2">
                        <div className="w-32 h-1 bg-black/10 dark:bg-white/10 rounded-full"></div>
                    </div>
                </div>

                {/* Menu Modal (Reused) */}
                {showMenu && (
                    <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
                        <div
                            className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black italic tracking-tighter">Menu</h2>
                                <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                    <MaterialIcon name="close" />
                                </button>
                            </div>

                            {/* Seção de Configuração de GPS */}
                            <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">Navegação Padrão</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => saveGpsPreference('google')}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${gpsPreference === 'google' ? 'bg-white dark:bg-slate-700 border-green-500 ring-2 ring-green-500/20' : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <MaterialIcon name="map" className={gpsPreference === 'google' ? "text-green-500" : "text-slate-400"} />
                                        <span className={`text-[10px] font-bold ${gpsPreference === 'google' ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>Google Maps</span>
                                    </button>
                                    <button
                                        onClick={() => saveGpsPreference('waze')}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${gpsPreference === 'waze' ? 'bg-white dark:bg-slate-700 border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <MaterialIcon name="directions_car" className={gpsPreference === 'waze' ? "text-blue-500" : "text-slate-400"} />
                                        <span className={`text-[10px] font-bold ${gpsPreference === 'waze' ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>Waze</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button onClick={() => navigate('/motoboy-history')} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <MaterialIcon name="history" />
                                    <span className="font-bold">Histórico</span>
                                </button>
                                <button onClick={() => navigate('/motoboy-earnings')} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <MaterialIcon name="account_balance_wallet" />
                                    <span className="font-bold">Ganhos</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        await supabase.auth.signOut();
                                        navigate('/login');
                                    }}
                                    className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors"
                                >
                                    <MaterialIcon name="logout" />
                                    <span className="font-bold">Sair</span>
                                </button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 text-center">
                                <p className="text-[10px] text-slate-400 mb-4">Versão 2.1.0 (Elite)</p>

                                <button
                                    onClick={async () => {
                                        if (window.confirm("CONFIRMAR EMERGÊNCIA?\nIsso enviará sua localização atual para a central e alertará os gestores.")) {
                                            // 1. Enviar Alerta (Simulado via Order Messages ou Tabela de Alertas)
                                            if (currentOrder?.id) {
                                                await supabase.from('order_messages').insert({
                                                    order_id: currentOrder.id,
                                                    sender_id: session?.user.id,
                                                    message_type: 'panic',
                                                    content: '🚨 SOS! MOTOBOY SOLICITOU AJUDA!'
                                                });
                                            }

                                            // 2. Feedback
                                            alert("🚨 Sinal de Emergência Enviado! A central foi notificada.");
                                        }
                                    }}
                                    className="w-full bg-red-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-red-500/30"
                                >
                                    <MaterialIcon name="sos" className="text-xl" />
                                    BOTÃO DE PÂNICO
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. ACTIVE DELIVERY STATE (Entrega em Andamento)
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">

            {/* Map Section (Fixed Top Half) */}
            <div className="fixed top-0 left-0 w-full h-[55vh] z-0">
                <div className="w-full h-full relative">
                    <MapContainer
                        center={center}
                        zoom={16}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                        />
                        {geoState.latitude && geoState.longitude && (
                            <>
                                <MapUpdater center={center} />
                                <Marker position={center} icon={motoboyIcon} />
                                {currentOrder?.status === 'em_rota' && routeData.coordinates.length > 0 && (
                                    <>
                                        <Polyline positions={routeData.coordinates} pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.8 }} />
                                        {currentOrder.delivery_lat && <Marker position={[currentOrder.delivery_lat, currentOrder.delivery_lng]} icon={destinationIcon} />}
                                    </>
                                )}
                            </>
                        )}
                    </MapContainer>

                    {/* Navigation Overlay Buttons */}
                    <div className="absolute bottom-12 right-4 flex flex-col gap-2 z-[400]">
                        <button
                            onClick={handleAutoOpenMap}
                            className="flex items-center gap-2 bg-primary text-black font-bold px-4 py-3 rounded-full shadow-xl active:scale-95 transition-transform"
                        >
                            <MaterialIcon name="directions" />
                            <span>Abrir no GPS</span>
                        </button>
                    </div>

                    {/* Top Bar Overlay */}
                    <div className="absolute top-0 left-0 right-0 z-[400] bg-white/90 dark:bg-background-dark/90 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                        <div className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" onClick={() => setShowMenu(true)}>
                            <MaterialIcon name="menu" className="text-lg" />
                        </div>
                        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-10">
                            Entrega #{currentOrder.id.substring(0, 4)}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Bottom Sheet (Scrollable Content) */}
            <div className="relative mt-[45vh] z-10 min-h-[55vh] rounded-t-[2.5rem] bg-white dark:bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] pb-32">

                {/* Handle */}
                <div className="flex w-full items-center justify-center py-4" onClick={() => { /* Opção de collapse/expand futuro */ }}>
                    <div className="h-1.5 w-12 rounded-full bg-[#dbe6df] dark:bg-gray-700"></div>
                </div>

                {/* Actions Grid (Contact) */}
                <div className="grid grid-cols-2 gap-4 px-6 mb-6">
                    <a href={`tel:${currentOrder.client_phone || ''}`} className="flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 active:bg-slate-100">
                        <MaterialIcon name="call" className="text-primary" />
                        Ligar
                    </a>
                    <button className="flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-sm text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 active:bg-slate-100">
                        <MaterialIcon name="chat" className="text-primary" />
                        Chat
                    </button>
                </div>

                {/* Customer & Address */}
                <div className="px-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-black text-slate-400">
                            {currentOrder.client_name?.charAt(0) || 'C'}
                        </div>
                        <div className="flex-1">
                            <p className="text-lg font-bold leading-none">{currentOrder.client_name || 'Cliente'}</p>
                            <p className="text-[#61896f] dark:text-gray-400 text-sm font-normal mt-1 leading-snug">
                                {currentOrder.address}
                            </p>
                        </div>
                    </div>
                    {/* Instructions */}
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <h4 className="text-[10px] font-black uppercase text-blue-400 mb-1 flex items-center gap-1">
                            <MaterialIcon name="info" className="text-xs" />
                            Observações
                        </h4>
                        <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed font-medium">
                            "Ao chegar, tocar o interfone 302. Cliente idoso, aguardar um pouco."
                        </p>
                    </div>
                </div>

                {/* Items List */}
                <div className="px-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold">Itens do Pedido</h4>
                        <span className="text-sm text-[#61896f] font-bold">Total: R$ {currentOrder.total_amount || '0,00'}</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl">
                        <div className="bg-gray-100 dark:bg-slate-700 size-12 rounded-lg flex items-center justify-center">
                            <MaterialIcon name="medication" className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm">Pedido #{currentOrder.id.substring(0, 6)}</p>
                            <p className="text-xs text-slate-500">Verificar itens na nota fiscal</p>
                        </div>
                    </div>
                </div>

                {/* Queue List / Próximas Entregas */}
                {renderQueueList()}

                {/* Sticky Bottom Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 z-30">
                    <div className="flex flex-col gap-3 max-w-lg mx-auto">

                        {/* Buzina Option (Proximal) */}
                        <button
                            onClick={handleArrived}
                            className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            <MaterialIcon name="volume_up" />
                            Enviar Aviso Sonoro (Buzina)
                        </button>

                        {/* Ação Principal: Confirmar/Chequei */}
                        {currentOrder.status === 'pronto_entrega' ? (
                            <button
                                onClick={handleConfirmPickup}
                                className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
                            >
                                <MaterialIcon name="inventory" className="font-bold" />
                                CONFIRMAR RETIRADA
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate(`/motoboy-confirm/${currentOrder.id}`)}
                                disabled={!distanceToDest || distanceToDest > 150}
                                className={`w-full font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
                                    ${(!distanceToDest || distanceToDest > 150) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-black shadow-primary/20'}
                                `}
                            >
                                <MaterialIcon name="check_circle" className="font-bold" />
                                {(!distanceToDest || distanceToDest > 150) ? 'APROXIME-SE PARA ENTREGAR' : 'CONFIRMAR ENTREGA'}
                            </button>
                        )}
                    </div>
                    {/* iOS Safe Area Spacer */}
                    <div className="h-4"></div>
                </div>

            </div>

            {/* Modals GPS (Reused code logic from showNavOptions) */}
            {showNavOptions && !gpsPreference && (
                <div className="absolute inset-0 z-[500] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm sm:items-center" onClick={() => setShowNavOptions(false)}>
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-black italic tracking-tighter mb-4 text-center">Escolha o GPS</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { openMap('google'); saveGpsPreference('google'); }} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold flex flex-col items-center gap-2"><MaterialIcon name="map" className="text-red-500 text-3xl" />Google Maps</button>
                            <button onClick={() => { openMap('waze'); saveGpsPreference('waze'); }} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold flex flex-col items-center gap-2"><MaterialIcon name="directions_car" className="text-blue-500 text-3xl" />Waze</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Modal (Duplicate needed here if showMenu is true while order active) */}
            {showMenu && (
                <div className="absolute inset-0 z-[500] bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
                    <div
                        className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black italic tracking-tighter">Menu</h2>
                            <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <MaterialIcon name="close" />
                            </button>
                        </div>
                        <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors">
                            <MaterialIcon name="logout" />
                            <span className="font-bold">Sair</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MotoboyDashboard;
