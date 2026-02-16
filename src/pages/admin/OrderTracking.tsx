import { useState, useEffect } from 'react';
import { Bike, Navigation, Clock, Search, Filter, Store, X, MapPin } from 'lucide-react';
import AdminMap from '../../components/admin/AdminMap';
import { calculateDistance } from '../../lib/geoUtils';
import { supabase } from '../../lib/supabase';

const OrderTracking = () => {
    const [fleet, setFleet] = useState<any[]>([]);
    const [activeOrders, setActiveOrders] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'global'>('active');
    const [showPharmacies, setShowPharmacies] = useState(true);
    const [showMotoboys, setShowMotoboys] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'aceito' | 'preparando' | 'aguardando_motoboy' | 'pronto_entrega' | 'aguardando_retirada' | 'retirado' | 'em_rota' | 'entregue' | 'cancelado' | 'finalizado'>('all');
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [availableMotoboys, setAvailableMotoboys] = useState<any[]>([]);
    const [assigning, setAssigning] = useState(false);

    // 1. Monitoramento da Frota Real-Time
    useEffect(() => {
        const fetchInitialFleet = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, last_lat, last_lng, current_order_id, full_name')
                .eq('role', 'motoboy')
                .eq('is_online', true);

            if (data) {
                setFleet(data.map(m => ({
                    id: m.id,
                    lat: m.last_lat || -22.9068,
                    lng: m.last_lng || -43.1729,
                    name: m.full_name,
                    currentOrderId: m.current_order_id
                })));
            }
        };

        fetchInitialFleet();

        const channel = supabase
            .channel('fleet_tracking')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: 'role=eq.motoboy'
            }, (payload) => {
                const updated = payload.new as any;
                setFleet(prev => prev.map(m =>
                    m.id === updated.id
                        ? { ...m, lat: updated.last_lat, lng: updated.last_lng, currentOrderId: updated.current_order_id }
                        : m
                ));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // 2. Busca de Pedidos Ativos Reais
    const fetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('id, status, created_at, customer_name, address, pharmacy_id, pharmacies(name, latitude, longitude)')
            .not('status', 'in', '("entregue","cancelado","finalizado")')
            .order('created_at', { ascending: false });

        if (data) {
            setActiveOrders(data.map((o: any) => ({
                id: `#${o.id.substring(0, 4)}`,
                fullId: o.id,
                fullStatus: o.status,
                status: o.status === 'em_rota' ? 'Em Trânsito' :
                    o.status === 'aguardando_motoboy' ? 'Buscando Entregador' :
                        o.status === 'aguardando_retirada' ? 'Aguardando Retirada' :
                            o.status === 'retirado' ? 'Em Coleta' :
                                o.status === 'preparando' ? 'Em Preparo' :
                                    o.status === 'aceito' ? 'Aceito' :
                                        o.status === 'pronto_entrega' ? 'Pronto p/ Entrega' :
                                            'Pendente',
                time: 'Calc...',
                motoboy: 'Atribuindo...',
                origin: o.pharmacies?.name || 'Farmácia',
                dest: o.address,
                lat: Number(o.pharmacies?.latitude),
                lng: Number(o.pharmacies?.longitude)
            })));
        }
    };

    const fetchPharmacies = async () => {
        const { data } = await supabase.from('pharmacies').select('id, name, latitude, longitude');
        if (data) {
            setAllPharmacies(data.map(p => ({
                id: p.id,
                lat: Number(p.latitude),
                lng: Number(p.longitude),
                type: 'pharmacy' as const
            })));
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchPharmacies();

        // Subscription para pedidos (Fase 2 antecipada para estabilidade)
        const ordersChannel = supabase
            .channel('orders_tracking_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(ordersChannel); };
    }, []);

    // Abrir modal de atribuição
    const openAssignModal = async (order: any) => {
        setSelectedOrder(order);
        setShowAssignModal(true);

        // Buscar motoboys disponíveis (removido filtro is_online para mostrar todos)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, last_lat, last_lng, phone, is_online')
            .eq('role', 'motoboy')
            .eq('is_active', true)
            .is('current_order_id', null);

        console.log('Motoboys encontrados:', data);
        console.log('Erro na busca:', error);

        if (data) {
            // Calcular distância de cada motoboy até a farmácia
            const motoboysWithDistance = data.map(m => ({
                ...m,
                distance: calculateDistance(
                    order.lat,
                    order.lng,
                    m.last_lat || -22.9068,
                    m.last_lng || -43.1729
                )
            })).sort((a, b) => a.distance - b.distance);

            setAvailableMotoboys(motoboysWithDistance);
        }
    };

    // Atribuir motoboy ao pedido
    const assignMotoboy = async (motoboyId: string) => {
        if (!selectedOrder) return;

        setAssigning(true);
        try {
            // Atualizar pedido com motoboy
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    motoboy_id: motoboyId,
                    status: 'preparando'
                })
                .eq('id', selectedOrder.fullId);

            if (orderError) throw orderError;

            // Atualizar perfil do motoboy
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ current_order_id: selectedOrder.fullId })
                .eq('id', motoboyId);

            if (profileError) throw profileError;

            alert('Motoboy atribuído com sucesso!');
            setShowAssignModal(false);
            setSelectedOrder(null);
        } catch (error: any) {
            console.error('Erro ao atribuir motoboy:', error);
            alert('Erro ao atribuir motoboy: ' + error.message);
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex gap-8 animate-slide-up">
            {/* Lista de Pedidos à Esquerda */}
            <div className="w-96 flex flex-col gap-6">
                <div className="bg-[#111a16] border border-white/5 p-6 rounded-[32px] shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                            <Navigation size={20} />
                        </div>
                        <h2 className="text-white font-[900] italic text-xl">Rastreamento Live</h2>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar pedido ou motoboy..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:border-primary/50 outline-none transition-all"
                        />
                    </div>

                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setViewMode('active')}
                            className={`flex-1 font-black text-[9px] py-2.5 rounded-xl uppercase tracking-widest transition-all ${viewMode === 'active' ? 'bg-primary text-[#0a0f0d] shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            Ativos ({activeOrders.length})
                        </button>
                        <button
                            onClick={() => setViewMode('global')}
                            className={`flex-1 font-black text-[9px] py-2.5 rounded-xl uppercase tracking-widest transition-all ${viewMode === 'global' ? 'bg-primary text-[#0a0f0d] shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                            Mapa Global
                        </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto max-h-[400px] hide-scrollbar">
                        {activeOrders.filter(o => {
                            const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.origin.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesStatus = statusFilter === 'all' || o.fullStatus === statusFilter;
                            return matchesSearch && matchesStatus;
                        }).map((order: any) => (
                            <div key={order.fullId} className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-white font-black italic text-sm">{order.id}</p>
                                        <p className="text-primary font-black text-[9px] uppercase tracking-widest mt-0.5">{order.status}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-lg">
                                        <Clock size={10} className="text-primary" />
                                        <span className="text-primary font-bold text-[10px]">{order.time}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                                            <Bike size={16} />
                                        </div>
                                        <p className="text-slate-300 text-xs font-bold">{order.motoboy}</p>
                                    </div>
                                    {order.motoboy === 'Atribuindo...' && (
                                        <button
                                            onClick={() => openAssignModal(order)}
                                            className="bg-primary text-black px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                                        >
                                            Atribuir
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2 border-l border-dashed border-white/10 ml-4 pl-4 py-1">
                                    <div className="flex items-center gap-2">
                                        <div className="size-1.5 bg-blue-500 rounded-full"></div>
                                        <p className="text-slate-500 text-[10px] font-medium truncate">{order.origin}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-1.5 bg-primary rounded-full"></div>
                                        <p className="text-slate-300 text-[10px] font-bold truncate">{order.dest}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Resumo Rápido da Frota */}
                <div className="bg-primary/5 border border-primary/10 p-6 rounded-[32px]">
                    <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-4">Frota em Serviço</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-white text-3xl font-[900] italic">{fleet.filter(m => m.currentOrderId).length} / {fleet.length}</h4>
                        <span className="text-primary text-[10px] font-bold italic mb-1">Ocupados agora</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                        <div
                            className="h-full bg-primary shadow-[0_0_10px_#13ec6d] transition-all duration-1000"
                            style={{ width: `${(fleet.filter(m => m.currentOrderId).length / (fleet.length || 1)) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Mapa Principal à Direita */}
            <div className="flex-1 bg-[#111a16] border border-white/5 rounded-[40px] shadow-xl overflow-hidden relative">
                <AdminMap
                    type="tracking"
                    fleet={showMotoboys ? fleet : []}
                    autoCenter={true}
                    markers={[
                        ...(showPharmacies && viewMode === 'global' ? allPharmacies : []),
                        ...(viewMode === 'active' ? activeOrders.filter(o => o.lat && o.lng).map(o => ({
                            id: o.fullId,
                            lat: o.lat,
                            lng: o.lng,
                            type: 'order' as const
                        })) : [])
                    ]}
                />

                {/* Overlay de Filtros no Mapa */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-none">
                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            onClick={() => setShowPharmacies(!showPharmacies)}
                            className={`border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${showPharmacies ? 'bg-primary text-[#0a0f0d]' : 'bg-[#1a2b23] text-white'}`}
                        >
                            <Store size={14} className={showPharmacies ? 'text-black' : 'text-primary'} />
                            Farmácias
                        </button>
                        <button
                            onClick={() => setShowMotoboys(!showMotoboys)}
                            className={`border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${showMotoboys ? 'bg-primary text-[#0a0f0d]' : 'bg-[#1a2b23] text-white'}`}
                        >
                            <Bike size={14} className={showMotoboys ? 'text-black' : 'text-primary'} />
                            Motoboys
                        </button>
                    </div>

                    <div className="relative pointer-events-auto">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            className={`size-11 rounded-2xl flex items-center justify-center shadow-lg transition-all ${statusFilter !== 'all' ? 'bg-primary text-[#0a0f0d]' : 'bg-[#1a2b23] text-white border border-white/10'}`}
                        >
                            <Filter size={20} />
                        </button>

                        {showStatusMenu && (
                            <div className="absolute top-14 right-0 w-56 bg-[#1a2b23] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-slide-up">
                                {['all', 'pendente', 'aceito', 'preparando', 'aguardando_motoboy', 'pronto_entrega', 'aguardando_retirada', 'retirado', 'em_rota'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            setStatusFilter(s as any);
                                            setShowStatusMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${statusFilter === s ? 'bg-primary text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        {s === 'all' ? 'Todos os Status' :
                                            s === 'em_rota' ? 'Em Rota' :
                                                s === 'aguardando_motoboy' ? 'Buscando Motoboy' :
                                                    s === 'aguardando_retirada' ? 'Aguard. Retirada' :
                                                        s === 'pronto_entrega' ? 'Pronto p/ Entrega' :
                                                            s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Atribuição de Motoboy */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111a16] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div>
                                <h3 className="text-white font-black text-xl">Atribuir Motoboy</h3>
                                <p className="text-slate-400 text-sm mt-1">Pedido {selectedOrder?.id}</p>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="size-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Lista de Motoboys */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {availableMotoboys.length === 0 ? (
                                <div className="text-center py-12">
                                    <Bike className="mx-auto text-slate-600 mb-4" size={48} />
                                    <p className="text-slate-400 font-bold">Nenhum motoboy disponível no momento</p>
                                    <p className="text-slate-500 text-sm mt-2">Todos os motoboys estão ocupados ou offline</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {availableMotoboys.map((motoboy) => (
                                        <div
                                            key={motoboy.id}
                                            className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-all group cursor-pointer"
                                            onClick={() => !assigning && assignMotoboy(motoboy.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                        <Bike className="text-primary" size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{motoboy.full_name}</p>
                                                        <p className="text-slate-400 text-xs mt-0.5">{motoboy.phone || 'Sem telefone'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1.5 text-primary">
                                                            <MapPin size={14} />
                                                            <span className="font-bold text-sm">{motoboy.distance.toFixed(1)} km</span>
                                                        </div>
                                                        <p className="text-slate-500 text-[10px] mt-0.5">da farmácia</p>
                                                    </div>
                                                    <button
                                                        disabled={assigning}
                                                        className="bg-primary text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {assigning ? 'Atribuindo...' : 'Selecionar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderTracking;
