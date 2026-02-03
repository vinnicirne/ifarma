import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MaterialIcon } from '../components/MaterialIcon';

const MotoboyEarnings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        today: 0,
        week: 0,
        month: 0,
        pending: 0
    });
    const [deliveries, setDeliveries] = useState<any[]>([]);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/motoboy-login');
                return;
            }

            // Buscar entregas concluídas
            const { data, error } = await supabase
                .from('orders')
                .select('*, pharmacies(name)')
                .eq('motoboy_id', user.id)
                .eq('status', 'entregue')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                setDeliveries(data);

                // Calcular estatísticas
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);

                let todayEarnings = 0;
                let monthEarnings = 0;

                const processedData = data.map((order: any) => {
                    // Use delivery_fee from DB or fallback to 7.00 or 0.00 if strict
                    const fee = order.delivery_fee ? parseFloat(order.delivery_fee) : 7.00;

                    const orderDate = new Date(order.created_at);
                    if (orderDate >= today) todayEarnings += fee;
                    if (orderDate >= monthStart) monthEarnings += fee;

                    return { ...order, final_fee: fee };
                });

                setDeliveries(processedData);

                setStats({
                    today: todayEarnings,
                    week: 0,
                    month: monthEarnings,
                    pending: 0
                });

                setStats({
                    today: todayEarnings,
                    week: 0, // Poderia ser calculado também
                    month: monthEarnings,
                    pending: 0
                });
            }
        } catch (error) {
            console.error('Erro ao buscar ganhos:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#102218] text-slate-900 dark:text-white pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white dark:bg-[#102218] border-b border-slate-200 dark:border-white/5 p-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                    <MaterialIcon name="arrow_back" />
                </button>
                <h1 className="text-xl font-black italic tracking-tighter">MEUS GANHOS</h1>
            </header>

            <main className="p-4 space-y-6">
                {/* Saldo Principal */}
                <div className="bg-gradient-to-br from-[#13ec6d] to-green-600 rounded-[32px] p-8 text-black shadow-xl shadow-green-500/20">
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Ganhos do Mês</p>
                    <h2 className="text-5xl font-black tracking-tighter mb-4">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.month)}
                    </h2>
                    <div className="flex gap-4">
                        <div className="bg-black/10 backdrop-blur-md px-4 py-2 rounded-2xl">
                            <p className="text-[10px] font-bold opacity-70">HOJE</p>
                            <p className="font-black text-lg">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.today)}
                            </p>
                        </div>
                        <div className="bg-black/10 backdrop-blur-md px-4 py-2 rounded-2xl">
                            <p className="text-[10px] font-bold opacity-70">PENDENTE</p>
                            <p className="font-black text-lg">R$ 0,00</p>
                        </div>
                    </div>
                </div>

                {/* Histórico Recente */}
                <div>
                    <h3 className="text-lg font-black italic mb-4 px-2">DETALHES RECENTES</h3>
                    <div className="space-y-2">
                        {loading ? (
                            <div className="animate-pulse space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-slate-100 dark:bg-white/5 rounded-2xl" />
                                ))}
                            </div>
                        ) : deliveries.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                                <MaterialIcon name="receipt_long" className="text-4xl text-slate-300 mb-2" />
                                <p className="text-slate-500 text-sm">Nenhuma entrega concluída ainda.</p>
                            </div>
                        ) : (
                            deliveries.map((delivery) => (
                                <div key={delivery.id} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                                            <MaterialIcon name="check_circle" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm truncate max-w-[150px]">{delivery.pharmacies?.name || 'Entrega Concluída'}</p>
                                            <p className="text-[10px] text-slate-500">
                                                {new Date(delivery.created_at).toLocaleDateString('pt-BR')} às {new Date(delivery.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-green-500">
                                            + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(delivery.final_fee)}
                                        </p>
                                        <p className="text-[9px] text-slate-400">Taxa de Entrega</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Botão de Saque */}
                <button className="w-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <MaterialIcon name="account_balance" />
                    SOLICITAR SAQUE
                </button>
                <p className="text-[10px] text-center text-slate-400 px-8 font-medium">Os pagamentos são processados toda segunda-feira diretamente na sua conta cadastrada.</p>
            </main>
        </div>
    );
};

export default MotoboyEarnings;
