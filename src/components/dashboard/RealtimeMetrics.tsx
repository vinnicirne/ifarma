import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

const RealtimeMetrics = ({ orders = [], className = '', userRole = 'merchant' }: { orders: any[], className?: string, userRole?: string }) => {
    const [ranking, setRanking] = useState<any[]>([]);
    const [filterPeriod, setFilterPeriod] = useState('Hoje'); // Default to Today, safer
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Filter Options Logic
    const availableFilters = useMemo(() => {
        if (userRole === 'staff') return ['Hoje'];
        return ['Hoje', '7 dias', 'Semana passada', '30 dias', 'Personalizado'];
    }, [userRole]);

    // Force 'Hoje' if staff tries to access other periods (or on mount/change)
    useEffect(() => {
        if (userRole === 'staff' && filterPeriod !== 'Hoje') {
            setFilterPeriod('Hoje');
        }
    }, [userRole, filterPeriod]);

    // 1. Process Data & Filter
    const { filteredOrders, todaySales, todayOrders, todayUnits, chartData } = useMemo(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        // Define Start/End based on selection
        switch (filterPeriod) {
            case 'Hoje':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case '7 dias':
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'Semana passada':
                // Calculate start of last week (Sunday)
                start.setDate(now.getDate() - now.getDay() - 7);
                start.setHours(0, 0, 0, 0);
                // Calculate end of last week (Saturday)
                end.setDate(now.getDate() - now.getDay() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case '30 dias':
                start.setDate(now.getDate() - 30);
                start.setHours(0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'Personalizado':
                if (customRange.start) {
                    start = new Date(customRange.start);
                    start.setHours(0, 0, 0, 0);
                } else {
                    // Default to Today if no start date
                    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                }

                if (customRange.end) {
                    end = new Date(customRange.end);
                    end.setHours(23, 59, 59, 999);
                } else {
                    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                }
                break;
        }

        const filtered = orders.filter(o => {
            const d = new Date(o.created_at);
            return d >= start && d <= end;
        });

        const sales = filtered.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
        const count = filtered.length;
        const units = filtered.reduce((acc, curr) => acc + (curr.total_items || 1), 0);

        // Chart Data (Group by Day for ranges > 1 day, or Hour for Today)
        let chartPoints = [];
        if (filterPeriod === 'Hoje') {
            chartPoints = Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, value: 0 }));
            filtered.forEach(o => {
                const h = new Date(o.created_at).getHours();
                chartPoints[h].value += (parseFloat(o.total_price) || 0);
            });
        } else {
            // Group by Day
            const daysMap = new Map();
            // Initialize last N days to 0
            // Cap at 31 days to correct performance/loop issues
            const dayDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
            const dayCount = Math.min(dayDiff, 31);

            for (let i = 0; i <= dayCount; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                const k = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                daysMap.set(k, 0);
            }

            filtered.forEach(o => {
                const k = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (daysMap.has(k)) {
                    daysMap.set(k, daysMap.get(k) + (parseFloat(o.total_price) || 0));
                }
            });
            chartPoints = Array.from(daysMap.entries()).map(([label, value]) => ({ label, value }));
        }

        return {
            filteredOrders: filtered,
            todaySales: sales,
            todayOrders: count,
            todayUnits: units,
            chartData: chartPoints
        };
    }, [orders, filterPeriod, customRange]);

    // 2. Fetch Ranking Data
    useEffect(() => {
        const fetchRanking = async () => {
            if (filteredOrders.length === 0) {
                setRanking([]);
                return;
            }

            const orderIds = filteredOrders.map(o => o.id);

            const fetchItemsInChunks = async (ids: string[]) => {
                const chunkSize = 100;
                let allItems: any[] = [];
                for (let i = 0; i < ids.length; i += chunkSize) {
                    const chunk = ids.slice(i, i + chunkSize);
                    const { data } = await supabase
                        .from('order_items')
                        .select('quantity, unit_price, product_id, products(name, image_url)')
                        .in('order_id', chunk);
                    if (data) allItems = [...allItems, ...data];
                }
                return allItems;
            };

            const items = await fetchItemsInChunks(orderIds);

            if (items && items.length > 0) {
                // Group by Product
                const grouped = items.reduce((acc: any, item: any) => {
                    const pid = item.product_id;
                    if (!acc[pid]) {
                        acc[pid] = {
                            name: item.products?.name || 'Produto Desconhecido',
                            image: item.products?.image_url,
                            quantity: 0,
                            total_value: 0
                        };
                    }
                    acc[pid].quantity += item.quantity;
                    acc[pid].total_value += (item.quantity * item.unit_price);
                    return acc;
                }, {});

                // Convert to Array and Sort
                const sorted = Object.values(grouped)
                    .sort((a: any, b: any) => b.quantity - a.quantity)
                    .slice(0, 5); // Top 5

                setRanking(sorted as any[]);
            } else {
                setRanking([]);
            }
        };

        fetchRanking();
    }, [filteredOrders]);

    return (
        <div className={`bg-white dark:bg-[#1a2e23] border border-slate-200 dark:border-white/5 rounded-[32px] p-8 shadow-sm ${className} relative`}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-black italic text-slate-900 dark:text-white tracking-tighter">Métricas Integradas</h2>
                        {userRole === 'staff' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-500/30">Visão de Caixa</span>
                        )}
                    </div>
                </div>

                {/* Date Selector */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-black/20 p-1 rounded-xl">
                    {availableFilters.map(Option => (
                        <button
                            key={Option}
                            onClick={() => {
                                setFilterPeriod(Option);
                                if (Option !== 'Personalizado') setShowDatePicker(false);
                                else setShowDatePicker(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterPeriod === Option
                                ? 'bg-white dark:bg-[#1a2e23] text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                        >
                            {Option}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Date Picker Inputs */}
            {filterPeriod === 'Personalizado' && showDatePicker && (
                <div className="absolute top-20 right-8 z-20 bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 flex gap-4 animate-fade-in items-end">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Início</label>
                        <input
                            type="date"
                            className="block mt-1 bg-slate-50 dark:bg-black/20 border-none rounded-lg px-3 py-1 text-xs font-bold text-slate-700 dark:text-white outline-none"
                            onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))}
                            value={customRange.start}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                        <input
                            type="date"
                            className="block mt-1 bg-slate-50 dark:bg-black/20 border-none rounded-lg px-3 py-1 text-xs font-bold text-slate-700 dark:text-white outline-none"
                            onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))}
                            value={customRange.end}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Chart Section */}
                <div className="lg:col-span-2 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {filterPeriod === 'Hoje' ? 'Vendas de Hoje' : `Vendas: ${filterPeriod}`}
                    </p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todaySales)}
                    </h3>

                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* KPI Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-4 border-t border-slate-100 dark:border-white/5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Visitantes</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">5</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cliques</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">6</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pedidos</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{todayOrders}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Unidades</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{todayUnits || ranking.reduce((acc, i) => acc + i.quantity, 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Ranking Column */}
                <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-6 border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black italic text-slate-900 dark:text-white">Ranking em Tempo Real</h3>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TOP 5</div>
                    </div>

                    <div className="space-y-4">
                        {ranking.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                                <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                                <p className="text-xs font-bold">Nenhum dado no período</p>
                            </div>
                        ) : (
                            ranking.map((item, index) => (
                                <div key={index} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="size-8 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center font-black text-xs shadow-sm border border-slate-200 dark:border-white/5 shrink-0 text-slate-700 dark:text-white">
                                        {index + 1}º
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.name}>{item.name}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {item.quantity} un • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_value)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RealtimeMetrics;
