import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const Notifications = () => {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState<'Todas' | 'Promoções' | 'Pedidos' | 'Saúde'>('Todas');

    const filters = [
        { id: 'Todas', label: 'Todas', icon: 'notifications' },
        { id: 'Promoções', label: 'Promoções', icon: 'local_offer' },
        { id: 'Pedidos', label: 'Pedidos', icon: 'package_2' },
        { id: 'Saúde', label: 'Saúde', icon: 'favorite' }
    ];

    return (
        <div className="flex flex-col min-h-screen w-full max-w-[480px] mx-auto bg-background-light dark:bg-background-dark shadow-2xl relative font-display text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md pt-4 pb-4 px-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        <MaterialIcon name="arrow_back_ios" className="text-slate-900 dark:text-white" />
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Notificações</h1>
                    </button>
                    <button className="text-primary text-sm font-semibold hover:opacity-80 transition-opacity">
                        Marcar todas
                    </button>
                </div>
            </header>

            {/* Filters (Chips) */}
            <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
                {filters.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id as any)}
                        className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 transition-all ${activeFilter === filter.id ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-[#232f48]'}`}
                    >
                        <MaterialIcon
                            name={filter.icon}
                            className={`text-[18px] ${activeFilter === filter.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}
                        />
                        <p className={`text-sm font-medium ${activeFilter === filter.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{filter.label}</p>
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <main className="flex-1 px-4 space-y-1 pb-24">
                {/* Category Label */}
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-4 mb-2 ml-1">Novas</p>

                {/* Notification Item 1 - Promoções */}
                {(activeFilter === 'Todas' || activeFilter === 'Promoções') && (
                    <div className="flex items-start gap-4 bg-white dark:bg-[#1a2333] p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm relative group hover:bg-slate-50 dark:hover:bg-[#1a2333]/80 transition-colors cursor-pointer">
                        <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <div className="text-white flex items-center justify-center rounded-lg bg-orange-500/20 text-orange-500 shrink-0 size-12">
                            <MaterialIcon name="local_offer" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div className="flex flex-col flex-1 pr-4">
                            <div className="flex justify-between items-start">
                                <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight">Cupom de 20% disponível!</p>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-snug">Aproveite o desconto em toda a linha de dermocosméticos até meia-noite.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">Há 5 min</p>
                        </div>
                    </div>
                )}

                {/* Notification Item 2 - Pedidos */}
                {(activeFilter === 'Todas' || activeFilter === 'Pedidos') && (
                    <div className="flex items-start gap-4 bg-white dark:bg-[#1a2333] p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm relative hover:bg-slate-50 dark:hover:bg-[#1a2333]/80 transition-colors cursor-pointer">
                        <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <div className="text-white flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 shrink-0 size-12">
                            <MaterialIcon name="package_2" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div className="flex flex-col flex-1 pr-4">
                            <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight">Pedido em rota de entrega</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-snug">O entregador João está a caminho do seu endereço com o seu pedido #4492.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">Há 15 min</p>
                        </div>
                    </div>
                )}

                {/* Category Label */}
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-8 mb-2 ml-1">Anteriores</p>

                {/* Notification Item 3 - Saúde */}
                {(activeFilter === 'Todas' || activeFilter === 'Saúde') && (
                    <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-[#1a2333]/40 p-4 rounded-xl border border-transparent dark:border-slate-800/30 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="text-white flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0 size-12">
                            <MaterialIcon name="alarm" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div className="flex flex-col flex-1">
                            <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight">Hora do seu remédio</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-snug">Não esqueça de tomar o seu Multivitamínico A-Z agora.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">Há 1h</p>
                        </div>
                    </div>
                )}

                {/* Notification Item 4 - Saúde */}
                {(activeFilter === 'Todas' || activeFilter === 'Saúde') && (
                    <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-[#1a2333]/40 p-4 rounded-xl border border-transparent dark:border-slate-800/30 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="text-white flex items-center justify-center rounded-lg bg-rose-500/20 text-rose-500 shrink-0 size-12">
                            <MaterialIcon name="favorite" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div className="flex flex-col flex-1">
                            <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight">Dica de Saúde</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-snug">Mantenha-se hidratado! Beber água ajuda na absorção dos seus suplementos.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">Há 3h</p>
                        </div>
                    </div>
                )}

                {/* Notification Item 5 - Pedidos */}
                {(activeFilter === 'Todas' || activeFilter === 'Pedidos') && (
                    <div className="flex items-start gap-4 bg-slate-50/50 dark:bg-[#1a2333]/40 p-4 rounded-xl border border-transparent dark:border-slate-800/30 opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="text-white flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 shrink-0 size-12">
                            <MaterialIcon name="check_circle" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div className="flex flex-col flex-1">
                            <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight">Pagamento aprovado</p>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-snug">Recebemos a confirmação do seu pagamento para o pedido #4492.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">Ontem</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Navigation Bar (iOS Style) - Simulated specific to page as requested, though App.tsx has global nav */}
            <nav className="fixed bottom-0 w-full max-w-[480px] bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-50">
                <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                    <MaterialIcon name="home" />
                    <span className="text-[10px] font-medium">Início</span>
                </Link>
                <Link to="/pharmacies" className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                    <MaterialIcon name="search" />
                    <span className="text-[10px] font-medium">Buscar</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-primary">
                    <div className="relative">
                        <MaterialIcon name="notifications" style={{ fontVariationSettings: "'FILL' 1" }} />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background-dark"></span>
                        </span>
                    </div>
                    <span className="text-[10px] font-bold">Alertas</span>
                </button>
                <Link to="/cart" className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                    <MaterialIcon name="shopping_cart" />
                    <span className="text-[10px] font-medium">Carrinho</span>
                </Link>
                <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                    <MaterialIcon name="person" />
                    <span className="text-[10px] font-medium">Perfil</span>
                </Link>
            </nav>

            {/* Home Indicator (iOS) */}
            <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full pointer-events-none z-[60]"></div>
        </div>
    );
};

export default Notifications;
