import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Banknote,
    ShoppingBag,
    Store,
    ArrowUpRight,
    ArrowDownRight,
    ShoppingBasket,
    Map as MapIcon,
    TrendingUp,
    Calendar,
    Trophy
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import AdminMap from '../../components/admin/AdminMap';
import SupportAlerts from '../../components/admin/SupportAlerts';

import OrderAuditModal from '../../components/admin/OrderAuditModal';
import { supabase } from '../../lib/supabase';
import { SystemHealth } from '../../components/admin/SystemHealth';
import { adminService } from '../../api/adminService';
import type { AdminStats, ActivityItem, ChartDataItem, TopPharmacy, TopCategory, TopProduct } from '../../types/admin';

const AdminDashboard = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [timeFilter, setTimeFilter] = useState('7d'); // hoje, 7d, 30d, personalizado
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [statsData, setStatsData] = useState<AdminStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [mapMarkers, setMapMarkers] = useState<any[]>([]);
    const [topPharmacies, setTopPharmacies] = useState<TopPharmacy[]>([]);
    const [monthlyProjection, setMonthlyProjection] = useState(0);
    const [slaValue, setSlaValue] = useState('94.8%');
    const [isRushMode, setIsRushMode] = useState(false);
    const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [mapMode, setMapMode] = useState<'activity' | 'profitability'>('activity');
    const [profitabilityData, setProfitabilityData] = useState<any[]>([]);
    const [googleKey, setGoogleKey] = useState<string | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [simulationFleet, setSimulationFleet] = useState<any[]>([]);

    // 0. Fetch Google Maps Key
    useEffect(() => {
        adminService.getGoogleMapsKey().then(setGoogleKey);
    }, []);

    // 1. Fetch & Sync Data
    const loadDashboardData = async () => {
        const data = await adminService.fetchDashboardData(timeFilter, customDates);

        setStatsData(data.stats);
        setTopPharmacies(data.topPharmacies);
        setTopCategories(data.topCategories);
        setTopProducts(data.topProducts);
        setMonthlyProjection(data.monthlyProjection);

        // Activity Mapping
        setRecentActivity(data.recentOrders.map(o => ({
            id: o.id,
            user: o.customer_name || 'Cliente',
            action: o.status === 'entregue' ? 'Pedido Entregue' : 'Novo Pedido',
            time: new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            icon: ShoppingBasket,
            color: o.status === 'entregue' ? '#13ec6d' : '#3b82f6'
        })));

        // Map Data
        setHeatmapData(data.pharmNames
            .filter(loc => loc.latitude && loc.longitude)
            .map(loc => ({ lat: Number(loc.latitude), lng: Number(loc.longitude) }))
        );

        setMapMarkers(data.pharmNames.map(p => ({
            id: p.id,
            lat: Number(p.latitude || -22.9068),
            lng: Number(p.longitude || -43.1729),
            type: 'pharmacy',
            phone: p.phone || p.establishment_phone || '550000000000'
        })));

        setProfitabilityData(data.currentSales.map(o => {
            const farm = data.pharmNames.find(p => p.id === o.pharmacy_id);
            return farm && farm.latitude ? { lat: Number(farm.latitude), lng: Number(farm.longitude), weight: Number(o.total_price) } : null;
        }).filter(Boolean));

        // Rush Mode detection
        setIsRushMode(data.stats.activeOrders > 10);

        // Chart Data formatting
        const formattedChart = formatChartData(data.currentSales, timeFilter);
        setChartData(formattedChart);
    };

    const formatChartData = (orders: any[], filter: string) => {
        if (filter === 'hoje') {
            const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, sales: 0 }));
            orders.forEach(o => hours[new Date(o.created_at).getHours()].sales += (o.total_price || 0));
            return hours;
        }
        const lastN = filter === '7d' ? 7 : 30;
        const daysMap: { [key: string]: number } = {};
        for (let i = lastN - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            daysMap[d.toLocaleDateString('pt-BR', { weekday: 'short' })] = 0;
        }
        orders.forEach(o => {
            const label = new Date(o.created_at).toLocaleDateString('pt-BR', { weekday: 'short' });
            if (daysMap[label] !== undefined) daysMap[label] += (o.total_price || 0);
        });
        return Object.entries(daysMap).map(([name, sales]) => ({ name, sales }));
    };

    // Debounced load logic to prevent request storms
    useEffect(() => {
        loadDashboardData();

        let debounceTimer: ReturnType<typeof setTimeout>;

        const channel = supabase
            .channel('admin_dashboard_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                // Immediate UI update for "Live Activity" (Lightweight)
                if (payload.eventType === 'INSERT') {
                    const newOrder = payload.new;
                    setRecentActivity(prev => [
                        { id: newOrder.id, user: newOrder.customer_name || 'Novo Cliente', action: 'Realizou um pedido', time: 'AGORA', icon: ShoppingBasket, color: '#13ec6d' },
                        ...prev.slice(0, 3)
                    ]);
                }

                // Debounced heavy reload (Heavyweight - 6+ queries)
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log('🔄 Dashboard: Executando recarregamento debounced...');
                    loadDashboardData();
                }, 2000); // 2 seconds threshold
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            clearTimeout(debounceTimer);
        };
    }, [timeFilter, customDates]);

    const stats = [
        { label: 'TOTAL VENDAS', value: statsData?.sales ? (statsData.sales >= 1000 ? `R$ ${(statsData.sales / 1000).toFixed(1)}k` : `R$ ${statsData.sales.toFixed(2)}`) : 'R$ 0', change: `${statsData?.salesChange && statsData.salesChange >= 0 ? '+' : ''}${statsData?.salesChange?.toFixed(1) || 0}%`, icon: Banknote, positive: (statsData?.salesChange || 0) >= 0, key: 'sales' },
        { label: 'TICKET MÉDIO', value: `R$ ${statsData?.avgTicket?.toFixed(2) || 0}`, change: `${statsData?.avgTicketChange && statsData.avgTicketChange >= 0 ? '+' : ''}${statsData?.avgTicketChange?.toFixed(1) || 0}%`, icon: ArrowUpRight, positive: (statsData?.avgTicketChange || 0) >= 0, key: 'avg_ticket' },
        { label: 'PEDIDOS ATIVOS', value: String(statsData?.activeOrders || 0), change: 'ESTÁVEL', icon: ShoppingBag, positive: true, key: 'orders' },
        { label: 'FARMÁCIAS', value: String(statsData?.pharmaciesCount || 0), change: '+12%', icon: Store, positive: true, key: 'pharmacies' },
    ];

    const handleExportCSV = () => {
        const headers = ['ID', 'Cliente', 'Valor', 'Status', 'Data'];
        const rows = recentActivity.map(a => [a.id, a.user, a.action, a.time]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_vendas_${timeFilter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleMotoboyClick = (orderId: string) => {
        // Navegar para rastreamento passando o orderId via state para o OrderTracking focar nele
        navigate('/dashboard/tracking', { state: { focusOrderId: orderId } });
    };



    return (
        <div className="space-y-10 animate-slide-up relative">
            {isRushMode && (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[32px] flex items-center justify-between animate-pulse-subtle border-l-8 border-l-red-500">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                            <TrendingUp size={24} className="animate-bounce" />
                        </div>
                        <div>
                            <h4 className="text-white font-[900] italic text-lg uppercase tracking-tight">Modo Rush Ativado!</h4>
                            <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Demanda crítica detectada. Mais de 10 pedidos aguardando ação imediata.</p>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <span className="bg-red-500 text-white font-black text-[10px] px-3 py-1 rounded-lg animate-pulse uppercase tracking-[0.2em]">Prioridade Máxima</span>
                    </div>
                </div>
            )}
            <SupportAlerts />

            {/* Saudação e Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-[900] italic text-white tracking-tight leading-none">Bem-vindo, {profile?.full_name?.split(' ')[0] || 'Vinicius'}</h2>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Monitoramento Real-time Ativo.</p>
                </div>

                <div className="flex items-center gap-3 bg-[#111a16] p-2 rounded-2xl border border-white/5">
                    <button
                        onClick={handleExportCSV}
                        className="p-2 text-slate-500 hover:text-primary transition-colors border-r border-white/5 mr-1"
                        title="Exportar CSV"
                    >
                        <TrendingUp size={18} className="rotate-90" />
                    </button>
                    {[
                        { id: 'hoje', label: 'HOJE' },
                        { id: '7d', label: '7 DIAS' },
                        { id: '30d', label: '30 DIAS' }
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setTimeFilter(f.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${timeFilter === f.id
                                ? 'bg-primary text-[#0a0f0d] shadow-lg shadow-primary/20'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-white/5 mx-2 hidden md:block"></div>
                    <button
                        onClick={() => setShowCustomPicker(!showCustomPicker)}
                        className={`p-2 transition-colors ${showCustomPicker ? 'bg-white/5 text-primary' : 'text-slate-500 hover:text-primary'}`}
                    >
                        <Calendar size={18} />
                    </button>
                </div>
            </div>

            {/* Date Picker Personalizado Extra */}
            {showCustomPicker && (
                <div className="flex flex-wrap items-center gap-4 bg-[#111a16] p-6 rounded-[32px] border border-white/5 animate-slide-up">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Data Início</span>
                        <input
                            type="date"
                            className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-primary/30 transition-all font-bold"
                            value={customDates.start}
                            onChange={(e) => {
                                setCustomDates(prev => ({ ...prev, start: e.target.value }));
                                setTimeFilter('personalizado');
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Data Fim</span>
                        <input
                            type="date"
                            className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-primary/30 transition-all font-bold"
                            value={customDates.end}
                            onChange={(e) => {
                                setCustomDates(prev => ({ ...prev, end: e.target.value }));
                                setTimeFilter('personalizado');
                            }}
                        />
                    </div>
                    {timeFilter === 'personalizado' && (
                        <button
                            onClick={() => {
                                setTimeFilter('7d');
                                setCustomDates({ start: '', end: '' });
                                setShowCustomPicker(false);
                            }}
                            className="mt-5 px-4 py-2 text-[9px] font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
                        >
                            Limpar Filtro
                        </button>
                    )}
                </div>
            )}

            {/* System Health Overview (New) */}
            <SystemHealth />

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-[#111a16] border border-white/5 p-8 rounded-[32px] hover:border-primary/20 transition-all group shadow-xl relative overflow-hidden">
                        <div className="absolute top-4 right-6 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                            <div className="size-1.5 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">Live</span>
                        </div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="size-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <stat.icon size={24} className="text-primary" />
                            </div>
                            {stat.change && (
                                <div className={`flex items-center gap-1 text-xs font-black italic ${stat.positive ? 'text-primary' : 'text-red-500'}`}>
                                    {stat.change}
                                    {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 font-bold text-[10px] tracking-[0.2em] uppercase mb-1">{stat.label}</p>
                        <h3 className="text-white text-3xl font-[900] italic tracking-tighter animate-pulse-subtle">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gráfico de Performance Real */}
                <div className="lg:col-span-2 bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <TrendingUp size={18} className="text-primary" />
                            </div>
                            <h3 className="text-white text-xl font-[900] italic tracking-tight">Crescimento de Vendas</h3>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="size-2 bg-primary rounded-full"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#13ec6d" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#13ec6d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                    dy={10}
                                />
                                <YAxis
                                    hide={true}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111a16',
                                        border: '1px solid rgba(19, 236, 109, 0.2)',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        color: '#fff',
                                        fontStyle: 'italic',
                                        fontWeight: 900
                                    }}
                                    itemStyle={{ color: '#13ec6d' }}
                                    cursor={{ stroke: '#13ec6d', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#13ec6d"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Atividade Recente (Agora Real-time) */}
                <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl overflow-hidden flex flex-col">
                    <h3 className="text-white text-xl font-[900] italic tracking-tight mb-8 shrink-0">Atividade Live</h3>
                    <div className="space-y-8 flex-1 overflow-y-auto hide-scrollbar">
                        {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
                            <div
                                key={i}
                                onClick={() => activity.id && setSelectedOrderId(activity.id)}
                                className="flex items-center gap-4 group cursor-pointer animate-slide-in hover:bg-white/[0.02] p-2 -mx-2 rounded-2xl transition-all"
                            >
                                <div
                                    className="size-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: `${activity.color}20` }}
                                >
                                    <activity.icon size={20} style={{ color: activity.color }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold italic text-sm">
                                        <span style={{ color: activity.color }}>{activity.user}</span> {activity.action}
                                    </p>
                                    <p className="text-slate-500 font-bold text-[9px] tracking-[0.1em] mt-1 uppercase">{activity.time}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <ShoppingBasket size={48} className="mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-center">Aguardando atividade...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mapa de Calor (Posicionado abaixo do gráfico) */}
                <div className="lg:col-span-2 bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col min-h-[450px]">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <MapIcon size={18} className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-white text-xl font-[900] italic tracking-tight uppercase leading-none">Mapa Inteligente</h3>
                                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1">Geolocalização de demanda {mapMode === 'profitability' ? 'e rentabilidade' : ''}</p>
                            </div>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl">
                            <button
                                onClick={() => setMapMode('activity')}
                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${mapMode === 'activity' ? 'bg-primary text-black' : 'text-slate-400'}`}
                            >
                                Atividade
                            </button>
                            <button
                                onClick={() => setMapMode('profitability')}
                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${mapMode === 'profitability' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400'}`}
                            >
                                Lucratividade
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 w-full relative min-h-[300px]">
                        <AdminMap
                            type="heatmap"
                            data={mapMode === 'activity' ? heatmapData : profitabilityData}
                            fleet={simulationFleet}
                            onMotoboyClick={handleMotoboyClick}
                            markers={mapMarkers}
                            autoCenter={true}
                            googleMapsApiKey={googleKey || ""}
                        />
                    </div>
                </div>

                {/* Nova Seção: Performance por Categoria (Premium) */}
                <div className="grid grid-rows-2 gap-8">
                    <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Top Categorias</p>
                            <TrendingUp size={16} className="text-primary" />
                        </div>
                        <div className="space-y-4">
                            {topCategories.length > 0 ? topCategories.map((cat, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-white font-bold italic text-xs uppercase">{cat.name}</span>
                                        <span className="text-slate-500 font-black text-[10px]">R$ {cat.total.toFixed(0)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/40 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (cat.total / topCategories[0].total) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="h-20 flex items-center justify-center opacity-20 italic font-black text-[9px] uppercase tracking-widest">Processando categorias...</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] flex flex-col justify-center shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                            <TrendingUp size={120} />
                        </div>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-4">Meta de Faturamento (Projeção)</p>
                        <div className="flex justify-between items-end mb-2">
                            <h4 className="text-white text-2xl font-[900] italic">
                                R$ {monthlyProjection >= 1000 ? `${(monthlyProjection / 1000).toFixed(1)}k` : monthlyProjection.toFixed(0)}
                                <span className="text-xs text-slate-500 font-bold not-italic ml-2">/ R$ 200k esperado</span>
                            </h4>
                            <span className="text-primary font-black text-xs italic">{Math.min(100, (monthlyProjection / 200000) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-primary shadow-[0_0_20px_#13ec6d60] transition-all duration-1000"
                                style={{ width: `${Math.min(100, (monthlyProjection / 200000) * 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold mt-4 uppercase tracking-[0.1em]">Basado no seu desempenho atual de {timeFilter}.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ranking de Farmácias com WhatsApp (Premium) */}
                <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col h-[450px]">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Trophy size={18} className="text-primary" />
                            </div>
                            <h3 className="text-white text-xl font-[900] italic tracking-tight">Top Farmácias</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Faturamento</span>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto hide-scrollbar">
                        {topPharmacies.length > 0 ? topPharmacies.map((pharma, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center font-black italic text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold italic text-sm">{pharma.name}</p>
                                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">Performance Premium</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <h4 className="text-white font-[900] italic text-sm">R$ {pharma.total.toFixed(0)}</h4>
                                    <button
                                        onClick={() => window.open(`https://wa.me/550000000000?text=Olá, sua farmácia ${pharma.name} está no TOP RANKING!`, '_blank')}
                                        className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Banknote size={14} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 italic font-bold text-xs uppercase tracking-widest">
                                Sem faturamento no período
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-[#111a16] border border-white/5 p-8 rounded-[40px] shadow-xl flex flex-col h-[450px]">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ShoppingBag size={18} className="text-primary" />
                            </div>
                            <h3 className="text-white text-xl font-[900] italic tracking-tight">Top Produtos</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Volume de Vendas</span>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto hide-scrollbar">
                        {topProducts.length > 0 ? topProducts.map((prod, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center font-black italic text-slate-400 group-hover:text-primary transition-colors">
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold italic text-sm">{prod.name}</p>
                                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">{prod.category}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <h4 className="text-white font-[900] italic text-sm">{prod.quantity} un.</h4>
                                    <span className="text-[9px] font-black text-primary">R$ {prod.total.toFixed(2)}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 italic font-bold text-xs uppercase tracking-widest">
                                Sem vendas no período
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedOrderId && (
                <OrderAuditModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
