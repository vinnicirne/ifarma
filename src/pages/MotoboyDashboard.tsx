import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// Removed Leaflet imports
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRouteData } from '../hooks/useRouteData';
import { useWakeLock } from '../hooks/useWakeLock';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { MaterialIcon } from '../components/MaterialIcon';
import { useAudio } from '../hooks/useAudio';
import { OrderCancellationModal } from '../components/OrderCancellationModal';

const MotoboyDashboard = ({ session, profile }: { session: any, profile: any }) => {
    const navigate = useNavigate();

    // Google Maps Refs
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const directionsRenderer = useRef<any>(null);
    const userMarker = useRef<any>(null);

    // Dark Mode Style (Optional, simple dark theme)
    const darkModeStyle = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    ];

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
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

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
    const [routePath, setRoutePath] = useState<any[]>([]); // Armazena as coordenadas da rota para desenho

    // --- 1. GEOLOCATION ---
    const { latitude, longitude } = useGeolocation(session?.user?.id, isOnline, currentOrder?.id);

    // --- GOOGLE MAPS INIT & UPDATE ---
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;
        if (!(window as any).google) return;

        const google = (window as any).google;

        // Init Map
        mapInstance.current = new google.maps.Map(mapRef.current, {
            center: { lat: latitude || -22.9, lng: longitude || -43.1 },
            zoom: 15,
            disableDefaultUI: true,
            zoomControl: false,
            styles: document.documentElement.classList.contains('dark') ? darkModeStyle : []
        });

        // Init Renderer
        directionsRenderer.current = new google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: false,
            preserveViewport: false,
            polylineOptions: { strokeColor: '#13ec6d', strokeWeight: 6 }
        });

        // Init User Marker (Motoboy)
        userMarker.current = new google.maps.Marker({
            map: mapInstance.current,
            position: mapInstance.current.getCenter(),
            title: "Sua Posição",
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "#000",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFF",
                rotation: 0
            }
        });
    }, [mapRef, latitude, longitude]);

    // Update User Position
    useEffect(() => {
        if (latitude && longitude && userMarker.current) {
            const pos = { lat: latitude, lng: longitude };
            userMarker.current.setPosition(pos);
            if (isNavigationMode) {
                mapInstance.current?.panTo(pos);
                mapInstance.current?.setZoom(17);
            }
        }
    }, [latitude, longitude, isNavigationMode]);

    // Fetch Route Logic
    const fetchRoute = (startLat: number, startLng: number, destLat: number, destLng: number) => {
        if (!(window as any).google || !directionsRenderer.current) return;
        const google = (window as any).google;
        const ds = new google.maps.DirectionsService();

        ds.route({
            origin: { lat: startLat, lng: startLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING
        }, (result: any, status: any) => {
            if (status === 'OK') {
                directionsRenderer.current.setDirections(result);
                const leg = result.routes[0].legs[0];
                if (leg.distance?.value) setDistanceToDest(leg.distance.value);
            } else {
                console.error("Directions Error:", status);
            }
        });
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


    // --- AUTO-ROUTE ENGINE ---
    // Monitora o status e coordenadas para desenhar a rota automaticamente
    useEffect(() => {
        if (!currentOrder || !latitude || !longitude) return;

        const autoDrawRoute = () => {
            // Só desenha se tivermos um destino válido e renderer
            if (!directionsRenderer.current || !mapInstance.current) return;

            let destLat, destLng;
            let mode = 'DRIVING'; // Default

            if (currentOrder.status === 'pronto_entrega' || currentOrder.status === 'aceito') {
                // Destino: Farmácia
                destLat = Number(currentOrder.pharmacies?.latitude);
                destLng = Number(currentOrder.pharmacies?.longitude);
            } else if (currentOrder.status === 'retirado' || currentOrder.status === 'em_rota') {
                // Destino: Cliente
                destLat = Number(currentOrder.delivery_lat ?? currentOrder.latitude); // Fallback to addr lat
                destLng = Number(currentOrder.delivery_lng ?? currentOrder.longitude);
            }

            if (destLat && destLng) {
                // Evita redesenhar se já estivermos perto (opcional, mas bom pra performance)
                // Mas aqui vamos forçar para garantir que o rastro apareça
                fetchRoute(latitude, longitude, destLat, destLng);
            }
        };

        // Debounce curto para não spammar
        const t = setTimeout(autoDrawRoute, 1000);
        return () => clearTimeout(t);
    }, [currentOrder?.id, currentOrder?.status, latitude, longitude]);


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
            {/* Map Section (Fixed Top Half) */}
            <div className={`fixed top-0 left-0 w-full z-0 transition-all duration-500 ease-in-out ${isSheetExpanded ? 'h-[45vh]' : 'h-[88vh]'}`}>
                <div className="w-full h-full relative">
                    <div ref={mapRef} id="google-map" className="w-full h-full bg-slate-200 dark:bg-slate-800" />

                    {/* Recenter Button */}
                    <button
                        onClick={() => {
                            if (mapInstance.current && userMarker.current) {
                                mapInstance.current.panTo(userMarker.current.getPosition());
                                mapInstance.current.setZoom(17);
                            }
                        }}
                        className="absolute bottom-32 right-4 z-[400] size-12 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
                    >
                        <MaterialIcon name="my_location" />
                    </button>

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

            {/* Bottom Sheet - Uber Style & Fixed Height Logic */}
            <div
                className={`fixed left-0 right-0 z-[50] bg-white dark:bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-all duration-500 ease-bezier rounded-t-[2.5rem] flex flex-col ${isSheetExpanded ? 'top-[15vh] bottom-0' : 'bottom-0 h-[140px]'}`}
                style={{ touchAction: 'none' }}
            >
                {/* Handle - Always Visible & Draggable */}
                <div
                    className="w-full h-8 flex items-center justify-center cursor-pointer shrink-0"
                    onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                >
                    <div className={`h-1.5 w-12 rounded-full transition-colors ${isSheetExpanded ? 'bg-slate-300 dark:bg-slate-600' : 'bg-primary animate-pulse'}`} />
                </div>

                {/* Main Content Container - Scrollable if Expanded */}
                <div className="flex-1 overflow-y-auto px-6 pb-24">

                    {/* ALWAYS VISIBLE HEADER (Even when closed, this shows at top) */}
                    <div className="mb-6" onClick={() => !isSheetExpanded && setIsSheetExpanded(true)}>
                        <div className="flex items-center gap-4 mb-2">
                            {/* Icon Box */}
                            <div className="size-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                <MaterialIcon name="storefront" className="text-2xl text-slate-700 dark:text-gray-300" />
                            </div>

                            {/* Text Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-black italic tracking-tight truncate text-slate-900 dark:text-white">
                                    {currentOrder.pharmacies?.name || 'Farmácia Parceira'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${currentOrder.status === 'retirado' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {currentOrder.status === 'retirado' ? 'ENTREGA' : 'COLETA'}
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold">•</span>
                                    <span className="text-xs text-slate-500 font-bold">#{currentOrder.id.substring(0, 5)}</span>
                                </div>
                            </div>

                            {/* Distance Badge */}
                            <div className="flex flex-col items-end">
                                <span className="text-xl font-black text-slate-900 dark:text-white">
                                    {distanceToDest ? (distanceToDest / 1000).toFixed(1) : '--'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">km</span>
                            </div>
                        </div>
                    </div>

                    {/* EXPANDED CONTENT - DETAILS */}
                    <div className={`transition-opacity duration-300 ${isSheetExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}>

                        {/* Status Bar */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MaterialIcon name="schedule" className="text-slate-400 text-sm" />
                                <span className="text-xs font-bold text-slate-500">Tempo estimado</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">15-20 min</span>
                        </div>

                        {/* Actions Grid (Contact) */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
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
                        <div className="mb-6">
                            <div className="flex items-start gap-4 mb-4">
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
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pagamento</span>
                                    <span className="text-xs font-black text-primary uppercase">
                                        {currentOrder.payment_method === 'pix' ? 'PIX' :
                                            currentOrder.payment_method === 'cash' ? 'Dinheiro' : 'Cartão'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-500">Valor Total:</span>
                                    <span className="text-lg font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_price || currentOrder.total_amount || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
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
                        {/* BOTTOM ACTIONS - INSIDE EXPANDED CONTENT */}
                        <div className="mt-8 mb-4">
                            {/* Buzina Option (Só se estiver em rota) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleArrived(); }}
                                className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-primary transition-colors active:scale-95 mb-4"
                            >
                                <MaterialIcon name="volume_up" className="text-sm" />
                                Enviar Aviso Sonoro (Buzina)
                            </button>

                            {/* Botão de Cancelamento (Emergência) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsCancelModalOpen(true); }}
                                className="w-full text-center text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors py-2 mb-4"
                            >
                                Cancelar Entrega
                            </button>

                            <OrderCancellationModal
                                isOpen={isCancelModalOpen}
                                onClose={() => setIsCancelModalOpen(false)}
                                userRole="motoboy"
                                onConfirm={async (reason) => {
                                    try {
                                        if (!currentOrder?.id) return;
                                        const { error: updateError } = await supabase
                                            .from('orders')
                                            .update({ status: 'cancelado', cancellation_reason: reason })
                                            .eq('id', currentOrder.id);

                                        if (updateError) throw updateError;
                                        setNewOrderAlert("PEDIDO CANCELADO");
                                        setIsCancelModalOpen(false);
                                    } catch (err) {
                                        console.error("Erro ao cancelar:", err);
                                        alert("Erro ao cancelar pedido. Tente novamente.");
                                    }
                                }}
                            />

                            {/* MAIN ACTION BUTTON */}
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                stopAudio(); // FIX: Stop audio
                                                handleConfirmPickup();
                                            }}
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

                    </div>
                </div>
            </div>
        </div>
    );
};

export default MotoboyDashboard;
