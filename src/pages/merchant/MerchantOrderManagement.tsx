import { useState, useEffect, useRef } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { OrderReceipt } from '../../components/merchant/OrderReceipt';

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


const MerchantOrderManagement = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [selectedOrderToPrint, setSelectedOrderToPrint] = useState<any>(null);

    // Driver Modal State
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [selectedOrderIdForDriver, setSelectedOrderIdForDriver] = useState<string | null>(null);

    const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

    // Audio ref for notifications
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Columns mapping to DB status
    const columns = [
        { id: 'pendente', label: 'Novos', color: 'blue-500', icon: 'notifications_active' },
        { id: 'preparando', label: 'Em Preparo', color: 'orange-500', icon: 'inventory' },
        { id: 'pronto_entrega', label: 'Aguardando Entregador', color: 'yellow-500', icon: 'timer' },
        { id: 'em_rota', label: 'Saiu p/ Entrega', color: 'purple-500', icon: 'sports_motorsports' },
    ];

    useEffect(() => {
        // Initialize simple notification sound
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep

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

            // Normal Merchant Flow (if not impersonating or not found)
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

        return () => { supabase.removeAllChannels(); };
    }, []);

    const subscribeToOrders = (pId: string) => {
        supabase
            .channel('merchant_orders_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'orders',
                filter: `pharmacy_id=eq.${pId}`
            }, (payload: any) => {
                console.log('New Order Payload:', payload);
                audioRef.current?.play().catch(() => console.log('Audio interaction needed'));

                if (payload.new && payload.new.id) {
                    setNewOrderAlert(`Novo Pedido #${payload.new.id.substring(0, 6)}`);
                    setTimeout(() => setNewOrderAlert(null), 5000);
                }

                fetchOrders(pId);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `pharmacy_id=eq.${pId}`
            }, () => {
                fetchOrders(pId);
            })
            .subscribe();
    }

    const fetchOrders = async (pId: string) => {
        try {
            // Simplified query to avoid RLS/Join issues obscuring orders
            // We have customer_name and address directly on orders table
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('pharmacy_id', pId)
                .neq('status', 'entregue')
                .neq('status', 'cancelado')
                .order('created_at', { ascending: false });

            if (error) throw error;
            console.log('Orders Fetched:', data);
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching orders:', err);
            // Fallback just in case, though the above IS the simple query now
            const { data } = await supabase.from('orders').select('*').eq('pharmacy_id', pId).order('created_at', { ascending: false });
            setOrders(data || []);
        } finally {
            setLoading(false);
        }
    };

    const sendWhatsAppNotification = async (order: any, status: string) => {
        const phone = order.profiles?.phone || order.customer?.phone; // Handle data variances
        if (!phone) return;

        let message = '';
        const name = order.profiles?.full_name?.split(' ')[0] || 'Cliente';

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
                if (newStatus === 'entregue' || newStatus === 'cancelado') {
                    return prev.filter(o => o.id !== orderId);
                }
                return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
            });
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status');
        }
    };

    const assignDriver = async (motoboyId: string) => {
        if (!selectedOrderIdForDriver) return;
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    motoboy_id: motoboyId,
                    status: 'em_rota' // Auto-move to 'Em Rota' on assignment? Or just assign?
                    // Let's just assign and optional move. Let's move to 'em_rota' for convenience.
                })
                .eq('id', selectedOrderIdForDriver);

            if (error) throw error;

            // Notify Customer & Motoboy (future)
            const order = orders.find(o => o.id === selectedOrderIdForDriver);
            if (order) sendWhatsAppNotification(order, 'em_rota');

            setIsDriverModalOpen(false);
            fetchOrders(pharmacy.id); // Refresh to show update
            alert('Motoboy atribuído com sucesso!');

        } catch (err) {
            alert('Erro ao atribuir motoboy');
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

    const handlePrint = (order: any) => {
        setSelectedOrderToPrint(order);
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

    return (
        <MerchantLayout activeTab="orders" title="Pedidos">
            <div className="flex flex-col h-[calc(100vh-140px)]">

                <AssignDriverModal
                    isOpen={isDriverModalOpen}
                    onClose={() => setIsDriverModalOpen(false)}
                    onAssign={assignDriver}
                    pharmacyId={pharmacy?.id} // Only fetch if we have pharmacy
                />

                {/* Print Area */}
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
                    {selectedOrderToPrint && (
                        <OrderReceipt
                            order={selectedOrderToPrint}
                            pharmacyName={pharmacy?.name}
                            pharmacyAddress={pharmacy?.address}
                            pharmacyPhone={pharmacy?.phone}
                        />
                    )}
                </div>

                {/* Header */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <div>
                        <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Painel de Pedidos</h1>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                            {loading ? 'Carregando...' : `Gerenciando ${orders.length} pedidos ativos`}
                        </p>
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

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto pb-4 print:hidden">
                    <div className="flex gap-4 h-full min-w-[1000px]">
                        {columns.map((col) => (
                            <div key={col.id} className="flex-1 flex flex-col bg-slate-100 dark:bg-black/20 rounded-[32px] p-4 border border-slate-200 dark:border-white/5">

                                {/* Column Header */}
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <div className={`size-8 rounded-lg bg-${col.color}/10 text-${col.color} flex items-center justify-center shadow-sm`}>
                                        <MaterialIcon name={col.icon} className="text-lg" />
                                    </div>
                                    <h3 className="font-black italic text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">{col.label}</h3>
                                    <span className="ml-auto bg-white dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                        {orders.filter(o => o.status?.toLowerCase() === col.id).length}
                                    </span>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                                    {orders.filter(o => o.status?.toLowerCase() === col.id).map((order) => {
                                        const late = isLate(order);
                                        return (
                                            <div key={order.id} className={`bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border ${late ? 'border-red-500 animate-pulse' : 'border-slate-100 dark:border-white/5'} cursor-pointer hover:scale-[1.02] transition-transform group relative z-0`}>

                                                {/* Late Badge */}
                                                {late && (
                                                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-bounce z-10">
                                                        ATRASADO
                                                    </div>
                                                )}

                                                {/* Order ID & Time */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">#{order.id.substring(0, 6)}</span>
                                                    <div className="flex items-center gap-1">

                                                        {['pronto_entrega', 'preparando'].includes(order.status?.toLowerCase()) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOrderIdForDriver(order.id);
                                                                    setIsDriverModalOpen(true);
                                                                }}
                                                                className="size-6 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 rounded text-slate-500 flex items-center justify-center transition-colors"
                                                                title="Chamar Motoboy"
                                                            >
                                                                <MaterialIcon name="two_wheeler" className="text-[14px]" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePrint(order);
                                                            }}
                                                            className="size-6 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 rounded text-slate-500 flex items-center justify-center transition-colors"
                                                            title="Imprimir Pedido"
                                                        >
                                                            <MaterialIcon name="print" className="text-[14px]" />
                                                        </button>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-black/30 px-2 py-0.5 rounded-full">
                                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Value & Method */}
                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
                                                    <span className="mx-1">•</span>
                                                    <span className="uppercase text-[10px]">{order.payment_method || 'PIX'}</span>
                                                </p>

                                                {/* Customer Info */}
                                                <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                                                    <MaterialIcon name="person" className="text-[14px] text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                        {getCustomerName(order)}
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-white/5">
                                                    <button className="text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider transition-colors">
                                                        Detalhes
                                                    </button>

                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveOrder(order.id, order.status);
                                                            }}
                                                            className="h-8 px-4 rounded-lg bg-primary text-background-dark flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95"
                                                            title="Avançar para próxima etapa"
                                                        >
                                                            <span className="text-[10px] font-black uppercase mr-1">Avançar</span>
                                                            <MaterialIcon name="arrow_forward" className="text-sm" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {orders.filter(o => o.status?.toLowerCase() === col.id).length === 0 && (
                                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl opacity-50">
                                            <MaterialIcon name="inbox" className="text-2xl mb-1 opacity-50" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Vazio</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MerchantLayout>
    );
};

export default MerchantOrderManagement;
