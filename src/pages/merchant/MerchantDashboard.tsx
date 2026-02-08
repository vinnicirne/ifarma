import React, { useEffect, useState } from 'react';
import MerchantLayout from './MerchantLayout';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import RealtimeMetrics from '../../components/dashboard/RealtimeMetrics';
import { OrderCancellationModal } from '../../components/OrderCancellationModal';
import { notifyOrderStatusChange } from '../../utils/notifications';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const GeminiAssistant = () => {
    const tips = [
        "Mantenha seu painel aberto para ouvir as notificações de novos pedidos em tempo real.",
        "Produtos com boas fotos vendem 3x mais. Verifique seu catálogo.",
        "Promoções de fim de semana atraem novos clientes. Crie uma oferta relâmpago.",
        "Sempre atualize o status do pedido rapidamente para manter o cliente informado.",
        "Ofereça entrega grátis acima de um certo valor para aumentar o ticket médio.",
        "Revise seu estoque semanalmente para não perder vendas por falta de produtos.",
        "Use o chat para tirar dúvidas dos clientes e fechar mais vendas.",
        "Fidelize clientes com um atendimento personalizado e ágil.",
        "Datas comemorativas são ótimas para kits e presentes.",
        "Garanta que seu horário de funcionamento esteja correto no app."
    ];
    const [tip, setTip] = useState(tips[0]);

    useEffect(() => {
        setTip(tips[Math.floor(Math.random() * tips.length)]);
        const interval = setInterval(() => {
            setTip(tips[Math.floor(Math.random() * tips.length)]);
        }, 30000); // Rotate every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[32px] border border-white/10 relative overflow-hidden group shadow-lg shadow-indigo-500/20">
            <div className="absolute top-0 right-0 p-24 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-white/20 transition-all duration-1000"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-white text-2xl bg-white/20 p-2 rounded-xl">smart_toy</span>
                    <h3 className="text-white font-black italic tracking-tighter text-lg">Gemini Assistente</h3>
                </div>
                <p className="text-sm text-indigo-100 leading-relaxed font-medium min-h-[60px]">
                    "{tip}"
                </p>
                <div className="mt-4 flex gap-1">
                    <div className="h-1 w-8 bg-white/40 rounded-full animate-pulse"></div>
                    <div className="h-1 w-2 bg-white/20 rounded-full"></div>
                    <div className="h-1 w-2 bg-white/20 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

const MerchantDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Merchant Profile or Admin Profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) {
                let currentProfile = { ...profileData };

                // ADMIN IMPERSONATION LOGIC
                if (profileData.role === 'admin') {
                    const impersonatedId = localStorage.getItem('impersonatedPharmacyId');
                    if (impersonatedId) {
                        currentProfile.pharmacy_id = impersonatedId;
                        console.log("Admin Impersonating Pharmacy:", impersonatedId);
                    }
                }

                setProfile(currentProfile);

                if (currentProfile.pharmacy_id) {
                    const { data: pharmData } = await supabase
                        .from('pharmacies')
                        .select('*')
                        .eq('id', currentProfile.pharmacy_id)
                        .single();
                    if (pharmData) setPharmacy(pharmData);

                    const { data: ordersData } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('pharmacy_id', currentProfile.pharmacy_id)
                        .order('created_at', { ascending: false })
                        .limit(50);

                    if (ordersData) setOrders(ordersData);
                }
            }
            setLoading(false);
        };

        fetchInitialData();
    }, []);

    // Realtime Subscription
    useEffect(() => {
        if (!profile?.pharmacy_id) return;

        const channel = supabase
            .channel(`merchant-dashboard-${profile.pharmacy_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `pharmacy_id=eq.${profile.pharmacy_id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setOrders(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.pharmacy_id]);

    const handleCancelOrder = async (reason: string) => {
        if (!selectedOrder) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelado', cancellation_reason: reason })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            // Send Auto Message
            if (pharmacy?.auto_message_cancel_enabled && pharmacy?.auto_message_cancel_text) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('order_messages').insert({
                        order_id: selectedOrder.id,
                        sender_id: user.id,
                        content: `${pharmacy.auto_message_cancel_text}\n\nMotivo: ${reason}`,
                        message_type: 'text',
                        sender_role: 'pharmacy'
                    });
                }
            }

            // Notify Customer
            if (selectedOrder.customer_id) {
                notifyOrderStatusChange(
                    selectedOrder.id,
                    selectedOrder.customer_id,
                    'cancelado',
                    `Seu pedido foi cancelado pela loja. Motivo: ${reason}`
                ).catch(console.error);
            }

            setIsCancelModalOpen(false);
            setSelectedOrder(null);
            alert('Pedido cancelado com sucesso!');
        } catch (err: any) {
            console.error('Erro ao cancelar pedido:', err);
            alert('Erro ao cancelar: ' + err.message);
        }
    };

    return (
        <MerchantLayout activeTab="dashboard" title="Visão Geral">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">
                        Olá, {profile?.full_name || 'Gestor'}!
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                        Aqui está o resumo do seu dia em tempo real.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to="/gestor/equipe" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 transition-colors px-4 py-2 rounded-2xl shadow-sm border border-primary/20 cursor-pointer">
                        <MaterialIcon name="group" className="text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary">Minha Equipe</span>
                    </Link>
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                        <MaterialIcon name="calendar_today" className="text-slate-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white">Hoje, {new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
            ) : (
                <>
                    <div className="space-y-8 animate-fade-in">

                        {/* Realtime Metrics Widget (Replaces Static KPI Grid) */}
                        <RealtimeMetrics orders={orders} userRole={profile?.role} />

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Recent Orders List */}
                            <div className="lg:col-span-2 bg-white dark:bg-zinc-800 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col">
                                <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6">Pedidos Recentes</h3>

                                <div className="flex-1 space-y-4">
                                    {orders.slice(0, 5).map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => navigate('/gestor/orders')}
                                            className="flex gap-4 p-3 hover:bg-slate-50 dark:hover:bg-zinc-900/50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                        >
                                            <div className={`size-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 font-black text-xs shadow-sm border border-slate-200 dark:border-white/10 group-hover:scale-110 transition-transform ${order.status === 'entregue' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                                                order.status === 'pendente' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' : ''
                                                }`}>
                                                <MaterialIcon name="receipt_long" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between">
                                                    <h4 className="font-black italic text-slate-900 dark:text-white">#{order.id.substring(0, 6)}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${order.status === 'entregue' ? 'text-green-500' :
                                                            order.status === 'cancelado' ? 'text-red-500' : 'text-slate-500'
                                                            }`}>{order.status}</span>

                                                        {!['entregue', 'cancelado'].includes(order.status) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOrder(order);
                                                                    setIsCancelModalOpen(true);
                                                                }}
                                                                className="p-1 px-2 text-[8px] bg-red-500/10 text-red-500 rounded-lg font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">
                                                    {new Date(order.created_at).toLocaleTimeString()} • R$ {order.total_price}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && <p className="text-slate-500 italic p-4">Nenhum pedido hoje.</p>}
                                </div>

                                <Link to="/gestor/orders" className="mt-6 w-full py-4 rounded-xl bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors text-center block">
                                    Ver Todos os Pedidos
                                </Link>
                            </div>

                            {/* Quick Actions / Tips */}
                            <div className="space-y-6">
                                <GeminiAssistant />
                            </div>
                        </div>
                    </div>

                    <OrderCancellationModal
                        isOpen={isCancelModalOpen}
                        onClose={() => {
                            setIsCancelModalOpen(false);
                            setSelectedOrder(null);
                        }}
                        userRole="pharmacy"
                        onConfirm={handleCancelOrder}
                    />
                </>
            )}
        </MerchantLayout>
    );
};

export default MerchantDashboard;
