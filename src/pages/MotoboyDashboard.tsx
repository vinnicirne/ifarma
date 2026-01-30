import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
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
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showNavOptions, setShowNavOptions] = useState(false);

    // Audio & Alerts States
    const [notificationSound, setNotificationSound] = useState<'voice' | 'bell'>(() => {
        return (localStorage.getItem('ifarma_motoboy_sound') as any) || 'voice';
    });
    const [isSoundBlocked, setIsSoundBlocked] = useState(false);
    const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
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
                            resolve();
                        });
                    });
                }
                if (i < repeatCount - 1) await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error("Erro na sequência de notificação:", err);
            }
        }
    };

    const openMap = (app: 'google' | 'waze' | 'apple') => {
        if (!currentOrder?.pharmacies) return;

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

    // Ativar rastreamento apenas quando online
    const geoState = useGeolocation(session?.user?.id, isOnline);



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
                .in('status', ['aguardando_motoboy', 'em_rota'])
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

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-slate-900">
            {/* Mapa em Tela Cheia */}
            <div className="absolute inset-0 w-full h-full z-0">
                <MapContainer
                    center={center}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {geoState.latitude && geoState.longitude && (
                        <>
                            <MapUpdater center={center} />
                            <Marker position={center} icon={motoboyIcon} />
                            <Circle
                                center={center}
                                radius={geoState.accuracy || 50}
                                pathOptions={{
                                    fillColor: '#4285F4',
                                    fillOpacity: 0.1,
                                    color: '#4285F4',
                                    weight: 1
                                }}
                            />
                        </>
                    )}
                </MapContainer>
            </div>

            {/* Overlay escuro se offline - Mobile */}
            {!isOnline && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-xs w-full text-center">
                        <MaterialIcon name="power_settings_new" className="text-5xl text-slate-400 mb-3" />
                        <h2 className="text-xl font-black mb-2">Você está Offline</h2>
                        <p className="text-slate-500 text-sm mb-4">Ative o modo online para começar a receber pedidos</p>
                        <button
                            onClick={toggleOnline}
                            className="w-full bg-green-500 text-white font-bold py-3 rounded-2xl active:scale-95 transition-transform"
                        >
                            🟢 Ficar Online
                        </button>
                    </div>
                </div>
            )}

            {/* Header Flutuante - Mobile Optimized */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3 safe-area-top">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-green-400 rounded-full flex items-center justify-center text-white font-black text-lg">
                                {profile?.full_name?.charAt(0) || 'M'}
                            </div>
                            <div>
                                <h1 className="font-black text-sm">{profile?.full_name || 'Motoboy'}</h1>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                    <span className="text-[10px] font-bold text-slate-500">
                                        {isOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setIsSoundBlocked(false);
                                    playNotificationSound(1);
                                }}
                                className="w-9 h-9 bg-primary/20 text-primary rounded-full flex items-center justify-center active:scale-95 transition-transform"
                                title="Testar Som"
                            >
                                <MaterialIcon name="volume_up" className="text-lg" />
                            </button>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <MaterialIcon name="menu" className="text-lg" />
                            </button>
                        </div>
                    </div>

                    {/* Status GPS - Compacto */}
                    {isOnline && geoState.isTracking && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <MaterialIcon name="gps_fixed" className="text-green-500 text-xs animate-pulse" />
                                    <span className="font-bold text-green-500">GPS Ativo</span>
                                </div>
                                <span className="text-slate-500 font-mono">
                                    {geoState.accuracy?.toFixed(0)}m
                                </span>
                            </div>
                        </div>
                    )}

                    {geoState.error && (
                        <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                            <p className="text-red-500 text-[10px] font-bold">{geoState.error}</p>
                        </div>
                    )}

                    {/* Banner de Som Bloqueado */}
                    {isSoundBlocked && (
                        <button
                            onClick={() => {
                                setIsSoundBlocked(false);
                                playNotificationSound(1);
                            }}
                            className="mt-2 w-full bg-orange-500 text-white text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-2 animate-pulse"
                        >
                            <MaterialIcon name="volume_off" className="text-xs" />
                            Toque aqui para liberar o som
                        </button>
                    )}

                    {/* Alerta de Novo Pedido (Toast) */}
                    {newOrderAlert && (
                        <div
                            className="mt-2 bg-green-500 text-white p-3 rounded-xl flex items-center gap-3 animate-bounce shadow-lg cursor-pointer"
                            onClick={() => setNewOrderAlert(null)}
                        >
                            <MaterialIcon name="notifications_active" className="text-xl" />
                            <div>
                                <p className="font-black text-[10px] uppercase">Novo Pedido!</p>
                                <p className="text-xs font-bold leading-none">{newOrderAlert}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Card Inferior Flutuante - Mobile Optimized */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-3 safe-area-bottom">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-4">
                    {currentOrder ? (
                        <>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                    <MaterialIcon name="delivery_dining" className="text-primary text-xl" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-sm truncate">Entrega em Andamento</h3>
                                    <p className="text-[10px] text-slate-500">#{currentOrder.id.substring(0, 8)}</p>
                                </div>
                                <button className="w-9 h-9 bg-primary rounded-full flex items-center justify-center active:scale-95 transition-transform">
                                    <MaterialIcon name="navigation" className="text-black text-lg" />
                                </button>
                            </div>

                            <div className="space-y-2 mb-3">
                                <div className="flex items-start gap-2">
                                    <MaterialIcon name="store" className="text-primary text-sm mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-slate-500 font-bold">ORIGEM</p>
                                        <p className="font-bold text-xs truncate">{currentOrder.pharmacies?.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <MaterialIcon name="location_on" className="text-red-500 text-sm mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-slate-500 font-bold">DESTINO</p>
                                        <p className="font-bold text-xs truncate">{currentOrder.address}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowNavOptions(true)}
                                className="w-full bg-primary text-black font-black py-3 rounded-xl text-sm active:scale-95 transition-transform">
                                Iniciar Navegação
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <MaterialIcon name="inbox" className="text-4xl text-slate-300 mb-2" />
                            <h3 className="font-black text-base mb-1">Aguardando Pedidos</h3>
                            <p className="text-slate-500 text-xs px-4">
                                {isOnline
                                    ? 'Você receberá uma notificação quando houver um novo pedido'
                                    : 'Fique online para receber pedidos'}
                            </p>

                            {/* Estatísticas - Compactas */}
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
                                    <p className="text-xl font-black">0</p>
                                    <p className="text-[8px] text-slate-500 uppercase font-bold">Hoje</p>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
                                    <p className="text-xl font-black">0</p>
                                    <p className="text-[8px] text-slate-500 uppercase font-bold">Semana</p>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
                                    <p className="text-xl font-black">0</p>
                                    <p className="text-[8px] text-slate-500 uppercase font-bold">Total</p>
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-600 dark:text-slate-400 text-center mt-4 font-mono select-all">
                                ID: {session?.user?.id}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Botão de Status Online/Offline - Mobile */}
            {isOnline && (
                <button
                    onClick={toggleOnline}
                    className="absolute top-20 right-3 z-20 bg-green-500 text-white font-bold px-3 py-2 rounded-full shadow-2xl flex items-center gap-1.5 text-xs active:scale-95 transition-transform"
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Online
                </button>
            )}

            {/* Menu Lateral */}
            {showMenu && (
                <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
                    <div
                        className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black">Menu</h2>
                            <button onClick={() => setShowMenu(false)}>
                                <MaterialIcon name="close" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <button className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <MaterialIcon name="history" />
                                <span className="font-bold">Histórico</span>
                            </button>
                            <button className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <MaterialIcon name="account_balance_wallet" />
                                <span className="font-bold">Ganhos</span>
                            </button>
                            <button className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <MaterialIcon name="settings" />
                                <span className="font-bold">Configurações</span>
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default MotoboyDashboard;
