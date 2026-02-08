import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';
import { BottomNav } from '../../components/layout/BottomNav';

export const PharmacyList = ({ pharmacies, session }: { pharmacies: any[], session: any }) => {
    return (
        <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-24">
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <MaterialIcon name="location_on" className="text-[#0d1b13] dark:text-white" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Entregar em</span>
                            <span className="text-sm font-semibold text-[#0d1b13] dark:text-white">Localização Atual</span>
                        </div>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-sm">
                        <MaterialIcon name="person" className="text-[#0d1b13] dark:text-white" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0d1b13] dark:text-white mb-4">Farmácias</h1>
                <div className="pb-2">
                    <label className="flex flex-col min-w-40 h-12 w-full">
                        <div className="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
                            <div className="text-[#4c9a6c] flex border-none bg-white dark:bg-zinc-800 items-center justify-center pl-4 rounded-l-xl">
                                <MaterialIcon name="search" />
                            </div>
                            <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-[#0d1b13] dark:text-white focus:outline-0 focus:ring-0 border-none bg-white dark:bg-zinc-800 placeholder:text-gray-400 px-4 pl-2 text-base font-normal leading-normal" placeholder="Buscar farmácia ou medicamento" />
                        </div>
                    </label>
                </div>
                <div className="flex gap-2 py-2 overflow-x-auto hide-scrollbar">
                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary text-[#0d1b13] px-4 shadow-sm">
                        <p className="text-sm font-semibold">Distância</p>
                        <MaterialIcon name="keyboard_arrow_down" className="text-[18px]" />
                    </button>
                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-zinc-800 text-[#0d1b13] dark:text-white px-4 border border-gray-100 dark:border-zinc-700 shadow-sm font-medium text-sm">
                        Avaliação <MaterialIcon name="star" className="text-[18px]" />
                    </button>
                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-zinc-800 text-[#0d1b13] dark:text-white px-4 border border-gray-100 dark:border-zinc-700 shadow-sm font-medium text-sm">
                        Entrega Grátis
                    </button>
                </div>
            </header>

            <main className="flex-1 px-4 py-2 space-y-4">
                {pharmacies.length === 0 ? (
                    <div className="text-center py-20 opacity-50 font-bold italic">Nenhuma farmácia encontrada</div>
                ) : (
                    pharmacies.map((pharma, i) => {
                        const isOpen = pharma.is_open || pharma.auto_open_status;
                        return (
                            <div key={i} className={`group flex items-stretch justify-between gap-4 rounded-xl p-4 transition-all ${!isOpen
                                ? 'bg-slate-50/50 grayscale opacity-60 border-slate-100 dark:border-zinc-800'
                                : 'bg-white dark:bg-zinc-900 shadow-sm border border-gray-50 dark:border-zinc-800'
                                }`}>
                                <div className="flex flex-[2_2_0px] flex-col justify-between gap-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                            <MaterialIcon name="star" className="text-orange-400 text-[16px]" fill />
                                            <p className="text-[#0d1b13] dark:text-white text-sm font-bold">{pharma.rating || '0.0'}</p>
                                            <span className="text-gray-400 text-xs font-normal">• 100+ avaliações</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight">{pharma.name}</p>
                                            {pharma.isNew && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">NOVO</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                                            <MaterialIcon name="schedule" className="text-[16px]" />
                                            <span>20-40 min</span>
                                            <span>•</span>
                                            <span>{pharma.distance === Infinity ? 'Distância N/A' : `${pharma.distance ? pharma.distance.toFixed(1) : ''} km`}</span>
                                        </div>
                                        <div className="mt-1 flex gap-2 items-center flex-wrap">
                                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-primary">Entrega Grátis</span>

                                            {(() => {
                                                if (!pharma.is_open && !pharma.auto_open_status) return <span className="text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">Fechado</span>;

                                                if (pharma.auto_open_status && Array.isArray(pharma.opening_hours) && pharma.opening_hours.length > 0) {
                                                    const now = new Date();
                                                    const currentDay = now.getDay();
                                                    const currentTime = now.getHours() * 60 + now.getMinutes();
                                                    const todayRule = pharma.opening_hours.find((h: any) => h.day === currentDay);

                                                    if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
                                                        const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
                                                        const [hClose, mClose] = todayRule.close.split(':').map(Number);
                                                        const openTime = hOpen * 60 + mOpen;
                                                        const closeTime = hClose * 60 + mClose;

                                                        if (currentTime >= openTime && currentTime < closeTime) {
                                                            const diff = closeTime - currentTime;
                                                            if (diff <= 60) {
                                                                return <span className="text-[10px] font-black uppercase text-white bg-orange-500 px-2 py-0.5 rounded-md animate-pulse shadow-sm">Fecha em {diff} min</span>;
                                                            }
                                                            return null;
                                                        }

                                                        if (currentTime < openTime) {
                                                            return <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">Abre às {todayRule.open}</span>;
                                                        }
                                                    }

                                                    for (let i = 1; i <= 7; i++) {
                                                        const nextDay = (currentDay + i) % 7;
                                                        const nextRule = pharma.opening_hours.find((h: any) => h.day === nextDay);
                                                        if (nextRule && !nextRule.closed) {
                                                            const label = i === 1 ? 'Amanhã' : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][nextDay];
                                                            return <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md">Abre {label} às {nextRule.open}</span>;
                                                        }
                                                    }
                                                }

                                                return pharma.is_open
                                                    ? null
                                                    : <span className="text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">Fechado</span>;
                                            })()}
                                        </div>
                                    </div>
                                    <Link to={`/pharmacy/${pharma.id}`} className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-[#0d1b13] text-sm font-bold leading-normal w-fit transition-transform active:scale-95">
                                        Ver produtos
                                    </Link>
                                </div>
                                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 dark:bg-zinc-800 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-zinc-700">
                                    {pharma.logo_url ? (
                                        <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="storefront" className="text-4xl text-primary/20" />
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
            <BottomNav session={session} />
        </div>
    );
};
