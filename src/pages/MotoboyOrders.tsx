import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MaterialIcon } from '../components/MaterialIcon';
import { useAudio } from '../hooks/useAudio';

const MotoboyOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
    const { play: playAudio } = useAudio();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            } else {
                navigate('/motoboy-login');
            }
        };
        checkUser();
    }, [navigate]);

    useEffect(() => {
        if (!userId) return;

        fetchOrders();

        // REMOVIDO: O hook useMotoboyQueue (Dashboard) já cuida dos sons de notificação globais.
        // Ter dois canais de Realtime abertos aqui estava causando sons 'embolados' (eco).
        fetchOrders();

        return () => { };
    }, [userId]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, pharmacies(name, address)')
                .eq('motoboy_id', userId)
                .in('status', ['pendente', 'aceito', 'preparando', 'pronto_entrega', 'aguardando_retirada', 'retirado', 'em_rota'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            'pendente': 'Pendente',
            'preparando': 'Preparando',
            'pronto_entrega': 'Aguardando Retirada',
            'retirado': 'Retirado (Iniciar Rota)',
            'em_rota': 'Em Rota',
            'entregue': 'Entregue',
            'cancelado': 'Cancelado'
        };
        return map[status] || status;
    };

    const getStatusColor = (status: string) => {
        const map: Record<string, string> = {
            'pronto_entrega': 'text-orange-500 bg-orange-500/10',
            'retirado': 'text-blue-400 bg-blue-400/10',
            'em_rota': 'text-blue-500 bg-blue-500/10',
            'entregue': 'text-green-500 bg-green-500/10',
            'cancelado': 'text-red-500 bg-red-500/10'
        };
        return map[status] || 'text-slate-500 bg-slate-500/10';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col min-h-screen w-full max-w-[480px] mx-auto bg-background-light dark:bg-background-dark font-display text-white transition-colors duration-200">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-light dark:bg-background-dark border-b border-gray-200 dark:border-[#324467] px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg text-primary">
                            <MaterialIcon name="motorcycle" className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">Pedidos para Entrega</h1>
                            <p className="text-xs text-slate-400 dark:text-[#92a4c9]">
                                {loading ? 'Atualizando...' : `${orders.length} pedido(s) ativo(s)`}
                            </p>
                        </div>
                    </div>
                    <button className="relative p-2 text-slate-400 dark:text-[#92a4c9] hover:text-slate-900 dark:hover:text-white transition-colors">
                        <MaterialIcon name="notifications" />
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500"></span>
                    </button>
                </div>
            </header>

            {/* Tabs for View Switching */}
            <nav className="bg-background-light dark:bg-background-dark px-4 w-full sticky top-[76px] z-40">
                <div className="flex border-b border-gray-200 dark:border-[#324467] gap-8">
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-colors ${activeTab === 'queue' ? 'border-primary text-primary dark:text-white' : 'border-transparent text-slate-400 dark:text-[#92a4c9]'}`}
                    >
                        <p className="text-sm font-bold leading-normal tracking-wide">Fila de Entrega</p>
                    </button>
                    <Link
                        to="/motoboy-history"
                        className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 transition-colors ${activeTab === 'history' ? 'border-primary text-primary dark:text-white' : 'border-transparent text-slate-400 dark:text-[#92a4c9]'}`}
                    >
                        <p className="text-sm font-bold leading-normal tracking-wide">Histórico</p>
                    </Link>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto px-4 py-6 w-full space-y-4 pb-24">
                {activeTab === 'queue' && (
                    <>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                <p className="text-slate-500 text-sm">Carregando pedidos...</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#92a4c9]">
                                <MaterialIcon name="checklist" className="text-6xl mb-4 opacity-50" />
                                <h3 className="text-lg font-bold mb-2">Sem pedidos no momento</h3>
                                <p className="text-sm text-center max-w-[250px]">
                                    Aguarde, novos pedidos atribuídos a você aparecerão aqui automaticamente.
                                </p>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.id} className="flex flex-col bg-white dark:bg-[#192233] rounded-xl shadow-lg border border-gray-100 dark:border-[#324467] overflow-hidden">
                                    {order.notes && (
                                        <div className="bg-yellow-500/10 px-4 py-2 border-b border-yellow-500/20 flex items-center gap-2">
                                            <MaterialIcon name="info" className="text-yellow-500 text-sm" />
                                            <p className="text-yellow-600 dark:text-yellow-500 text-xs font-bold uppercase tracking-wider truncate">
                                                Obs: {order.notes}
                                            </p>
                                        </div>
                                    )}
                                    <div className="p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                                    Pedido #{order.id.substring(0, 4)}
                                                </h2>
                                                <p className="text-slate-400 dark:text-[#92a4c9] text-sm mt-1">
                                                    {formatTime(order.created_at)}
                                                </p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                {getStatusLabel(order.status)}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <MaterialIcon name="store" className="text-slate-400 dark:text-[#92a4c9]" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">RETIRADA</p>
                                                    <p className="text-slate-700 dark:text-gray-200 font-semibold">
                                                        {order.pharmacies?.name || 'Farmácia'}
                                                    </p>
                                                    <p className="text-slate-400 dark:text-[#92a4c9] text-xs">
                                                        {order.pharmacies?.address}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <MaterialIcon name="location_on" className="text-slate-400 dark:text-[#92a4c9]" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">ENTREGA</p>
                                                    <p className="text-slate-700 dark:text-gray-200 font-semibold">
                                                        {order.customer_name || 'Cliente'}
                                                    </p>
                                                    <p className="text-slate-400 dark:text-[#92a4c9] text-sm leading-relaxed">
                                                        {order.address}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            to={`/motoboy-delivery/${order.id}`}
                                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                        >
                                            <MaterialIcon name="navigation" />
                                            <span>
                                                {order.status === 'em_rota' ? 'Continuar Entrega' : 'Visualizar Detalhes'}
                                            </span>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#92a4c9]">
                        <MaterialIcon name="history" className="text-6xl mb-4 opacity-50" />
                        <p className="text-sm font-medium">Verifique a aba Histórico para entregas passadas</p>
                    </div>
                )}
            </main>

            {/* Map/Quick View Sticky Footer for iOS look */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-gray-200 dark:border-[#324467] p-4 flex justify-around items-center max-w-[480px] mx-auto z-50">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'queue' ? 'text-primary' : 'text-slate-400 dark:text-[#92a4c9]'}`}
                >
                    <MaterialIcon name="view_list" />
                    <span className="text-[10px] font-bold">FILA</span>
                </button>
                <Link to="/motoboy-dashboard" className="flex flex-col items-center gap-1 text-slate-400 dark:text-[#92a4c9] hover:text-primary transition-colors">
                    <MaterialIcon name="map" />
                    <span className="text-[10px] font-bold">MAPA</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-slate-400 dark:text-[#92a4c9] hover:text-primary transition-colors">
                    <MaterialIcon name="account_circle" />
                    <span className="text-[10px] font-bold">PERFIL</span>
                </button>
            </div>
        </div>
    );
};

export default MotoboyOrders;
