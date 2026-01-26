import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const MotoboyOrders = () => {
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

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
                            <p className="text-xs text-slate-400 dark:text-[#92a4c9]">Motorista em serviço</p>
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
                        {/* Order Card 1 (With Alert) */}
                        <div className="flex flex-col bg-white dark:bg-[#192233] rounded-xl shadow-lg border border-gray-100 dark:border-[#324467] overflow-hidden">
                            <div className="bg-red-500/10 px-4 py-2 border-b border-red-500/20 flex items-center gap-2">
                                <MaterialIcon name="warning" className="text-red-500 text-sm" />
                                <p className="text-red-500 text-xs font-bold uppercase tracking-wider">Pedido com medicamento controlado</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pedido #8942</h2>
                                        <p className="text-slate-400 dark:text-[#92a4c9] text-sm mt-1">Pronto há 5 minutos</p>
                                    </div>
                                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">Urgente</div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <MaterialIcon name="person" className="text-slate-400 dark:text-[#92a4c9]" />
                                        <p className="text-slate-700 dark:text-gray-200 font-semibold">João da Silva Santos</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <MaterialIcon name="location_on" className="text-slate-400 dark:text-[#92a4c9]" />
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-gray-200 text-sm leading-relaxed">Rua das Flores, 123 - Apto 402</p>
                                            <p className="text-slate-400 dark:text-[#92a4c9] text-sm leading-relaxed">Centro, São Paulo - SP</p>
                                        </div>
                                    </div>
                                </div>
                                <Link to="/motoboy-delivery/8942" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <MaterialIcon name="navigation" />
                                    <span>Iniciar Entrega</span>
                                </Link>
                            </div>
                        </div>

                        {/* Order Card 2 */}
                        <div className="flex flex-col bg-white dark:bg-[#192233] rounded-xl shadow-lg border border-gray-100 dark:border-[#324467] overflow-hidden">
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pedido #8945</h2>
                                        <p className="text-slate-400 dark:text-[#92a4c9] text-sm mt-1">Pronto há 12 minutos</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <MaterialIcon name="person" className="text-slate-400 dark:text-[#92a4c9]" />
                                        <p className="text-slate-700 dark:text-gray-200 font-semibold">Maria Oliveira</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <MaterialIcon name="location_on" className="text-slate-400 dark:text-[#92a4c9]" />
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-gray-200 text-sm leading-relaxed">Av. Paulista, 1500 - Sala 12</p>
                                            <p className="text-slate-400 dark:text-[#92a4c9] text-sm leading-relaxed">Bela Vista, São Paulo - SP</p>
                                        </div>
                                    </div>
                                </div>
                                <Link to="/motoboy-delivery/8945" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <MaterialIcon name="navigation" />
                                    <span>Iniciar Entrega</span>
                                </Link>
                            </div>
                        </div>

                        {/* Order Card 3 (With Alert) */}
                        <div className="flex flex-col bg-white dark:bg-[#192233] rounded-xl shadow-lg border border-gray-100 dark:border-[#324467] overflow-hidden">
                            <div className="bg-red-500/10 px-4 py-2 border-b border-red-500/20 flex items-center gap-2">
                                <MaterialIcon name="warning" className="text-red-500 text-sm" />
                                <p className="text-red-500 text-xs font-bold uppercase tracking-wider">Pedido com medicamento controlado</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pedido #8950</h2>
                                        <p className="text-slate-400 dark:text-[#92a4c9] text-sm mt-1">Pronto agora</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <MaterialIcon name="person" className="text-slate-400 dark:text-[#92a4c9]" />
                                        <p className="text-slate-700 dark:text-gray-200 font-semibold">Carlos Eduardo Neves</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <MaterialIcon name="location_on" className="text-slate-400 dark:text-[#92a4c9]" />
                                        <div className="flex-1">
                                            <p className="text-slate-700 dark:text-gray-200 text-sm leading-relaxed">Rua Augusta, 450</p>
                                            <p className="text-slate-400 dark:text-[#92a4c9] text-sm leading-relaxed">Consolação, São Paulo - SP</p>
                                        </div>
                                    </div>
                                </div>
                                <Link to="/motoboy-delivery/8950" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <MaterialIcon name="navigation" />
                                    <span>Iniciar Entrega</span>
                                </Link>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#92a4c9]">
                        <MaterialIcon name="history" className="text-6xl mb-4 opacity-50" />
                        <p className="text-sm font-medium">Nenhum histórico recente</p>
                    </div>
                )}
            </main>

            {/* Map/Quick View Sticky Footer for iOS look */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-gray-200 dark:border-[#324467] p-4 flex justify-around items-center max-w-[480px] mx-auto z-50">
                <button className="flex flex-col items-center gap-1 text-primary">
                    <MaterialIcon name="view_list" />
                    <span className="text-[10px] font-bold">FILA</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400 dark:text-[#92a4c9] hover:text-primary transition-colors">
                    <MaterialIcon name="map" />
                    <span className="text-[10px] font-bold">MAPA</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400 dark:text-[#92a4c9] hover:text-primary transition-colors">
                    <MaterialIcon name="account_circle" />
                    <span className="text-[10px] font-bold">PERFIL</span>
                </button>
            </div>
        </div>
    );
};

export default MotoboyOrders;
