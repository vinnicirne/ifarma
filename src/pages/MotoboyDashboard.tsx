import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRouteData } from '../hooks/useRouteData';
import { useWakeLock } from '../hooks/useWakeLock';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { MaterialIcon } from '../components/MaterialIcon';
import { useAudio } from '../hooks/useAudio';

// Componente para centralizar o mapa na localização e ajustar limites
function MapUpdater({ center, routeCoords, followUser }: { center: [number, number], routeCoords?: [number, number][], followUser?: boolean }) {
    const map = useMap();
    const hasFittedRef = useRef(false);

    useEffect(() => {
        if (routeCoords && routeCoords.length > 0 && !hasFittedRef.current) {
            const bounds = L.latLngBounds(routeCoords);
            map.fitBounds(bounds, { padding: [80, 80] });
            hasFittedRef.current = true;
        } else if (!routeCoords || routeCoords.length === 0) {
            map.setView(center, map.getZoom() || 16);
            hasFittedRef.current = false;
        }

        if (followUser) {
            map.panTo(center);
        }
    }, [center[0], center[1], routeCoords, map, followUser]);

    return null;
}

// Ícone customizado para o motoboy (Sleek Moto)
const motoboyIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <!-- Scooter Body (Uber/Ifarma Green) -->
            <path d="M48 40 L52 40 C54 40 56 42 56 44 L56 48 C56 50 54 52 52 52 L12 52 C10 52 8 50 8 48 L8 44 C8 42 10 40 12 40 L16 40" fill="none" stroke="#13ec6d" stroke-width="4" stroke-linecap="round"/>
            <path d="M16 40 L24 20 L40 20 L48 40" fill="#13ec6d" />
            
            <!-- Delivery Box (White with Green Detail) -->
            <rect x="10" y="22" width="16" height="18" rx="2" fill="white" stroke="#13ec6d" stroke-width="2"/>
            <rect x="10" y="22" width="16" height="4" rx="1" fill="#13ec6d"/>
            
            <!-- Rider (Minimalist) -->
            <circle cx="36" cy="14" r="5" fill="#333" /> <!-- Helmet -->
            <path d="M32 20 L40 20 L44 35 L30 35 Z" fill="#222" /> <!-- Body -->
            
            <!-- Wheels -->
            <circle cx="18" cy="50" r="6" fill="#333" stroke="white" stroke-width="2" />
            <circle cx="48" cy="50" r="6" fill="#333" stroke="white" stroke-width="2" />
            
            <!-- Speed Lines (Motion) -->
            <line x1="2" y1="44" x2="6" y2="44" stroke="#13ec6d" stroke-width="2" stroke-linecap="round" opacity="0.6" />
            <line x1="0" y1="48" x2="5" y2="48" stroke="#13ec6d" stroke-width="2" stroke-linecap="round" opacity="0.4" />
        </svg>
    `),
    iconSize: [45, 45],
    iconAnchor: [22, 22]
});

const destinationIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000">
            <rect x="8" y="8" width="8" height="8" rx="1" stroke="white" stroke-width="2"/>
        </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12]
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
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [notificationSound, setNotificationSound] = useState<'voice' | 'bell'>(() => {
        return (localStorage.getItem('ifarma_motoboy_sound') as any) || 'bell';
    });
    const [isSoundBlocked, setIsSoundBlocked] = useState(false);
    const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    // Ref para evitar closure bug em listeners de realtime
    const ordersQueueRef = useRef<any[]>([]);
    const isProcessingAction = useRef(false);
    const hasLoadedQueue = useRef(false);

    useEffect(() => {
        ordersQueueRef.current = ordersQueue;
    }, [ordersQueue]);

    // Função para desbloquear o áudio (user gesture)
    const enableAudio = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2855/2855-preview.mp3');
        audio.volume = 0; // Toca em silêncio só para desbloquear
        audio.play().then(() => {
            setAudioEnabled(true);
            setIsSoundBlocked(false);
        }).catch(() => {
            setIsSoundBlocked(true);
        });
    };
    // --- LÓGICA UBER STYLE: 3 TOQUES + GEOFENCING ---
    const [distanceToDest, setDistanceToDest] = useState<number | null>(null);
    const [loading, setLoading] = useState(false); // Assuming this state is needed for loading indicators
    const [hasStartedRoute, setHasStartedRoute] = useState(false); // Controls sequential flow: Start Route -> Confirm Delivery
    const [hasAccepted, setHasAccepted] = useState(false); // Controls step: Accept -> Confirm Pickup
    const [isSheetExpanded, setIsSheetExpanded] = useState(true); // Controla se o card de informações está aberto

    // --- 1. GEOLOCATION FIRST (To avoid ReferenceError) ---
    // Assuming latitude and longitude are available from geoState or another source
    const { latitude, longitude } = useGeolocation(session?.user?.id, isOnline, currentOrder?.id);

    // --- 2. STATE FOR ROUTE ---
    const [routePath, setRoutePath] = useState<[number, number][]>([]);

    // Coordenadas centrais (Motoboy) - Memoized to prevent re-renders
    const center: [number, number] = [latitude || -22.8509, longitude || -43.0280];

    // --- 3. DECODE POLYLINE (Adapted for Leaflet [lat, lng]) ---
    // OSRM returns precision 1e5 (same as Google standard)
    const decodePolyline = (encoded: string): [number, number][] => {
        const points: [number, number][] = [];
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

            points.push([lat / 1e5, lng / 1e5]);
        }
        return points;
    };

    // --- 4. FETCH ROUTE (OSRM) ---
    const fetchRoute = async (startLat: number, startLng: number, destLat: number, destLng: number) => {
        // OSRM Request: driving profile, coordinates in Lng,Lat order
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=polyline`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 'Ok' && data.routes.length > 0) {
                // OSRM returns encoded geometry similar to Google
                const points = decodePolyline(data.routes[0].geometry);
                setRoutePath(points);
            }
        } catch (error) {
            console.error('Error fetching OSRM route:', error);
        }
    };

    // --- 5. TRIGGER FETCH ---
    useEffect(() => {
        // Handle coordinate mismatch (some columns are latitude, some delivery_lat)
        const dLat = currentOrder?.delivery_lat ?? currentOrder?.latitude;
        const dLng = currentOrder?.delivery_lng ?? currentOrder?.longitude;

        if (currentOrder && dLat && dLng && latitude && longitude) {
            fetchRoute(latitude, longitude, dLat, dLng);
        }
    }, [currentOrder?.id, currentOrder?.delivery_lat, currentOrder?.latitude, latitude, longitude]);

    // Wake Lock
    useWakeLock(!!currentOrder && currentOrder.status === 'em_rota');

    // Route Data Polyfill for Render
    const routeData = { coordinates: routePath };



    // --- START INTERNAL ROUTE ---
    const startInternalRoute = async () => {
        if (!currentOrder?.id) return;
        isProcessingAction.current = true;

        // Atualizar status para 'em_rota'
        const { error } = await supabase
            .from('orders')
            .update({ status: 'em_rota' })
            .eq('id', currentOrder.id);

        if (!error) {
            setHasStartedRoute(true);
            setIsNavigationMode(true);
            setIsSheetExpanded(false);
            setOrdersQueue(prev => prev.map(o => o.id === currentOrder.id ? { ...o, status: 'em_rota' } : o));
            ordersQueueRef.current = ordersQueueRef.current.map(o => o.id === currentOrder.id ? { ...o, status: 'em_rota' } : o);
            stopAudio();

            setTimeout(() => {
                isProcessingAction.current = false;
            }, 6000);
        } else {
            isProcessingAction.current = false;
        }
    };

    const handleAutoOpenMap = () => {
        startInternalRoute();
    };

    // Calculate Distance (Haversine) - reused for logic
    useEffect(() => {
        const dLat = currentOrder?.delivery_lat ?? currentOrder?.latitude;
        const dLng = currentOrder?.delivery_lng ?? currentOrder?.longitude;

        if (latitude && longitude && dLat && dLng) {
            // Reusing existing logic if needed or ensuring it triggers
            const R = 6371e3;
            const φ1 = latitude * Math.PI / 180;
            const φ2 = dLat * Math.PI / 180;
            const Δφ = (dLat - latitude) * Math.PI / 180;
            const Δλ = (dLng - longitude) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            setDistanceToDest(R * c);
        } else {
            setDistanceToDest(null);
        }
    }, [latitude, longitude, currentOrder]);

    // Reset Route State
    useEffect(() => {
        setHasStartedRoute(false);
        setHasAccepted(false);
        setRoutePath([]); // Clear path on new order
    }, [currentOrder?.id]);

    const handleConfirmPickup = async () => {
        if (!currentOrder) return;
        setLoading(true);
        isProcessingAction.current = true;

        // Find ALL orders that are 'pronto_entrega' for this motoboy and batch update them
        // This ensures the motoboy confirms pickup once for the whole batch
        const ordersToUpdate = ordersQueue.filter(o => o.status === 'pronto_entrega').map(o => o.id);

        if (ordersToUpdate.length === 0) {
            // Should not happen if button is visible, but safety check
            ordersToUpdate.push(currentOrder.id);
        }

        const { error } = await supabase
            .from('orders')
            .update({ status: 'retirado', updated_at: new Date().toISOString() })
            .in('id', ordersToUpdate);

        if (!error) {
            setNewOrderAlert('RETIRADA CONFIRMADA! AGORA INICIE A ROTA.');
            stopAudio();
            setTimeout(() => {
                setNewOrderAlert(null);
                isProcessingAction.current = false;
            }, 6000);

            // Update local queue state for ALL affected orders
            const updatedQueue = ordersQueue.map(o =>
                ordersToUpdate.includes(o.id)
                    ? { ...o, status: 'retirado', picked_up_at: new Date().toISOString() }
                    : o
            );
            setOrdersQueue(updatedQueue);
            ordersQueueRef.current = updatedQueue;
        } else {
            isProcessingAction.current = false;
            alert('Erro ao confirmar retirada: ' + error.message);
        }
        setLoading(false);
    };


    // ------------------------------------------------
    // AUDIO SYSTEM (Centralized)
    const { play: playAudio, stop: stopAudio } = useAudio();

    // ------------------------------------------------
    // --- FETCH ORDERS QUEUE ---
    const fetchOrdersQueue = async () => {
        if (!session?.user?.id) return;

        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    profiles:customer_id(*),
                    pharmacies(*),
                    order_items(*, products(*))
                `)
                .eq('motoboy_id', session.user.id)
                .in('status', ['pronto_entrega', 'em_rota', 'retirado', 'aguardando_retirada'])
                .order('delivery_sequence', { ascending: true }) // Prioridade definida pelo motoboy
                .order('created_at', { ascending: true }); // Fallback para data de criação

            if (error) {
                console.error("Erro ao buscar fila de pedidos:", error);
                return;
            }

            if (data) {
                // Check if we have a NEW order at the top or list grew
                // Usamos o REF para evitar o closure bug (realtime pegando estado inicial [])
                const previousQueue = ordersQueueRef.current;
                const previousIds = new Set(previousQueue.map(o => o.id));
                const newIds = new Set(data.map(o => o.id));

                const isGenuinelyNew = data.some(o => !previousIds.has(o.id));
                const isNewOrder = data.length > previousQueue.length;
                const topIdChanged = previousQueue.length > 0 && data.length > 0 && previousQueue[0].id !== data[0].id;

                // Não tocar som se:
                // 1. For a carga inicial (hasLoadedQueue === false)
                // 2. Estiver processando uma ação local (isProcessingAction === true)
                // 3. Não houver um novo UUID na lista
                if (hasLoadedQueue.current && !isProcessingAction.current && isGenuinelyNew) {
                    // Only play sound if it's genuinely a new assignment
                    console.log("🔔 ALERTA: Novo pedido detectado!", {
                        totalAnterior: previousQueue.length,
                        totalNovo: data.length,
                        isGenuinelyNew,
                        topIdChanged
                    });

                    playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 3);
                    setNewOrderAlert(`VOCÊ TEM UM NOVO PEDIDO! (${data.length} na fila)`);
                    setTimeout(() => setNewOrderAlert(null), 6000);
                }

                setOrdersQueue(data);
                ordersQueueRef.current = data;
                hasLoadedQueue.current = true;
            }
        } catch (err) {
            console.error("Exception fetching queue:", err);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchOrdersQueue();
    }, [session?.user?.id]);

    // --- REALTIME SUBSCRIPTION (Consolidada) ---
    useEffect(() => {
        if (!session?.user?.id) return;

        console.log("🔌 Conectando Realtime (Entregas e Fila)...", session.user.id);

        const channel = supabase
            .channel(`motoboy_dashboard_all_${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `motoboy_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log("📦 Atualização Realtime:", payload.eventType, (payload.new as any)?.id);

                    if (payload.eventType === 'UPDATE') {
                        const oldStatus = (payload.old as any)?.status;
                        const newStatus = (payload.new as any)?.status;
                        const isNewStatus = oldStatus !== newStatus;
                        const alertableStatuses = ['aguardando_motoboy', 'pronto_entrega'];
                        const isAlertable = alertableStatuses.includes(newStatus);

                        // Se o status mudou para algo que requer atenção imediata
                        // E não estamos em meio a uma ação manual no app
                        if (!isProcessingAction.current && isNewStatus && isAlertable) {
                            playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 3);
                            setNewOrderAlert(`VOCÊ TEM UM NOVO PEDIDO!`);
                            setTimeout(() => setNewOrderAlert(null), 6000);
                            console.log("🚀 Alerta sonoro disparado para status:", payload.new.status);
                        }
                    } else if (payload.eventType === 'INSERT') {
                        // Novo pedido inserido diretamente para mim
                        playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 3);
                        setNewOrderAlert(`NOVA ENTREGA PARA VOCÊ!`);
                        setTimeout(() => setNewOrderAlert(null), 6000);
                    }

                    fetchOrdersQueue();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);



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

        playAudio('horn');
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
            fetchOrdersQueue();
        }
    }, [profile]);



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
            if (!isOnline) return;

            // Safe check for Battery Status API (Chrome/Android only usually)
            if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
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
                    // Silently fail for battery API errors to not disrupt main flow
                    console.warn("Battery status update failed:", e);
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

    // Listener de Mensagens para o Contador do Chat
    useEffect(() => {
        if (!session?.user?.id) return;

        console.log("💬 Monitorando novas mensagens para badge...");

        const chatSub = supabase
            .channel('chat_badge_motoboy')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_messages'
                },
                (payload) => {
                    // Só incrementa se a mensagem não for minha
                    if (payload.new.sender_id !== session.user.id) {
                        setUnreadChatCount(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(chatSub);
        };
    }, [session.user.id]);


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

                {/* Banner de Aviso de Som */}
                {(!audioEnabled || isSoundBlocked) && (
                    <div className="bg-red-500 text-white p-3 flex items-center justify-between gap-3 animate-pulse sticky top-[68px] z-10 shadow-lg">
                        <div className="flex items-center gap-2">
                            <MaterialIcon name="volume_off" className="text-xl" />
                            <p className="text-xs font-bold leading-tight uppercase tracking-wider">
                                ALERTA: SOM DESABILITADO
                            </p>
                        </div>
                        <button
                            onClick={enableAudio}
                            className="bg-white text-red-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-sm active:scale-95"
                        >
                            Clique para Ativar
                        </button>
                    </div>
                )}

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
                        onClick={fetchOrdersQueue}
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



                            <div className="space-y-2">
                                <button onClick={() => playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 1)} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <MaterialIcon name="volume_up" />
                                    <span className="font-bold">Testar Alerta</span>
                                </button>
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
                                    onClick={() => navigate('/bug-report')}
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
            <div className={`fixed top-0 left-0 w-full z-0 transition-all duration-500 ease-in-out ${isSheetExpanded ? 'h-[45vh]' : 'h-[88vh]'}`}>
                <div className="w-full h-full relative">
                    <MapContainer
                        center={center}
                        zoom={16}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; CARTO'
                        />
                        {latitude && longitude && (
                            <>
                                <MapUpdater center={center} routeCoords={currentOrder?.status === 'em_rota' && routePath.length > 0 ? routePath : []} followUser={isNavigationMode} />

                                <Marker position={center} icon={motoboyIcon} />

                                {(currentOrder?.status === 'em_rota' || currentOrder?.status === 'retirado') && routePath.length > 0 && (
                                    <>
                                        <Polyline
                                            positions={routePath}
                                            pathOptions={{
                                                color: '#000000', // Linha preta Uber Style para tema claro
                                                weight: 6,
                                                opacity: 0.8,
                                                lineJoin: 'round',
                                            }}
                                        />

                                        {/* Label da Farmácia (Origem) */}
                                        {currentOrder.pharmacies?.latitude && (
                                            <Marker position={[currentOrder.pharmacies.latitude, currentOrder.pharmacies.longitude]} icon={L.divIcon({
                                                className: 'custom-div-icon',
                                                html: `<div class="bg-black text-white text-[10px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap border border-white/20">${currentOrder.pharmacies.name}</div>`,
                                                iconAnchor: [0, 40]
                                            })} />
                                        )}

                                        {/* Label do Cliente (Destino) */}
                                        {(currentOrder.delivery_lat || currentOrder.latitude) && (
                                            <>
                                                <Marker
                                                    position={[currentOrder.delivery_lat ?? currentOrder.latitude, currentOrder.delivery_lng ?? currentOrder.longitude]}
                                                    icon={destinationIcon}
                                                />
                                                <Marker position={[currentOrder.delivery_lat ?? currentOrder.latitude, currentOrder.delivery_lng ?? currentOrder.longitude]} icon={L.divIcon({
                                                    className: 'custom-div-icon',
                                                    html: `<div class="bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap border-2 border-black flex items-center gap-1">
                                                        <span class="bg-black text-white px-1 rounded-sm text-[8px]">CHEGADA</span>
                                                        ${currentOrder.profiles?.full_name?.split(' ')[0] || 'Cliente'}
                                                    </div>`,
                                                    iconAnchor: [50, 45]
                                                })} />
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </MapContainer>

                    {/* Recenter Button */}
                    <button
                        onClick={() => {
                            // O MapUpdater com followUser já cuida disso se mudarmos o estado de navegação
                            // ou apenas forçamos o mapa a centrar agora.
                            setIsNavigationMode(true);
                            setTimeout(() => setIsNavigationMode(false), 100);
                        }}
                        className="absolute bottom-32 right-4 z-[400] size-12 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
                    >
                        <MaterialIcon name="my_location" />
                    </button>





                    {/* Top Bar Overlay Glass */}
                    <div className="absolute top-0 left-0 right-0 z-[400] bg-white/70 dark:bg-black/60 backdrop-blur-xl p-4 flex items-center justify-between border-b border-white/20 dark:border-white/5 shadow-sm">
                        <div className="flex size-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 cursor-pointer backdrop-blur-md transition-all active:scale-95" onClick={() => setShowMenu(true)}>
                            <MaterialIcon name="menu" className="text-lg text-slate-800 dark:text-white" />
                        </div>
                        <div className="flex-1 text-center pr-10">
                            <h2 className="text-lg font-black italic tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
                                #{currentOrder.id.substring(0, 5)}
                            </h2>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-300">Em andamento</p>
                        </div>
                    </div>

                    {/* Banner de Aviso de Som (Nav Mode) */}
                    {(!audioEnabled || isSoundBlocked) && (
                        <div className="absolute top-[80px] left-4 right-4 z-[400] bg-red-500 text-white p-3 rounded-2xl flex items-center justify-between gap-3 animate-pulse shadow-2xl">
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="volume_off" className="text-xl" />
                                <p className="text-[10px] font-black leading-tight uppercase tracking-wider">
                                    Som travado pelo navegador
                                </p>
                            </div>
                            <button
                                onClick={enableAudio}
                                className="bg-white text-red-500 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm active:scale-95"
                            >
                                ATIVAR
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Sheet - Uber Style */}
            <div
                className={`relative z-[40] rounded-t-[3rem] bg-white dark:bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] transition-all duration-700 ease-in-out flex flex-col ${isSheetExpanded ? 'mt-[40vh] min-h-[60vh] pb-8' : 'mt-[calc(100vh-260px)] min-h-[260px] cursor-pointer'}`}
                onClick={() => !isSheetExpanded && setIsSheetExpanded(true)}
            >
                {/* Handle - Retractable & Tap Area */}
                <div
                    className="flex w-full items-center justify-center py-5 cursor-pointer group touch-none shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsSheetExpanded(!isSheetExpanded);
                    }}
                >
                    <div className="flex flex-col items-center gap-1.5">
                        <div className={`h-1.5 w-14 rounded-full transition-all duration-300 ${isSheetExpanded ? 'bg-slate-200 dark:bg-slate-700' : 'bg-primary w-20 shadow-[0_0_15px_rgba(19,236,109,0.8)]'}`}></div>
                        <p className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${isSheetExpanded ? 'text-slate-400 opacity-0' : 'text-primary opacity-100 animate-pulse'}`}>
                            {isSheetExpanded ? 'Recolher' : 'Toque para detalhes'}
                        </p>
                    </div>
                </div>

                {/* Conteúdo rolável do card - Só visível quando expandido ou parcialmente visível */}
                <div className={`flex-1 transition-opacity duration-300 ${isSheetExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0'}`}>

                    {/* Uber Style Promo/Alert */}
                    <div className="px-6 mb-4">
                        <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl flex items-center justify-between border border-red-100 dark:border-red-900/20">
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="local_offer" className="text-red-500 text-lg" />
                                <p className="text-xs font-bold text-red-600 dark:text-red-400">Entrega Expressa</p>
                            </div>
                            <p className="text-[10px] font-black uppercase text-red-400">Prioritário</p>
                        </div>
                    </div>

                    {/* Main Delivery Info Card - iFarma Style */}
                    <div className="px-6 mb-6">
                        <div className="bg-white dark:bg-slate-800 p-1 rounded-3xl border-2 border-black dark:border-white/10 shadow-sm">
                            <div className="flex items-center p-4 gap-4">
                                <div className="size-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center shrink-0">
                                    <MaterialIcon name="medication" className="text-3xl text-slate-800 dark:text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black italic tracking-tighter truncate max-w-[150px]">
                                            {currentOrder.pharmacies?.name || 'Farmácia iFarma'}
                                        </h3>
                                        <div className="flex flex-col items-end">
                                            <p className="text-[9px] font-black bg-primary text-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                #{currentOrder.id.substring(0, 5)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400">
                                            {currentOrder.status === 'retirado' ? 'Entrega em curso' : 'Aguardando Retirada'}
                                        </p>
                                        <div className="size-1 rounded-full bg-slate-300"></div>
                                        <p className="text-[10px] font-black uppercase text-slate-400">
                                            {distanceToDest ? `${(distanceToDest / 1000).toFixed(1)} km` : 'Calculando...'}
                                        </p>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Seu Repasse</p>
                                            <p className="text-lg font-black text-primary leading-tight">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.delivery_fee || 0)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase text-slate-400">
                                                {currentOrder.payment_method === 'cash' ? 'Receber Dinheiro' : 'Pagamento Online'}
                                            </p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_price || currentOrder.total_amount || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Grid (Contact) */}
                    <div className="grid grid-cols-2 gap-4 px-6 mb-6">
                        <a href={`tel:${currentOrder.profiles?.phone || ''}`} className="flex items-center justify-center gap-2 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-800 dark:text-white transition-all active:scale-95">
                            <MaterialIcon name="call" />
                            Ligar
                        </a>
                        <button
                            onClick={() => {
                                setUnreadChatCount(0);
                                navigate('/motoboy-chat/' + currentOrder.id);
                            }}
                            className="relative flex items-center justify-center gap-2 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-800 dark:text-white transition-all active:scale-95"
                        >
                            <MaterialIcon name="chat" />
                            Chat
                            {unreadChatCount > 0 && (
                                <div className="absolute -top-1 -right-1 bg-primary text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg ring-4 ring-white dark:ring-slate-900 z-10">
                                    {unreadChatCount}
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Customer & Address */}
                    <div className="px-6 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-black text-white shrink-0">
                                {(currentOrder.profiles?.full_name || currentOrder.client_name || 'C').charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black uppercase tracking-tight text-slate-400">Destino</p>
                                <p className="text-lg font-bold leading-none mt-1">{currentOrder.profiles?.full_name || currentOrder.client_name || 'Cliente'}</p>
                                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mt-1 leading-snug">
                                    {currentOrder.address}
                                </p>
                            </div>
                        </div>

                        {/* Payment Info Card */}
                        <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pagamento</span>
                                <span className="text-xs font-black text-primary uppercase">
                                    {currentOrder.payment_method === 'pix' ? 'PIX' :
                                        currentOrder.payment_method === 'cash' ? 'Dinheiro' :
                                            currentOrder.payment_method === 'credit' ? 'Cartão (Crédito)' :
                                                currentOrder.payment_method === 'debit' ? 'Cartão (Débito)' : 'A Combinar'}
                                </span>
                            </div>
                            {currentOrder.payment_method === 'cash' && (
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-500">Troco para:</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-white">
                                        {currentOrder.change_for ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.change_for) : 'Não precisa'}
                                    </span>
                                </div>
                            )}
                            {currentOrder.payment_method === 'cash' && currentOrder.change_for && (
                                <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between opacity-60">
                                        <span className="text-[10px] font-bold">Total do Pedido:</span>
                                        <span className="text-xs font-bold">
                                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_price || currentOrder.total_amount || 0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">Troco a devolver:</span>
                                        <span className="text-sm font-black text-red-500">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(currentOrder.change_for) - Number(currentOrder.total_price || currentOrder.total_amount || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Instructions */}
                        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                            <h4 className="text-[10px] font-black uppercase text-blue-400 mb-1 flex items-center gap-1">
                                <MaterialIcon name="info" className="text-xs" />
                                Observações
                            </h4>
                            <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed font-medium">
                                {currentOrder.notes || "Nenhuma observação informada."}
                            </p>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="px-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold">Itens do Pedido</h4>
                            <span className="text-sm text-[#61896f] font-bold">
                                Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_price || currentOrder.total_amount || 0)}
                            </span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {currentOrder.order_items && currentOrder.order_items.length > 0 ? (
                                currentOrder.order_items.map((item: any, idx: number) => (
                                    <div key={item.id || idx} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl">
                                        <div className="bg-gray-100 dark:bg-slate-700 size-12 rounded-lg flex items-center justify-center shrink-0">
                                            {(item.products?.image_url || item.image_url) ? (
                                                <img src={item.products?.image_url || item.image_url} alt={item.products?.name || item.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <MaterialIcon name="medication" className="text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate">{item.products?.name || item.product_name || item.name || 'Produto'}</p>
                                            <p className="text-xs text-slate-500">Qtd: {item.quantity || 1}x</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.price || item.unit_price || 0) * (item.quantity || 1))}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl text-slate-400 text-sm">
                                    <MaterialIcon name="shopping_bag" className="text-3xl mb-2 opacity-20" />
                                    <p>Nenhum item listado.</p>
                                    <p className="text-[10px] mt-1 opacity-60">ID do Pedido: {currentOrder.id.split('-')[0]}...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Actions - Now PART of the Sheet for better layering */}
                    <div className={`sticky bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 z-50 transition-transform ${!isSheetExpanded ? 'translate-y-0' : ''}`}>
                        <div className="flex flex-col gap-3 max-w-lg mx-auto">

                            {/* Buzina Option (Só se estiver em rota) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleArrived(); }}
                                className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors active:scale-95"
                            >
                                <MaterialIcon name="volume_up" className="text-sm" />
                                Enviar Aviso Sonoro (Buzina)
                            </button>

                            {/* Ação Principal: Aceitar / Confirmar */}
                            <div className="w-full">
                                {currentOrder.status === 'pronto_entrega' ? (
                                    !hasAccepted ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setHasAccepted(true);
                                                isProcessingAction.current = true;
                                                stopAudio();
                                                setTimeout(() => { isProcessingAction.current = false; }, 4000);
                                            }}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-green-600/20"
                                        >
                                            <MaterialIcon name="thumb_up" /> ACEITAR ENTREGA
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleConfirmPickup(); }}
                                            className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/20"
                                        >
                                            <MaterialIcon name="inventory" /> CONFIRMAR RETIRADA
                                        </button>
                                    )
                                ) : currentOrder.status === 'retirado' ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAutoOpenMap();
                                            setHasStartedRoute(true);
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-500/20"
                                    >
                                        <MaterialIcon name="near_me" /> INICIAR ROTA
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {(() => {
                                            const hasCoords = !!currentOrder.delivery_lat;
                                            const isClose = distanceToDest !== null && distanceToDest <= 100;
                                            const canConfirm = !hasCoords || isClose;
                                            return (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (canConfirm) navigate(`/motoboy-confirm/${currentOrder.id}`);
                                                    }}
                                                    disabled={!canConfirm}
                                                    className={`w-full font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 transition-all shadow-xl
                                                    ${canConfirm ? 'bg-primary hover:bg-primary/90 text-black shadow-primary/20 active:scale-95' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'}
                                                `}
                                                >
                                                    {canConfirm ? (
                                                        <><MaterialIcon name="check_circle" /> CONFIRMAR ENTREGA</>
                                                    ) : (
                                                        <><MaterialIcon name="location_off" /> {distanceToDest === null ? "AGUARDANDO GPS..." : `APROXIME-SE (${Math.round(distanceToDest)}m)`}</>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* iOS Safe Area Spacer */}
                        <div className="h-4"></div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default MotoboyDashboard;
