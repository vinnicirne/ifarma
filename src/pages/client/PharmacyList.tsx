import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';
import { NavigationDrawer } from '../../components/layout/NavigationDrawer';

export const PharmacyList = ({ pharmacies, session }: { pharmacies: any[], session: any }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col bg-background-light dark:bg-background-dark overflow-x-hidden shadow-2xl pb-10">
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-white/5 text-slate-800 dark:text-white shadow-sm hover:scale-105 active:scale-95 transition-all"
                        >
                            <MaterialIcon name="menu" className="text-2xl" />
                        </button>
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

            <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} session={session} />

            <main className="flex-1 px-4 py-2 space-y-4">
                {pharmacies.length === 0 ? (
                    <div className="text-center py-20 opacity-50 font-bold italic">Nenhuma farmácia encontrada</div>
                ) : (
                    pharmacies.map((pharma, i) => {
                        const isOpen = (() => {
                            if (pharma.is_open) return true;
                            if (!pharma.auto_open_status) return false;
                            if (Array.isArray(pharma.opening_hours) && pharma.opening_hours.length > 0) {
                                const now = new Date();
                                const currentDay = now.getDay();
                                const currentTime = now.getHours() * 60 + now.getMinutes();
                                const todayRule = pharma.opening_hours.find((h: any) => h.day === currentDay);
                                if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
                                    const [hOpen, mOpen] = todayRule.open.split(':').map(Number);
                                    const [hClose, mClose] = todayRule.close.split(':').map(Number);
                                    return currentTime >= (hOpen * 60 + mOpen) && currentTime < (hClose * 60 + mClose);
                                }
                            }
                            return false;
                        })();

                        return (
                            <Link to={`/pharmacy/${pharma.id}`} key={i} className={`group flex items-center justify-between gap-3 rounded-2xl p-3 mb-2 border transition-all ${!isOpen
                                ? 'bg-transparent grayscale opacity-60 border-slate-100 dark:border-white/5'
                                : 'bg-transparent border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-primary/20'
                                }`}>
                                <div className="size-16 sm:size-20 bg-white dark:bg-white/5 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5 p-1">
                                    {pharma.logo_url ? (
                                        <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/5 text-primary flex items-center justify-center font-bold text-lg rounded-lg">{pharma.name.charAt(0)}</div>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-[#0d1b13] dark:text-white text-base font-bold leading-tight truncate">{pharma.name}</h3>
                                        {pharma.isNew && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest shrink-0">NOVO</span>}
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                        <div className="flex items-center gap-1 text-orange-400">
                                            <MaterialIcon name="star" className="text-[12px]" fill />
                                            <span>{pharma.rating || '0.0'}</span>
                                        </div>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><MaterialIcon name="schedule" className="text-[12px]" /> 20-30 min</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <MaterialIcon name="location_on" className="text-[12px]" />
                                            {pharma.distance === Infinity ? 'N/A' : `${pharma.distance ? pharma.distance.toFixed(1) : ''} km`}
                                        </span>
                                    </div>

                                    <div className="mt-1.5 flex gap-2 items-center flex-wrap">
                                        {/* Status Tags */}
                                        {(() => {
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
                                                            return <span className="text-[9px] font-black uppercase text-white bg-orange-500 px-1.5 py-0.5 rounded-md animate-pulse shadow-sm">Fecha em {diff} min</span>;
                                                        }
                                                        return <span className="text-[9px] font-black uppercase text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-md">Aberto</span>;
                                                    }

                                                    if (currentTime < openTime) {
                                                        return <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">Abre às {todayRule.open}</span>;
                                                    }
                                                }
                                                // Handle closed/opens next day
                                                return <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-md">Fechado</span>;
                                            }
                                            return null;
                                        })()}
                                        <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-green-700 dark:text-primary tracking-wide">Entrega Grátis</span>
                                    </div>
                                </div>

                                <div className="shrink-0 pl-1">
                                    <button className="size-8 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
                                        <MaterialIcon name="chevron_right" className="text-xl" />
                                    </button>
                                </div>
                            </Link>
                        );
                    })
                )}
            </main>
        </div >
    );
};
