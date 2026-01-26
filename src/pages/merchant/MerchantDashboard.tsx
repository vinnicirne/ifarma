import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantDashboard = () => {
    return (
        <MerchantLayout activeTab="dashboard" title="Visão Geral">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Olá, Farmácia Central!</h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Aqui está o resumo do seu dia.</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                        <MaterialIcon name="calendar_today" className="text-slate-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white">Hoje, 25 Out</span>
                    </div>
                    <button className="size-10 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 active:scale-95 transition-transform">
                        <MaterialIcon name="notifications" className="text-slate-600 dark:text-white" />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Vendas Hoje', value: 'R$ 1.250', trend: '+15%', color: 'primary', icon: 'payments' },
                    { label: 'Pedidos Ativos', value: '8', trend: '3 Pendentes', color: 'orange-500', icon: 'receipt_long' },
                    { label: 'Ticket Médio', value: 'R$ 45,00', trend: '+2%', color: 'blue-500', icon: 'shopping_bag' },
                    { label: 'Avaliação', value: '4.8', trend: 'Excelente', color: 'purple-500', icon: 'star' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-800 p-5 rounded-[28px] border border-slate-100 dark:border-white/5 shadow-sm group hover:scale-[1.02] transition-transform">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-3 rounded-2xl bg-${stat.color}/10 text-${stat.color}`}>
                                <MaterialIcon name={stat.icon} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${stat.trend.includes('+') ? 'bg-primary/10 text-primary' : stat.color === 'orange-500' ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-100 text-slate-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{stat.label}</p>
                        <p className="text-2xl font-black italic text-slate-900 dark:text-white mt-1 group-hover:text-primary transition-colors">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Sales Chart Area */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-800 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Desempenho Semanal</h3>
                        <select className="bg-slate-50 dark:bg-zinc-900 border-none text-xs font-black uppercase tracking-widest rounded-xl px-3 py-2 outline-none cursor-pointer">
                            <option>Esta Semana</option>
                            <option>Semana Passada</option>
                        </select>
                    </div>

                    {/* Mock Chart Visual */}
                    <div className="h-64 flex items-end justify-between gap-3 px-2">
                        {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
                            <div key={i} className="w-full flex flex-col justify-end gap-2 group cursor-pointer">
                                <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-t-xl relative overflow-hidden transition-all hover:bg-primary/20" style={{ height: `${h}%` }}>
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary h-1.5 group-hover:h-full transition-all duration-500 ease-out opacity-20"></div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-xl" style={{ height: `${h * 0.4}%` }}></div>
                                </div>
                                <span className="text-[10px] font-black uppercase text-center text-slate-400 group-hover:text-primary">
                                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Orders / Activity */}
                <div className="bg-white dark:bg-zinc-800 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col">
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6">Pedidos Recentes</h3>

                    <div className="flex-1 space-y-4">
                        {[
                            { id: '#1234', items: '2x Dipirona ...', status: 'Novo Pedido', time: '2 min', color: 'primary' },
                            { id: '#1233', items: '1x Shampoo ...', status: 'Em Preparo', time: '15 min', color: 'blue-500' },
                            { id: '#1232', items: '3x Vitamina C ...', status: 'Aguardando', time: '32 min', color: 'orange-500' },
                            { id: '#1231', items: '1x Protetor ...', status: 'Concluído', time: '1h', color: 'green-500' },
                        ].map((order, i) => (
                            <div key={i} className="flex gap-4 p-3 hover:bg-slate-50 dark:hover:bg-zinc-900/50 rounded-2xl transition-colors cursor-pointer group">
                                <div className={`size-12 rounded-2xl bg-${order.color}/10 text-${order.color} flex items-center justify-center shrink-0 font-black text-xs shadow-sm border border-${order.color}/20 group-hover:scale-110 transition-transform`}>
                                    {order.time}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                        <h4 className="font-black italic text-slate-900 dark:text-white">{order.id}</h4>
                                        <span className={`text-[9px] font-black uppercase tracking-widest text-${order.color}`}>{order.status}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 font-medium">{order.items}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="mt-6 w-full py-4 rounded-xl bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
                        Ver Todos os Pedidos
                    </button>
                </div>
            </div>
        </MerchantLayout>
    );
};

export default MerchantDashboard;
