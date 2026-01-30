import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import BottomNavigation from '../../components/BottomNavigation';

const UserOrders = () => {
    const navigate = useNavigate();
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [historyOrders, setHistoryOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('orders')
                .select('*, pharmacies(name, logo_url)')
                .eq('customer_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const active = data.filter(o => !['entregue', 'cancelado'].includes(o.status));
                const history = data.filter(o => ['entregue', 'cancelado'].includes(o.status));
                setActiveOrders(active);
                setHistoryOrders(history);
            }
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pendente': return { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-600', icon: 'schedule' };
            case 'preparando': return { label: 'Em Preparo', color: 'bg-blue-500/20 text-blue-600', icon: 'pill' };
            case 'aguardando_motoboy': return { label: 'Aguardando Entregador', color: 'bg-purple-500/20 text-purple-600', icon: 'person_search' };
            case 'em_rota': return { label: 'A Caminho', color: 'bg-primary/20 text-primary', icon: 'local_shipping' };
            case 'entregue': return { label: 'Entregue', color: 'bg-green-500/20 text-green-600', icon: 'check_circle' };
            case 'cancelado': return { label: 'Cancelado', color: 'bg-red-500/20 text-red-600', icon: 'cancel' };
            default: return { label: status, color: 'bg-gray-500/20 text-gray-600', icon: 'info' };
        }
    };

    const OrderCard = ({ order }: { order: any }) => {
        const status = getStatusInfo(order.status);
        return (
            <div
                onClick={() => navigate(`/pedido/${order.id}`)}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all cursor-pointer mb-4"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                            {order.pharmacies?.logo_url ? (
                                <img src={order.pharmacies.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <MaterialIcon name="store" className="text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                                {order.pharmacies?.name || 'Farmácia'}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest">
                                Pedido #{order.id.substring(0, 8)}
                            </p>
                        </div>
                    </div>
                    <div className={`${status.color} px-3 py-1 rounded-full flex items-center gap-1.5`}>
                        <MaterialIcon name={status.icon} className="text-sm" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-100 dark:border-white/5">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="font-black text-slate-900 dark:text-white">
                        R$ {order.total_price?.toFixed(2)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                <button onClick={() => navigate(-1)} className="p-2 text-slate-900 dark:text-white">
                    <MaterialIcon name="arrow_back_ios" />
                </button>
                <h1 className="font-bold text-lg text-slate-900 dark:text-white">Meus Pedidos</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 p-4 pb-24 max-w-md mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-4">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Carregando pedidos...</p>
                    </div>
                ) : (
                    <>
                        {activeOrders.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-slate-900 dark:text-white font-black text-base uppercase tracking-widest mb-4 px-2">
                                    Em Andamento
                                </h3>
                                {activeOrders.map(order => <OrderCard key={order.id} order={order} />)}
                            </div>
                        )}

                        <div>
                            <h3 className="text-slate-900 dark:text-white font-black text-base uppercase tracking-widest mb-4 px-2">
                                Histórico
                            </h3>
                            {historyOrders.length > 0 ? (
                                historyOrders.map(order => <OrderCard key={order.id} order={order} />)
                            ) : (
                                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                                    <MaterialIcon name="receipt_long" className="text-4xl text-slate-300 mb-2" />
                                    <p className="text-slate-500 text-sm font-medium">Nenhum pedido anterior</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <BottomNavigation />
        </div>
    );
};

export default UserOrders;
