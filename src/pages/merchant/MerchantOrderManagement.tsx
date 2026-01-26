import { useState, useEffect } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantOrderManagement = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Columns mapping to DB status
    const columns = [
        { id: 'pendente', label: 'Novos', color: 'blue-500', icon: 'notifications_active' },
        { id: 'preparando', label: 'Em Preparo', color: 'orange-500', icon: 'inventory' },
        { id: 'pronto_entrega', label: 'Pronto/Aguardando', color: 'yellow-500', icon: 'timer' }, // Assuming this maps to 'Aguardando' logic or similar
        { id: 'em_rota', label: 'Saiu p/ Entrega', color: 'purple-500', icon: 'sports_motorsports' },
    ];

    useEffect(() => {
        fetchOrders();

        // Subscribe to changes (simplified for all orders for demo, ideally filter by pharmacy_id)
        const subscription = supabase
            .channel('merchant_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                fetchOrders(); // Refresh all for simplicity
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, []);

    const fetchOrders = async () => {
        try {
            // In a real app, we would get the pharmacy_id from the logged-in user's profile
            // For now, we fetch all orders or filter by the mock pharmacy ID we used in Cart
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status');
        }
    };

    const moveOrder = (orderId: string, currentStatus: string) => {
        const statusOrder = ['pendente', 'preparando', 'em_rota', 'entregue'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const nextStatus = statusOrder[currentIndex + 1];
        if (nextStatus) {
            updateStatus(orderId, nextStatus);
        }
    };

    return (
        <MerchantLayout activeTab="orders" title="Pedidos">
            <div className="flex flex-col h-[calc(100vh-140px)]">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Gestão de Pedidos</h1>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Gerencie os pedidos em tempo real.</p>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 h-full min-w-[1000px]">
                        {columns.map((col) => (
                            <div key={col.id} className="flex-1 flex flex-col bg-slate-100 dark:bg-black/20 rounded-[32px] p-4 border border-slate-200 dark:border-white/5">

                                {/* Column Header */}
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <div className={`size-8 rounded-lg bg-${col.color}/10 text-${col.color} flex items-center justify-center`}>
                                        <MaterialIcon name={col.icon} className="text-lg" />
                                    </div>
                                    <h3 className="font-black italic text-slate-700 dark:text-slate-200 text-sm">{col.label}</h3>
                                    <span className="ml-auto bg-white dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {orders.filter(o => o.status === col.id).length}
                                    </span>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                                    {orders.filter(o => o.status === col.id).map((order) => (
                                        <div key={order.id} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 cursor-pointer hover:scale-[1.02] transition-transform group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-sm text-slate-900 dark:text-white">#{order.id.substring(0, 6)}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mb-3">
                                                R$ {order.total_price} • {order.payment_method || 'Pix/Card'}
                                            </p>

                                            <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-black/20 p-2 rounded-lg">
                                                <MaterialIcon name="person" className="text-[14px] text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">Cliente App</span>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-white/5">
                                                <span className="font-black text-primary text-xs">Ação Rápida</span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => moveOrder(order.id, order.status)}
                                                        className="size-8 rounded-lg bg-primary text-background-dark flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-transform"
                                                        title="Avançar Status"
                                                    >
                                                        <MaterialIcon name="arrow_forward" className="text-lg" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {orders.filter(o => o.status === col.id).length === 0 && (
                                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-50">Vazio</span>
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
