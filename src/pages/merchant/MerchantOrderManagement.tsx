import { useState, useEffect, useRef } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { OrderReceipt } from '../../components/merchant/OrderReceipt';
import { OrderChatModal } from '../../components/merchant/OrderChatModal';

// Local MaterialIcon definition to avoid dependency issues if Shared is missing
const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

// --- Subcomponent: Driver Assignment Modal ---
const AssignDriverModal = ({ isOpen, onClose, onAssign, pharmacyId }: any) => {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && pharmacyId) {
            fetchDrivers();
        }
    }, [isOpen, pharmacyId]);

    const fetchDrivers = async () => {
        setLoading(true);
        // Fetch users with role 'motoboy'
        // In a real app, you might filter by proximity or pharmacy association
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'motoboy')
            .eq('is_active', true);
        setDrivers(data || []);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Escolher Entregador</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <MaterialIcon name="close" className="text-slate-500" />
                    </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <p className="text-center text-slate-500 py-4">Buscando motoqueiros...</p>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-6">
                            <MaterialIcon name="moped" className="text-4xl text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-500">Nenhum motoboy disponível.</p>
                        </div>
                    ) : (
                        drivers.map(driver => (
                            <button
                                key={driver.id}
                                onClick={() => onAssign(driver.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all group text-left"
                            >
                                <div className="size-10 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                                    {driver.avatar_url ? <img src={driver.avatar_url} className="w-full h-full object-cover" /> : <MaterialIcon name="sports_motorsports" className="text-slate-400" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{driver.full_name || 'Motoboy'}</p>
                                    <p className="text-xs text-slate-500">{driver.phone || 'Sem telefone'}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {driver.id.substring(0, 8)}...</p>
                                </div>
                                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MaterialIcon name="check" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Subcomponent: Order Details Modal ---
const OrderDetailsModal = ({ isOpen, onClose, order, updateStatus }: any) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && order) {
            fetchItems();
        }
    }, [isOpen, order]);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('order_items')
            .select('*, products(name, image_url)')
            .eq('order_id', order.id);

        if (!error) setItems(data || []);
        setLoading(false);
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-100 dark:border-white/10 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
                    <div>
                        <h3 className="text-2xl font-black italic text-slate-900 dark:text-white">Pedido #{order.id.substring(0, 6)}</h3>
                        <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <MaterialIcon name="close" className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <MaterialIcon name="person" className="text-primary" /> Cliente
                            </h4>
                            <p className="text-slate-900 dark:text-white font-medium">
                                {order.customer_name || order.profiles?.full_name || 'Anônimo'}
                            </p>
                            <p className="text-slate-500 text-sm">{order.profiles?.phone || 'Sem telefone'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <MaterialIcon name="location_on" className="text-primary" /> Endereço
                            </h4>
                            <p className="text-slate-900 dark:text-white font-medium text-sm">
                                {order.address}
                            </p>
                            {order.complement && <p className="text-slate-500 text-xs mt-1">Comp: {order.complement}</p>}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <MaterialIcon name="shopping_basket" /> Itens do Pedido
                        </h4>
                        {loading ? (
                            <p className="text-center py-4 opacity-50">Carregando itens...</p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="size-12 bg-white rounded-lg flex items-center justify-center border border-slate-100 p-1">
                                            {item.products?.image_url ?
                                                <img src={item.products.image_url} className="w-full h-full object-contain" /> :
                                                <MaterialIcon name="medication" className="text-slate-300" />
                                            }
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 dark:text-white">{item.products?.name || 'Produto'}</p>
                                            <p className="text-xs text-slate-500">Qtd: {item.quantity}</p>
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Payment Info */}
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/20">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-green-700 dark:text-green-400">Total do Pedido</span>
                            <span className="font-black text-xl text-green-700 dark:text-green-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
                            </span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1 uppercase font-bold text-right">
                            Pagamento via {order.payment_method}
                        </p>
                        {order.change_for > 0 && (
                            <p className="text-xs text-slate-500 text-right mt-1">
                                Troco para: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.change_for)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button
                        onClick={() => {
                            if (window.confirm('Tem certeza que deseja cancelar este pedido? A ação não pode ser desfeita.')) {
                                updateStatus(order.id, 'cancelado');
                                onClose();
                            }
                        }}
                        className="px-6 py-2 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors border border-red-100 mr-auto"
                    >
                        Cancelar Pedido
                    </button>
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        Fechar
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <MaterialIcon name="print" /> Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
};

const MerchantOrderManagement = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [selectedOrderToPrint, setSelectedOrderToPrint] = useState<any>(null);

    // Modal States
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
    const [selectedOrderIdForDriver, setSelectedOrderIdForDriver] = useState<string | null>(null);

    // CHAT STATE
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [selectedChatOrder, setSelectedChatOrder] = useState<any>(null);

    const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

    // New State for Vertical Tabs (default to 'pendente')
    const [activeTabId, setActiveTabId] = useState('pendente');

    // Realtime Status State
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [notificationSound, setNotificationSound] = useState<'voice' | 'bell' | 'cash'>(() => {
        return (localStorage.getItem('ifarma_notification_sound') as any) || 'voice';
    });
    const [isSoundBlocked, setIsSoundBlocked] = useState(false);

    // Ref to hold the latest sound preference to avoid stale closures in Realtime callbacks
    const notificationSoundRef = useRef(notificationSound);
    const activeChannelRef = useRef<any>(null); // Track active channel for cleanup

    useEffect(() => {
        notificationSoundRef.current = notificationSound;
    }, [notificationSound]);

    // Helper for TTS/Sound Notification
    const playNotificationSound = async (repeatCount = 1) => {
        const currentSound = notificationSoundRef.current;
        console.log("Attempting to play sound:", currentSound, "Repeats:", repeatCount);
        // Stop currently playing sounds/speech to avoid overlap
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        for (let i = 0; i < repeatCount; i++) {
            try {
                if (currentSound === 'voice') {
                    if ('speechSynthesis' in window) {
                        await new Promise<void>((resolve) => {
                            const utterance = new SpeechSynthesisUtterance("Novo pedido Ifarma!");
                            utterance.lang = 'pt-BR';
                            const voices = window.speechSynthesis.getVoices();
                            const ptVoice = voices.find(v => v.lang.includes('pt-BR') && v.name.includes('Google')) || voices.find(v => v.lang.includes('pt-BR'));
                            if (ptVoice) utterance.voice = ptVoice;

                            // Safety timeout in case onend never fires
                            const safetyTimeout = setTimeout(() => resolve(), 3000);

                            utterance.onend = () => { clearTimeout(safetyTimeout); resolve(); };
                            utterance.onerror = () => { clearTimeout(safetyTimeout); resolve(); };

                            window.speechSynthesis.speak(utterance);
                        });
                    }
                } else {
                    await new Promise<void>((resolve) => {
                        const sounds: any = {
                            bell: 'https://assets.mixkit.co/active_storage/sfx/571/571-preview.mp3', // Updated to clearer bell
                            cash: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Caixa
                        };
                        const src = sounds[currentSound];
                        if (!src) { resolve(); return; }

                        const audio = new Audio(src);
                        audio.volume = 0.8;

                        // Safety timeout
                        const safetyTimeout = setTimeout(() => resolve(), 3000);

                        audio.onended = () => { clearTimeout(safetyTimeout); resolve(); };
                        audio.onerror = () => { clearTimeout(safetyTimeout); resolve(); };

                        audio.play().catch(e => {
                            console.error("Audio block:", e);
                            setIsSoundBlocked(true); // Flag audio issue
                            clearTimeout(safetyTimeout);
                            resolve();
                        });
                    });
                }

                // Delay between repetitions (only if not the last one)
                if (i < repeatCount - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (err) {
                console.error("Notification sequence error:", err);
            }
        }
    };

    // Columns mapping to DB status - Merged 'Aguardando Entregador' into logic, removed from tabs
    const columns = [
        { id: 'pendente', label: 'Novos', color: 'blue-500', icon: 'notifications_active' },
        { id: 'preparando', label: 'Em Preparo', color: 'orange-500', icon: 'inventory' },
        { id: 'em_rota', label: 'Saiu p/ Entrega', color: 'purple-500', icon: 'sports_motorsports' },
        { id: 'entregue', label: 'Entregues', color: 'green-500', icon: 'check_circle' },
    ];

    useEffect(() => {
        // Pre-load voices
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if Admin Impersonating
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            let pId = null;

            if (profile?.role === 'admin') {
                const impersonatedId = localStorage.getItem('impersonatedPharmacyId');
                if (impersonatedId) {
                    const { data: pharm } = await supabase
                        .from('pharmacies')
                        .select('*')
                        .eq('id', impersonatedId)
                        .single();
                    if (pharm) {
                        setPharmacy(pharm);
                        pId = pharm.id;
                    }
                }
            }

            // Normal Merchant Flow
            if (!pId) {
                const { data: pharm } = await supabase
                    .from('pharmacies')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (pharm) {
                    setPharmacy(pharm);
                    pId = pharm.id;
                }
            }

            if (pId) {
                fetchOrders(pId);
                subscribeToOrders(pId);
            } else {
                setLoading(false);
            }
        };

        init();

        return () => {
            // Cleanup on unmount
            if (activeChannelRef.current) {
                supabase.removeChannel(activeChannelRef.current);
                activeChannelRef.current = null;
            }
        };
    }, []);

    const subscribeToOrders = (pId: string) => {
        // Unsubscribe previous active channel
        if (activeChannelRef.current) {
            console.log("🧹 Cleaning up previous Realtime channel...");
            supabase.removeChannel(activeChannelRef.current);
            activeChannelRef.current = null;
        }

        const channelName = `orders_pharma_${pId.substring(0, 8)}`;
        console.log("🔌 Initializing Realtime connection...", channelName);
        setRealtimeStatus('connecting');

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `pharmacy_id=eq.${pId}`
            }, (payload: any) => {
                const eventName = payload.eventType || payload.event;
                console.log(`🔔 Realtime Event: ${eventName} | Order: ${payload.new?.id?.substring(0, 6)}`);

                if (eventName === 'INSERT') {
                    try {
                        console.log('🔊 NEW ORDER detected via Realtime!');
                        playNotificationSound(3).catch(e => console.error("❌ Audio Error:", e));

                        setNewOrderAlert(`Novo Pedido #${payload.new.id.substring(0, 6)}`);
                        setTimeout(() => setNewOrderAlert(null), 8000);
                    } catch (err) {
                        console.error("❌ Notification UI Error:", err);
                    }
                }

                // Always refresh list on relevant changes
                fetchOrders(pId);
            })
            .subscribe((status) => {
                console.log(`📡 Realtime Status (${channelName}): ${status}`);
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('connected');
                } else if (status === 'CLOSED') {
                    setRealtimeStatus('connecting');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setRealtimeStatus('error');
                    console.error(`❌ Realtime Connection Failed (${channelName}: ${status}). Retrying in 5s...`);

                    // Safety retry with delay
                    setTimeout(() => {
                        if (pId) subscribeToOrders(pId);
                    }, 5000);
                }
            });

        activeChannelRef.current = channel;
    }

    const fetchOrders = async (pId: string) => {
        try {
            // Include 'entregue' orders
            // Using explicit foreign key constraint via hint !customer_id to avoid PGRST201
            // Also fetching motoboy details via !motoboy_id
            const { data, error } = await supabase
                .from('orders')
                .select('*, profiles!customer_id(full_name, phone), motoboy:profiles!motoboy_id(full_name), order_items(*, products(name))')
                .eq('pharmacy_id', pId)
                .neq('status', 'cancelado')
                .order('created_at', { ascending: true });

            if (error) throw error;
            console.log('Orders Fetched:', data);

            // Normalize data to ensure profiles is accessible as order.profiles
            const normalizedData = data?.map(order => ({
                ...order,
                profiles: order.profiles || { full_name: 'Cliente', phone: '' },
                items: order.order_items || [], // Map order_items to items for UI compatibility
                motoboy: order.motoboy // Ensure motoboy data is passed
            }));

            setOrders(normalizedData || []);
        } catch (err) {
            console.error('Error fetching orders (fallback to simple):', err);
            const { data } = await supabase.from('orders').select('*').eq('pharmacy_id', pId).order('created_at', { ascending: false });
            setOrders(data || []);
        } finally {
            setLoading(false);
        }
    };

    // Batch Selection State
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);


    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const selectAllByType = (status: string) => {
        const ordersByType = orders.filter(o => o.status === status);
        const allIds = ordersByType.map(o => o.id);

        // If all selected, deselect all of this type. Otherwise, select all.
        const allSelected = allIds.every(id => selectedOrderIds.includes(id));

        if (allSelected) {
            setSelectedOrderIds(prev => prev.filter(id => !allIds.includes(id)));
        } else {
            setSelectedOrderIds(prev => [...new Set([...prev, ...allIds])]);
        }
    };

    const sendWhatsAppNotification = async (order: any, status: string) => {
        const phone = order.profiles?.phone || order.customer?.phone;
        if (!phone) return;

        let message = '';
        const name = order.customer_name || order.profiles?.full_name?.split(' ')[0] || 'Cliente';

        if (status === 'em_rota') {
            message = `Olá *${name}*! 🛵\n\nSeu pedido *#${order.id.substring(0, 6)}* saiu para entrega e chegará em breve!\n\nObrigado por escolher a *${pharmacy?.name || 'Ifarma'}*.`;
        } else if (status === 'pronto_entrega') {
            message = `Olá *${name}*! ✅\n\nSeu pedido *#${order.id.substring(0, 6)}* está pronto e aguardando o entregador.`;
        }

        if (message) {
            try {
                await supabase.functions.invoke('whatsapp-notifier', {
                    body: { phone, message }
                });
            } catch (e) {
                console.error('Failed to send WhatsApp', e);
            }
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            const order = orders.find(o => o.id === orderId);
            if (order) {
                sendWhatsAppNotification(order, newStatus);
            }

            setOrders(prev => {
                if (newStatus === 'cancelado') {
                    return prev.filter(o => o.id !== orderId);
                }
                return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
            });
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status');
        }
    };

    const assignDriver = async (driverId: string) => {
        try {
            // Determine targets: Batch or Single
            const targets = selectedOrderIds.length > 0 ? selectedOrderIds : (selectedOrderIdForDriver ? [selectedOrderIdForDriver] : []);

            if (targets.length === 0) return;

            // Iterate and update all
            for (const oId of targets) {
                // Update Order Status - Reverted to 'pronto_entrega' so Motoboy can confirm pickup
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({
                        motoboy_id: driverId,
                        status: 'pronto_entrega' // Aguardando o motoboy confirmar retirada
                    })
                    .eq('id', oId);

                if (orderError) throw orderError;

                // CRITICAL FIX: Update Motoboy's Profile to see the order
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ current_order_id: oId })
                    .eq('id', driverId);

                if (profileError) console.error("Error updating motoboy profile:", profileError);

                // Notify Customer (Optional: maybe wait for actual Start Route)
                // const order = orders.find(o => o.id === oId);
                // if (order) sendWhatsAppNotification(order, 'em_rota');
            }

            setIsDriverModalOpen(false);
            setSelectedOrderIds([]); // Clear selection
            setSelectedOrderIdForDriver(null);

            // Refresh
            if (pharmacy?.id) fetchOrders(pharmacy.id);
            alert(`Motoboy atribuído a ${targets.length} pedido(s) com sucesso! Status atualizado para 'Saiu para Entrega'.`);

        } catch (err) {
            console.error('Error assigning driver:', err);
            alert('Erro ao atribuir motoboy. Verifique o console para mais detalhes.');
        }
    };

    const moveOrder = (orderId: string, currentStatus: string) => {
        const statusOrder = ['pendente', 'preparando', 'pronto_entrega', 'em_rota', 'entregue'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const nextStatus = statusOrder[currentIndex + 1];

        if (nextStatus) {
            updateStatus(orderId, nextStatus);
        }
    };

    const handlePrint = async (order: any) => {
        // Fetch items specifically for printing
        const { data: items } = await supabase
            .from('order_items')
            .select('*, products(name)')
            .eq('order_id', order.id);

        const fullOrder = { ...order, order_items: items || [] };

        setSelectedOrderToPrint(fullOrder);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    const getCustomerName = (order: any) => {
        if (order.customer_name) return order.customer_name;
        if (order.profiles && order.profiles.full_name) return order.profiles.full_name;
        return 'Cliente não identificado';
    };

    const isLate = (order: any) => {
        if (order.status !== 'pendente') return false;
        const diff = Date.now() - new Date(order.created_at).getTime();
        return diff > 10 * 60 * 1000; // 10 minutes
    };

    // --- Handlers for Details ---
    const openDetails = (order: any) => {
        setSelectedOrderDetails(order);
        setIsDetailsModalOpen(true);
    };

    // --- Handlers for Chat ---
    const openChat = (order: any) => {
        setSelectedChatOrder(order);
        setIsChatModalOpen(true);
    };

    return (
        <MerchantLayout activeTab="orders" title="Pedidos">
            {/* Print Area (Separated from hidden UI) */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0 overflow-auto">
                {selectedOrderToPrint && (
                    <OrderReceipt
                        order={selectedOrderToPrint}
                        pharmacyName={pharmacy?.name}
                        pharmacyAddress={pharmacy?.address}
                        pharmacyPhone={pharmacy?.phone}
                    />
                )}
            </div>

            {/* Main UI (Hidden when printing) */}
            <div className="flex flex-col h-auto lg:h-[calc(100vh-140px)] relative print:hidden pb-24 lg:pb-0">

                <AssignDriverModal
                    isOpen={isDriverModalOpen}
                    onClose={() => setIsDriverModalOpen(false)}
                    onAssign={assignDriver}
                    pharmacyId={pharmacy?.id} // Only fetch if we have pharmacy
                />

                <OrderChatModal
                    isOpen={isChatModalOpen}
                    onClose={() => setIsChatModalOpen(false)}
                    orderId={selectedChatOrder?.id}
                    customerName={selectedChatOrder ? getCustomerName(selectedChatOrder) : ''}
                    motoboyName={selectedChatOrder?.motoboy?.full_name}
                />

                {/* Floating Action Bar for Batch Operations */}



                <OrderDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    order={selectedOrderDetails}
                    updateStatus={updateStatus}
                />

                {/* Header */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Painel de Pedidos</h1>

                            {/* Realtime Status Badge */}
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${realtimeStatus === 'connected'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : realtimeStatus === 'error'
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                                }`}>
                                <div className={`size-1.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : realtimeStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`} />
                                {realtimeStatus === 'connected' ? 'Online' : realtimeStatus === 'error' ? 'Erro Conexão' : 'Conectando...'}
                            </div>
                        </div>

                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                            {loading ? 'Carregando...' : `Gerenciando ${orders.length} pedidos ativos`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={notificationSound}
                            onChange={(e) => {
                                const val = e.target.value as any;
                                setNotificationSound(val);
                                localStorage.setItem('ifarma_notification_sound', val);
                            }}
                            className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/5 border-none rounded-lg py-1 px-2 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                        >
                            <option value="voice">🗣️ Novo Pedido (Voz)</option>
                            <option value="bell">🔔 Alerta</option>
                            <option value="cash">💰 Caixa</option>
                        </select>
                        <button
                            onClick={() => {
                                setNewOrderAlert("Testando Som...");
                                playNotificationSound();
                                setTimeout(() => setNewOrderAlert(null), 3000);
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <MaterialIcon name="play_circle" /> Testar
                        </button>
                    </div>
                </div>

                {/* Alert Toast */}
                {newOrderAlert && (
                    <div className="fixed top-24 right-8 z-[100] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl animate-bounce flex items-center gap-3">
                        <MaterialIcon name="notifications_active" className="text-xl" />
                        <div>
                            <p className="font-black text-sm uppercase tracking-wider">Novo Pedido!</p>
                            <p className="text-xs opacity-90">{newOrderAlert}</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-6 h-auto lg:h-full overflow-visible lg:overflow-hidden">

                    {/* TOP: Horizontal Status Tabs - Premium Design */}
                    <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                        {columns.map((col) => {
                            // SPECIAL LOGIC: 'preparando' includes all intermediate states
                            const count = orders.filter(o => {
                                if (col.id === 'preparando') {
                                    return ['preparando', 'aguardando_motoboy', 'pronto_entrega'].includes(o.status);
                                }
                                return o.status?.toLowerCase() === col.id;
                            }).length;

                            const isActive = activeTabId === col.id;

                            // Color mappings for active states
                            const bgColors: Record<string, string> = {
                                'blue-500': 'bg-blue-500',
                                'orange-500': 'bg-orange-500',
                                'purple-500': 'bg-purple-600',
                                'green-500': 'bg-emerald-500'
                            };
                            const lightColors: Record<string, string> = {
                                'blue-500': 'bg-blue-50 text-blue-600',
                                'orange-500': 'bg-orange-50 text-orange-600',
                                'purple-500': 'bg-purple-50 text-purple-600',
                                'green-500': 'bg-emerald-50 text-emerald-600'
                            };

                            return (
                                <button
                                    key={col.id}
                                    onClick={() => setActiveTabId(col.id)}
                                    className={`relative flex flex-col sm:flex-row items-center sm:items-start gap-3 p-4 rounded-2xl border-2 transition-all duration-300 group overflow-hidden ${isActive
                                        ? `border-transparent shadow-lg shadow-${col.color}/20 ${bgColors[col.color]} text-white transform scale-[1.02]`
                                        : 'bg-white dark:bg-zinc-800 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:shadow-md'
                                        }`}
                                >
                                    {/* Icon Box */}
                                    <div className={`size-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${isActive
                                        ? 'bg-white/20 text-white backdrop-blur-sm'
                                        : `${lightColors[col.color]} dark:bg-white/5 dark:text-white`
                                        }`}>
                                        <MaterialIcon name={col.icon} className="text-2xl" />
                                    </div>

                                    <div className="flex-1 text-center sm:text-left z-10">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white/80' : 'text-slate-400'
                                                }`}>
                                                {col.label}
                                            </span>
                                            <span className={`text-2xl font-black tracking-tighter ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                                                }`}>
                                                {count} <span className="text-sm font-bold opacity-60">pedidos</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Indicator */}
                                    {isActive && (
                                        <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${col.id === 'pendente' ? 'bg-white/40' : 'bg-white/20'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* SOUND BLOCKED ALERT */}
                    {isSoundBlocked && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-3 rounded-xl flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <MaterialIcon name="volume_off" />
                                <span className="text-sm font-bold">O navegador bloqueou o som automático.</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsSoundBlocked(false);
                                    playNotificationSound(); // Force interaction
                                }}
                                className="px-3 py-1 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-200 rounded-lg text-xs font-black uppercase transition-colors"
                            >
                                Ativar Som
                            </button>
                        </div>
                    )}




                    {/* RIGHT: Orders Grid */}
                    <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900/50 dark:to-zinc-900 rounded-[32px] border border-slate-200/60 dark:border-white/5 p-4 md:p-6 overflow-visible lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar min-h-[400px]">

                        {/* List View Container */}
                        <div className="flex flex-col gap-4">
                            {orders.filter(o => {
                                if (activeTabId === 'preparando') {
                                    return ['preparando', 'aguardando_motoboy', 'pronto_entrega'].includes(o.status);
                                }
                                return o.status?.toLowerCase() === activeTabId;
                            }).map((order) => {
                                const late = isLate(order);
                                const isWaitingDriver = ['aguardando_motoboy', 'pronto_entrega'].includes(order.status);

                                return (
                                    <div key={order.id} className={`bg-white dark:bg-zinc-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group relative border-l-4 ${late ? 'border-l-red-500' : isWaitingDriver ? 'border-l-yellow-400' : 'border-l-primary'
                                        } border-y border-r border-slate-100 dark:border-white/5 hover:z-10`}>

                                        {/* Badge - Waiting Driver */}
                                        {isWaitingDriver && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 px-3 py-1 rounded-full shadow-lg z-20 flex items-center gap-1 animate-bounce-slow">
                                                <MaterialIcon name="moped" className="text-sm" />
                                                <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Aguardando Entregador</span>
                                            </div>
                                        )}

                                        {/* Late Badge */}
                                        {late && !isWaitingDriver && (
                                            <div className="absolute top-4 right-4 flex items-center gap-1 text-red-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider">Atrasado</span>
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

                                            {/* CHECKBOX FOR BATCH SELECTION */}
                                            {(activeTabId === 'preparando' || activeTabId === 'aguardando_motoboy') && (
                                                <div className="flex items-center justify-center p-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrderIds.includes(order.id)}
                                                        onChange={() => toggleOrderSelection(order.id)}
                                                        className="size-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                </div>
                                            )}

                                            {/* Left: ID & Time */}
                                            <div className="flex flex-col gap-1 min-w-[80px]">
                                                <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-black tracking-tight w-fit">
                                                    #{order.id.substring(0, 6)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                    <MaterialIcon name="schedule" className="text-[12px]" />
                                                    {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)} min
                                                    <span className="opacity-40 mx-0.5">•</span>
                                                    <span>{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </span>
                                            </div>

                                            {/* Middle: Customer & Info */}
                                            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-slate-500 dark:text-slate-300 uppercase font-black text-sm shrink-0">
                                                        {getCustomerName(order).charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{getCustomerName(order)}</span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">{order.items?.length || 0} itens</span>

                                                        {/* Address Display for Routing */}
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 leading-tight">
                                                            <MaterialIcon name="location_on" className="text-[10px] opacity-70" />
                                                            <span className="truncate max-w-[200px]" title={order.address}>
                                                                {order.address}
                                                                {order.neighborhood && ` - ${order.neighborhood}`}
                                                                {order.complement && ` (${order.complement})`}
                                                            </span>
                                                        </span>

                                                        {/* Assigned Motoboy Display */}
                                                        {order.motoboy && (
                                                            <span className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1 bg-primary/5 px-1.5 py-0.5 rounded-md w-fit">
                                                                <MaterialIcon name="sports_motorsports" className="text-[10px]" />
                                                                {order.motoboy.full_name || 'Motoboy'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pagamento</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase flex items-center gap-1">
                                                        <MaterialIcon name={order.payment_method === 'pix' ? 'pix' : 'payments'} className="text-[14px]" />
                                                        {order.payment_method || 'PIX'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0">

                                                {/* Chat Button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openChat(order); }}
                                                    className="size-10 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-colors relative"
                                                    title="Chat do Pedido"
                                                >
                                                    <MaterialIcon name="chat" className="text-xl" />
                                                    {/* Notification dot functionality can be added here later */}
                                                </button>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openDetails(order); }}
                                                    className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <MaterialIcon name="visibility" className="text-xl" />
                                                </button>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePrint(order); }}
                                                    className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                                                    title="Imprimir"
                                                >
                                                    <MaterialIcon name="print" className="text-xl" />
                                                </button>

                                                {['pendente', 'preparando'].includes(order.status?.toLowerCase()) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'aguardando_motoboy'); }}
                                                        className="size-10 rounded-xl bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center transition-colors"
                                                        title="Pronto / Aguardando Motoboy"
                                                    >
                                                        <MaterialIcon name="two_wheeler" className="text-xl" />
                                                    </button>
                                                )}

                                                {['pendente', 'preparando', 'aguardando_motoboy'].includes(order.status?.toLowerCase()) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedOrderIdForDriver(order.id); setIsDriverModalOpen(true); }}
                                                        className="size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-colors animate-pulse"
                                                        title="Atribuir Motoboy"
                                                    >
                                                        <MaterialIcon name="sports_motorsports" className="text-xl" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // FIX: Allow dispatching if driver is already assigned
                                                        if (isWaitingDriver && !order.motoboy) {
                                                            setSelectedOrderIdForDriver(order.id);
                                                            setIsDriverModalOpen(true);
                                                        } else {
                                                            moveOrder(order.id, order.status);
                                                        }
                                                    }}
                                                    disabled={order.status === 'entregue'}
                                                    className={`h-9 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95 group/btn ${order.status === 'entregue'
                                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 cursor-default shadow-none active:scale-100'
                                                        : isWaitingDriver
                                                            ? 'bg-yellow-400 text-slate-900 shadow-yellow-400/20 hover:bg-yellow-500'
                                                            : order.status === 'em_rota'
                                                                ? 'bg-green-600 text-white shadow-green-600/20 hover:bg-green-700'
                                                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/10 hover:shadow-md hover:scale-105'
                                                        }`}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                                        {order.status === 'entregue'
                                                            ? 'Concluído'
                                                            : isWaitingDriver
                                                                ? 'Enviar'
                                                                : order.status === 'preparando' || order.status === 'aguardando_motoboy'
                                                                    ? 'Enviar'
                                                                    : order.status === 'em_rota'
                                                                        ? 'Entregue'
                                                                        : 'Aceitar'}
                                                    </span>
                                                    {order.status !== 'entregue' && (
                                                        <MaterialIcon name={order.status === 'em_rota' ? 'check' : 'arrow_forward'} className="text-sm group-hover/btn:translate-x-1 transition-transform" />
                                                    )}
                                                    {order.status === 'entregue' && (
                                                        <MaterialIcon name="check" className="text-sm" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {orders.filter(o => {
                                if (activeTabId === 'preparando') {
                                    return ['preparando', 'aguardando_motoboy', 'pronto_entrega'].includes(o.status);
                                }
                                return o.status?.toLowerCase() === activeTabId;
                            }).length === 0 && (
                                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[32px] opacity-70">
                                        <div className="size-16 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                                            <MaterialIcon name="inbox" className="text-3xl opacity-50" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest">Sem pedidos nesta fase</span>
                                    </div>
                                )}
                        </div>
                    </div>
                </div >
            </div >

            {/* FLOATING BATCH ACTIONS */}
            {
                selectedOrderIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-zinc-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-6 border border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary text-white text-xs font-black px-2 py-0.5 rounded-full">{selectedOrderIds.length}</span>
                            <span className="font-bold text-sm">selecionados</span>
                        </div>

                        <div className="h-4 w-px bg-white/20" />

                        <button
                            onClick={() => {
                                const selected = orders.filter(o => selectedOrderIds.includes(o.id));
                                // Build Google Maps URL
                                // format: https://www.google.com/maps/dir/Origin/Dest1/Dest2/...
                                const origin = pharmacy?.address ? encodeURIComponent(pharmacy.address) : '';
                                const destinations = selected.map(o => encodeURIComponent(`${o.address} - ${o.neighborhood || ''}`)).join('/');

                                const url = `https://www.google.com/maps/dir/${origin}/${destinations}`;
                                window.open(url, '_blank');
                            }}
                            className="flex items-center gap-2 hover:text-primary transition-colors font-bold text-xs uppercase tracking-wider group"
                            title="Abrir rota no Google Maps"
                        >
                            <div className="p-1.5 rounded-full bg-white/10 group-hover:bg-primary/20 transition-colors">
                                <MaterialIcon name="map" className="text-sm" />
                            </div>
                            Gerar Rota
                        </button>

                        <button
                            onClick={() => setIsDriverModalOpen(true)}
                            className="flex items-center gap-2 hover:text-primary transition-colors font-bold text-xs uppercase tracking-wider group"
                            title="Atribuir Motoboy em Lote"
                        >
                            <div className="p-1.5 rounded-full bg-white/10 group-hover:bg-primary/20 transition-colors">
                                <MaterialIcon name="sports_motorsports" className="text-sm" />
                            </div>
                            Atribuir
                        </button>

                        <div className="h-4 w-px bg-white/20" />

                        <button
                            onClick={() => setSelectedOrderIds([])}
                            className="p-1 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            title="Cancelar Seleção"
                        >
                            <MaterialIcon name="close" className="text-lg" />
                        </button>
                    </div>
                )
            }
        </MerchantLayout >
    );
};

export default MerchantOrderManagement;
