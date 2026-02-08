import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWakeLock } from '../hooks/useWakeLock';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { useAudio } from '../hooks/useAudio';
import { useMotoboyQueue } from '../hooks/useMotoboyQueue';
import { useMotoboyMap } from '../hooks/useMotoboyMap';
import { DeliveryView } from '../components/motoboy/DeliveryView';
import { DashboardView } from '../components/motoboy/DashboardView';
import { MaterialIcon } from '../components/MaterialIcon';

const darkModeStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

import { useNotifications } from '../hooks/useNotifications';

const MotoboyDashboard = ({ session, profile }: { session: any, profile: any }) => {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(profile?.is_online || false);
    const [currentView, setCurrentView] = useState<'dashboard' | 'delivery'>('dashboard');
    const [showMenu, setShowMenu] = useState(false);
    const [isNavigationMode, setIsNavigationMode] = useState(false);
    const [notificationSound] = useState<'voice' | 'bell'>(() => (localStorage.getItem('ifarma_motoboy_sound') as any) || 'bell');
    const [loading, setLoading] = useState(false);
    const [isSheetExpanded, setIsSheetExpanded] = useState(true);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [acceptedOrders, setAcceptedOrders] = useState<string[]>(() => {
        const saved = localStorage.getItem('ifarma_accepted_orders');
        return saved ? JSON.parse(saved) : [];
    });

    const { unreadCount: globalUnreadCount } = useNotifications(session?.user?.id);

    useEffect(() => {
        localStorage.setItem('ifarma_accepted_orders', JSON.stringify(acceptedOrders));
    }, [acceptedOrders]);

    const {
        ordersQueue, setOrdersQueue, stats, unreadChatCount, setUnreadChatCount,
        newOrderAlert, fetchOrdersQueue, isProcessingAction
    } = useMotoboyQueue(session?.user?.id, notificationSound);

    const currentOrder = ordersQueue.length > 0 ? ordersQueue[0] : null;
    const hasAccepted = currentOrder ? acceptedOrders.includes(currentOrder.id) : false;
    const { latitude, longitude } = useGeolocation(session?.user?.id, isOnline, currentOrder?.id);

    const {
        mapRef, mapReady, distanceToDest, eta, mapInstance, userMarker
    } = useMotoboyMap(currentOrder, latitude, longitude, currentView, isNavigationMode, darkModeStyle);

    const { play: playAudio, stop: stopAudio } = useAudio();

    useWakeLock(!!currentOrder && currentOrder.status === 'em_rota');

    useEffect(() => {
        if (!session?.user) navigate('/motoboy-login');
    }, [session, navigate]);

    useEffect(() => {
        if (currentOrder && ['retirado', 'em_rota'].includes(currentOrder.status)) {
            if (!acceptedOrders.includes(currentOrder.id)) {
                setAcceptedOrders(prev => [...prev, currentOrder.id]);
            }
        }
    }, [currentOrder?.id, currentOrder?.status]);

    useEffect(() => {
        if (currentView === 'delivery' && !currentOrder && !isProcessingAction.current) {
            setCurrentView('dashboard');
        }
    }, [currentOrder, currentView]);

    useEffect(() => {
        const initPerms = async () => {
            if (Capacitor.isNativePlatform()) await Geolocation.requestPermissions();
            if (window.Notification && Notification.permission !== 'granted') await Notification.requestPermission();
        };
        initPerms();
    }, []);

    const toggleOnline = async () => {
        const newStatus = !isOnline;
        let battery = {};
        if (newStatus && 'getBattery' in navigator) {
            const b: any = await (navigator as any).getBattery();
            battery = { battery_level: Math.round(b.level * 100), is_charging: b.charging };
        }
        const { error } = await supabase.from('profiles').update({ is_online: newStatus, ...battery }).eq('id', session.user.id);
        if (!error) setIsOnline(newStatus);
    };

    const handleAcceptOrder = async (order: any) => {
        setLoading(true);
        isProcessingAction.current = true;

        // Sincronizar status 'aceito' no banco para evitar conflitos
        const { error } = await supabase.from('orders')
            .update({ status: 'aceito' })
            .eq('id', order.id);

        if (!error) {
            setAcceptedOrders(prev => [...new Set([...prev, order.id])]);
            setOrdersQueue((prev: any[]) => prev.map(o => o.id === order.id ? { ...o, status: 'aceito' } : o));
            setCurrentView('delivery');
        }
        stopAudio();

        // Simular um delay para feedback visual e evitar eco de Realtime
        setTimeout(() => { isProcessingAction.current = false; setLoading(false); }, 4000);
    };

    const handleConfirmPickup = async () => {
        if (!currentOrder) return;
        isProcessingAction.current = true;
        const ids = ordersQueue.filter(o => ['pronto_entrega', 'aguardando_retirada'].includes(o.status)).map(o => o.id);
        const { error } = await supabase.from('orders').update({
            status: 'retirado',
            picked_up_at: new Date().toISOString()
        }).in('id', ids.length ? ids : [currentOrder.id]);
        if (!error) {
            stopAudio();
            setOrdersQueue((prev: any[]) => prev.map(o => ids.includes(o.id) ? { ...o, status: 'retirado' } : o));
        }
        setTimeout(() => { isProcessingAction.current = false; }, 4000);
    };

    const handleStartRoute = async () => {
        if (!currentOrder) return;
        isProcessingAction.current = true;
        const { error } = await supabase.from('orders').update({ status: 'em_rota' }).eq('id', currentOrder.id);
        if (!error) {
            setOrdersQueue((prev: any[]) => prev.map(o => o.id === currentOrder.id ? { ...o, status: 'em_rota' } : o));
            setCurrentView('delivery');
            setIsNavigationMode(true);
            setIsSheetExpanded(false);
            stopAudio();
        }
        setTimeout(() => { isProcessingAction.current = false; }, 2000);
    };

    const moveOrder = async (idx: number, dir: 'up' | 'down') => {
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= ordersQueue.length) return;
        const q = [...ordersQueue];
        [q[idx], q[target]] = [q[target], q[idx]];
        setOrdersQueue(q);
        await Promise.all(q.map((o, i) => supabase.from('orders').update({ delivery_sequence: i + 1 }).eq('id', o.id)));
    };

    const handleArrived = async () => {
        if (!currentOrder?.id) return;
        await supabase.from('orders').update({ motoboy_arrived_at: new Date().toISOString() }).eq('id', currentOrder.id);
        await supabase.from('order_messages').insert({ order_id: currentOrder.id, sender_id: session.user.id, message_type: 'horn', content: 'BI-BI!' });
        playAudio('horn');
    };

    if (!session?.user) return null;

    return (
        <div className="bg-slate-950 min-h-screen">
            {newOrderAlert && (
                <div className="fixed top-24 left-6 right-6 z-[1100] bg-primary text-slate-900 p-4 rounded-2xl font-black text-center shadow-2xl animate-bounce border-4 border-white/20">
                    {newOrderAlert}
                </div>
            )}

            {currentView === 'delivery' && currentOrder ? (
                <DeliveryView
                    currentOrder={currentOrder}
                    isSheetExpanded={isSheetExpanded}
                    setIsSheetExpanded={setIsSheetExpanded}
                    mapRef={mapRef}
                    mapInstance={mapInstance.current}
                    userMarker={userMarker}
                    distanceToDest={distanceToDest}
                    eta={eta}
                    unreadChatCount={unreadChatCount}
                    setUnreadChatCount={setUnreadChatCount}
                    hasAccepted={hasAccepted}
                    handleAcceptOrder={handleAcceptOrder}
                    handleConfirmPickup={handleConfirmPickup}
                    handleAutoOpenMap={handleStartRoute}
                    handleArrived={handleArrived}
                    isCancelModalOpen={isCancelModalOpen}
                    setIsCancelModalOpen={setIsCancelModalOpen}
                    setCurrentView={setCurrentView}
                />
            ) : (
                <DashboardView
                    profile={profile}
                    isOnline={isOnline}
                    toggleOnline={toggleOnline}
                    setShowMenu={setShowMenu}
                    stats={stats}
                    currentOrder={currentOrder}
                    ordersQueue={ordersQueue}
                    fetchOrdersQueue={fetchOrdersQueue}
                    handleAcceptOrder={handleAcceptOrder}
                    moveOrder={moveOrder}
                    setCurrentView={setCurrentView}
                    unreadCount={globalUnreadCount}
                    onViewNotifications={() => navigate('/motoboy-notifications')}
                />
            )}

            {showMenu && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md" onClick={() => setShowMenu(false)}>
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 shadow-2xl p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black italic text-white uppercase">Menu</h2>
                            <button onClick={() => setShowMenu(false)} className="size-10 bg-slate-800 rounded-xl flex items-center justify-center text-white"><MaterialIcon name="close" /></button>
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => playAudio(notificationSound === 'voice' ? 'voice' : 'new_order', 1)} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-slate-800 text-white font-bold text-xs uppercase tracking-widest border border-white/5 active:scale-95"><MaterialIcon name="volume_up" className="text-primary" /> Testar Alerta</button>
                            <button onClick={() => navigate('/motoboy-history')} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-slate-800 text-white font-bold text-xs uppercase tracking-widest border border-white/5 active:scale-95"><MaterialIcon name="history" className="text-blue-400" /> Histórico</button>
                            <button onClick={() => navigate('/motoboy-earnings')} className="w-full flex items-center gap-4 p-5 rounded-3xl bg-slate-800 text-white font-bold text-xs uppercase tracking-widest border border-white/5 active:scale-95"><MaterialIcon name="account_balance_wallet" className="text-green-400" /> Meus Ganhos</button>
                            <button
                                onClick={async () => {
                                    const token = localStorage.getItem('ifarma_fcm_token');
                                    if (token) {
                                        await supabase.rpc('clean_device_token_on_logout', { p_token: token });
                                        localStorage.removeItem('ifarma_fcm_token');
                                    }
                                    await supabase.auth.signOut();
                                    navigate('/login');
                                }}
                                className="w-full flex items-center justify-center gap-3 p-5 rounded-3xl bg-slate-950 text-slate-500 font-black text-xs uppercase tracking-widest mt-10"
                            >
                                <MaterialIcon name="logout" /> Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MotoboyDashboard;
