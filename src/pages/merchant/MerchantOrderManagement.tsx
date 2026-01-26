import { useState } from 'react';
import MerchantLayout from './MerchantLayout';

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const MerchantOrderManagement = () => {
    const [orders, setOrders] = useState([
        { id: '#8921', client: 'Ana Silva', items: '2x Dipirona 500mg, 1x Vitamina C', total: 'R$ 45,90', status: 'Pendente', time: '2 min', address: 'Rua das Flores, 123' },
        { id: '#8920', client: 'Carlos Souza', items: '1x Shampoo Clear Men', total: 'R$ 22,90', status: 'Em Preparo', time: '15 min', address: 'Av. Brasil, 500' },
        { id: '#8919', client: 'Mariana Lima', items: '1x Protetor Solar', total: 'R$ 89,90', status: 'Aguardando', time: '30 min', address: 'Retirada na Loja' },
        { id: '#8918', client: 'Roberto Dias', items: '3x Dorflex', total: 'R$ 18,90', status: 'Em Rota', time: '45 min', address: 'Rua A, 10' },
    ]);

    const columns = [
        { id: 'Pendente', label: 'Novos', color: 'blue-500', icon: 'notifications_active' },
        { id: 'Em Preparo', label: 'Em Preparo', color: 'orange-500', icon: 'inventory' },
        { id: 'Aguardando', label: 'Pronto/Aguardando', color: 'yellow-500', icon: 'timer' },
        { id: 'Em Rota', label: 'Saiu p/ Entrega', color: 'purple-500', icon: 'sports_motorsports' },
    ];

    return (
        <MerchantLayout activeTab="orders" title="Pedidos">
            <div className="flex flex-col h-[calc(100vh-140px)]">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Gestão de Pedidos</h1>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Arrastia os cards para atualizar o status.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="h-10 px-4 bg-white dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-white/5 font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm">
                            Histórico
                        </button>
                        <button className="h-10 px-4 bg-primary text-background-dark rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                            Novo Pedido (Manual)
                        </button>
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
                                        <div key={order.id} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-sm text-slate-900 dark:text-white">{order.id}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{order.time}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight mb-1">{order.client}</h4>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mb-3">{order.items}</p>

                                            <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-black/20 p-2 rounded-lg">
                                                <MaterialIcon name="location_on" className="text-[14px] text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{order.address}</span>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-white/5">
                                                <span className="font-black text-primary">{order.total}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="size-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                                        <MaterialIcon name="visibility" className="text-lg" />
                                                    </button>
                                                    <button className="size-8 rounded-lg bg-primary text-background-dark flex items-center justify-center shadow-lg shadow-primary/20">
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
