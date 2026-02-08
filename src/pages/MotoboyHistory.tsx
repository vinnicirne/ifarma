import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MaterialIcon } from '../components/MaterialIcon';

const MotoboyHistory = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [stats, setStats] = useState({ todayCount: 0, totalCount: 0 });

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/motoboy-login');
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*, pharmacies!pharmacy_id(name)')
                .eq('motoboy_id', user.id)
                .eq('status', 'entregue')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (data) {
                setDeliveries(data);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const todayCount = data.filter(o => new Date(o.created_at) >= today).length;
                setStats({ todayCount, totalCount: data.length });
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#102218] text-slate-900 dark:text-white pb-20">
            <header className="sticky top-0 z-50 bg-white dark:bg-[#102218] border-b border-slate-200 dark:border-white/5 p-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                    <MaterialIcon name="arrow_back" />
                </button>
                <h1 className="text-xl font-black italic tracking-tighter">HISTÓRICO</h1>
            </header>

            <main className="p-4 space-y-6">
                {/* Resumo Rápido */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Hoje</p>
                        <p className="text-2xl font-black text-[#13ec6d]">{stats.todayCount} Entregas</p>
                    </div>
                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Total</p>
                        <p className="text-2xl font-black">{stats.totalCount}</p>
                    </div>
                </div>

                {/* Lista de Entregas */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="animate-pulse space-y-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-slate-100 dark:bg-white/5 rounded-2xl" />
                            ))}
                        </div>
                    ) : deliveries.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <MaterialIcon name="history_toggle_off" className="text-6xl mb-2" />
                            <p className="font-bold">Nenhuma entrega no seu histórico.</p>
                        </div>
                    ) : (
                        deliveries.map((delivery) => (
                            <div key={delivery.id} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-black text-sm">#{delivery.id.substring(0, 8)}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(delivery.created_at).toLocaleDateString('pt-BR')} às {new Date(delivery.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="bg-green-500 text-black px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                                        Concluída
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <MaterialIcon name="store" className="text-sm" />
                                    <span className="truncate">{(delivery.pharmacies as any)?.name || 'Farmácia'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <MaterialIcon name="location_on" className="text-sm text-red-500" />
                                    <span className="truncate">{delivery.address}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default MotoboyHistory;
