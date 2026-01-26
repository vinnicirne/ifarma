import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyHistory = () => {
    const navigate = useNavigate();
    const [filterPeriod, setFilterPeriod] = useState('Hoje');

    // Custom theme constants
    const historyTheme = {
        '--history-primary': '#13ec6d',
        '--history-bg-dark': '#102218',
    } as React.CSSProperties;

    return (
        <div className="bg-background-light dark:bg-[#102218] text-slate-900 dark:text-white antialiased min-h-screen flex flex-col font-display transition-colors duration-200" style={historyTheme}>
            {/* TopAppBar */}
            <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-[#102218] p-4 pb-2 justify-between border-b border-gray-200 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                    <MaterialIcon name="arrow_back_ios_new" />
                </button>
                <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Histórico de Entregas</h1>
                <div className="size-10 flex items-center justify-center">
                    <MaterialIcon name="more_horiz" className="text-gray-400" />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-20">
                {/* SegmentedButtons */}
                <div className="px-4 py-4">
                    <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-gray-200 dark:bg-white/10 p-1">
                        <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold transition-all ${filterPeriod === 'Hoje' ? 'bg-white dark:bg-[#102218] shadow-sm text-[#13ec6d]' : 'text-gray-500 dark:text-gray-400'}`}>
                            <span className="truncate">Hoje</span>
                            <input
                                checked={filterPeriod === 'Hoje'}
                                onChange={() => setFilterPeriod('Hoje')}
                                className="invisible w-0"
                                name="filter-period"
                                type="radio"
                                value="Hoje"
                            />
                        </label>
                        <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold transition-all ${filterPeriod === 'Últimos 7 dias' ? 'bg-white dark:bg-[#102218] shadow-sm text-[#13ec6d]' : 'text-gray-500 dark:text-gray-400'}`}>
                            <span className="truncate">Últimos 7 dias</span>
                            <input
                                checked={filterPeriod === 'Últimos 7 dias'}
                                onChange={() => setFilterPeriod('Últimos 7 dias')}
                                className="invisible w-0"
                                name="filter-period"
                                type="radio"
                                value="Últimos 7 dias"
                            />
                        </label>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="px-4 mb-4 flex gap-3">
                    <div className="flex-1 p-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">TOTAL HOJE</p>
                        <p className="text-2xl font-bold text-[#13ec6d]">12</p>
                    </div>
                    <div className="flex-1 p-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">DISTÂNCIA</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">42 km</p>
                    </div>
                </div>

                {/* SectionHeader */}
                <div className="flex items-center justify-between px-4 pb-2 pt-2">
                    <h3 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Entregas Concluídas</h3>
                    <span className="text-xs font-medium text-gray-500">Filtrado por: {filterPeriod}</span>
                </div>

                {/* ListItems */}
                <div className="flex flex-col gap-1">
                    {/* Item 1 */}
                    <div className="flex items-center gap-4 bg-background-light dark:bg-[#102218] px-4 min-h-[80px] py-3 justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="text-[#13ec6d] flex items-center justify-center rounded-xl bg-[#13ec6d]/10 shrink-0 size-12">
                                <MaterialIcon name="package_2" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Pedido #8842</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                                    <MaterialIcon name="schedule" className="text-[14px]" />
                                    15:45 - 24 Out
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-[#13ec6d]/20 text-[#13ec6d] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <MaterialIcon name="check_circle" className="text-[12px]" />
                                Concluído
                            </div>
                            {/* <p className="text-xs text-gray-500">R$ 12,50 fee</p> */}
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center gap-4 bg-background-light dark:bg-[#102218] px-4 min-h-[80px] py-3 justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="text-[#13ec6d] flex items-center justify-center rounded-xl bg-[#13ec6d]/10 shrink-0 size-12">
                                <MaterialIcon name="package_2" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Pedido #8840</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                                    <MaterialIcon name="schedule" className="text-[14px]" />
                                    14:20 - 24 Out
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-[#13ec6d]/20 text-[#13ec6d] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <MaterialIcon name="check_circle" className="text-[12px]" />
                                Concluído
                            </div>
                            {/* <p className="text-xs text-gray-500">R$ 10,00 fee</p> */}
                        </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center gap-4 bg-background-light dark:bg-[#102218] px-4 min-h-[80px] py-3 justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="text-[#13ec6d] flex items-center justify-center rounded-xl bg-[#13ec6d]/10 shrink-0 size-12">
                                <MaterialIcon name="package_2" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Pedido #8838</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                                    <MaterialIcon name="schedule" className="text-[14px]" />
                                    13:05 - 24 Out
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-[#13ec6d]/20 text-[#13ec6d] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <MaterialIcon name="check_circle" className="text-[12px]" />
                                Concluído
                            </div>
                            {/* <p className="text-xs text-gray-500">R$ 15,20 fee</p> */}
                        </div>
                    </div>

                    {/* Item 4 */}
                    <div className="flex items-center gap-4 bg-background-light dark:bg-[#102218] px-4 min-h-[80px] py-3 justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="text-[#13ec6d] flex items-center justify-center rounded-xl bg-[#13ec6d]/10 shrink-0 size-12">
                                <MaterialIcon name="package_2" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Pedido #8835</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                                    <MaterialIcon name="schedule" className="text-[14px]" />
                                    11:45 - 24 Out
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-[#13ec6d]/20 text-[#13ec6d] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <MaterialIcon name="check_circle" className="text-[12px]" />
                                Concluído
                            </div>
                            {/* <p className="text-xs text-gray-500">R$ 8,00 fee</p> */}
                        </div>
                    </div>

                    {/* Item 5 */}
                    <div className="flex items-center gap-4 bg-background-light dark:bg-[#102218] px-4 min-h-[80px] py-3 justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="text-[#13ec6d] flex items-center justify-center rounded-xl bg-[#13ec6d]/10 shrink-0 size-12">
                                <MaterialIcon name="package_2" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-slate-900 dark:text-white text-base font-semibold leading-normal line-clamp-1">Pedido #8832</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal flex items-center gap-1">
                                    <MaterialIcon name="schedule" className="text-[14px]" />
                                    10:15 - 24 Out
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-[#13ec6d]/20 text-[#13ec6d] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                <MaterialIcon name="check_circle" className="text-[12px]" />
                                Concluído
                            </div>
                            {/* <p className="text-xs text-gray-500">R$ 10,00 fee</p> */}
                        </div>
                    </div>
                </div>

                {/* Load More Indicator */}
                <div className="p-8 flex justify-center">
                    <button className="flex items-center gap-2 text-[#13ec6d] font-semibold text-sm hover:underline">
                        Ver mais entregas
                        <MaterialIcon name="expand_more" />
                    </button>
                </div>
            </main>

            {/* Fixed Bottom Navigation (iOS Style) */}
            <nav className="fixed bottom-0 width-full max-w-[480px] mx-auto left-0 right-0 bg-background-light/80 dark:bg-[#102218]/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 flex justify-around items-center py-2 px-6">
                <Link to="/motoboy-orders" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#13ec6d] transition-colors">
                    <MaterialIcon name="motorcycle" />
                    <span className="text-[10px] font-medium">Ativo</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-[#13ec6d]">
                    <MaterialIcon name="history" style={{ fontVariationSettings: "'FILL' 1" }} />
                    <span className="text-[10px] font-medium">Histórico</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#13ec6d] transition-colors">
                    <MaterialIcon name="account_circle" />
                    <span className="text-[10px] font-medium">Perfil</span>
                </button>
            </nav>
        </div>
    );
};

export default MotoboyHistory;
