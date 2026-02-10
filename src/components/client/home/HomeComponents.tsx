import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { MaterialIcon } from '../../Shared';
import { isPharmacyOpen } from '../../../lib/pharmacyUtils';

export const PromoCarousel = () => {
    const [promotions, setPromotions] = useState<any[]>([]);

    useEffect(() => {
        const fetchPromos = async () => {
            const { data } = await supabase
                .from('promotions')
                .select('*')
                .eq('active', true)
                .gte('end_date', new Date().toISOString().split('T')[0]); // Only future/present promos

            if (data && data.length > 0) {
                setPromotions(data);
            } else {
                setPromotions([
                    { id: 'mk1', title: 'Ofertas da Semana', subtitle: 'Até 50% OFF', color1: '#1392ec', color2: '#0056b3' },
                    { id: 'mk2', title: 'Saúde em Dia', subtitle: 'Vitaminas & Suplementos', color1: '#f59e0b', color2: '#d97706' }
                ]);
            }
        };
        fetchPromos();
    }, []);

    return (
        <div className="flex overflow-x-auto hide-scrollbar">
            <div className="flex items-stretch p-4 gap-3">
                {promotions.map((promo: any) => (
                    <div key={promo.id} className="flex h-full flex-1 flex-col gap-3 rounded-xl min-w-[280px]">
                        <div className="w-full bg-center bg-no-repeat aspect-[21/9] bg-cover rounded-xl flex flex-col relative overflow-hidden"
                            style={{
                                backgroundImage: promo.image_url ? `url(${promo.image_url})` : undefined,
                                background: promo.image_url ? undefined : `linear-gradient(135deg, ${promo.color1 || '#1392ec'} 0%, ${promo.color2 || '#0056b3'} 100%)`
                            }}>
                            <div className="p-4 flex flex-col justify-center h-full text-white bg-black/20 backdrop-blur-[1px]">
                                <p className="text-xs font-bold uppercase tracking-widest opacity-90">{promo.name || promo.title}</p>
                                <p className="text-xl font-bold leading-tight">{promo.subtitle || 'Confira as novidades'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CategoryGrid = () => (
    <>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Categorias</h3>
            <button className="text-primary text-sm font-semibold">Ver todas</button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
            {[
                { name: 'Dor e Febre', icon: 'pill' },
                { name: 'Higiene', icon: 'clean_hands' },
                { name: 'Infantil', icon: 'child_care' },
                { name: 'Suplementos', icon: 'fitness_center' }
            ].map(cat => (
                <div key={cat.name} className="flex flex-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 items-center shadow-sm">
                    <div className="text-primary bg-primary/10 p-2 rounded-lg">
                        <MaterialIcon name={cat.icon} />
                    </div>
                    <h2 className="text-[#0d161b] dark:text-white text-sm font-bold leading-tight">{cat.name}</h2>
                </div>
            ))}
        </div>
    </>
);

export const FeaturedPharmacies = ({ pharmacies }: { pharmacies: any[] }) => (
    <>
        <div className="px-4 pt-6 pb-2">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Farmácias em Destaque</h3>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar">
            <div className="flex items-stretch p-4 gap-4">
                {pharmacies.filter(p => p.is_featured).map(pharma => {
                    const isOpen = isPharmacyOpen(pharma);

                    return (
                        <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className={`min-w-[160px] flex flex-col gap-2 transition-all ${!isOpen ? 'grayscale' : ''}`}>
                            <div className="w-full aspect-square rounded-2xl bg-slate-100 flex items-center justify-center p-4 border border-slate-100 dark:border-slate-800 dark:bg-slate-900 overflow-hidden relative shadow-sm">
                                {pharma.logo_url ? (
                                    <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-black text-2xl italic`}>
                                        {pharma.name.charAt(0)}
                                    </div>
                                )}
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
                                                    return <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-lg">FECHA EM {diff} MIN</div>;
                                                }
                                            }
                                        }
                                    }
                                    return null;
                                })()}
                                {pharma.isNew && (
                                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm">NOVO</div>
                                )}
                            </div>
                            <div>
                                <p className="text-[#0d161b] dark:text-white text-sm font-bold truncate">{pharma.name}</p>
                                <p className="text-slate-500 text-xs flex items-center gap-1">
                                    <MaterialIcon name="star" className="text-xs text-yellow-500" fill /> {pharma.rating || '0.0'} • 15-25 min
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    </>
);

export const SpecialHighlights = ({ pharmacies }: { pharmacies: any[] }) => (
    <>
        <div className="px-5 pt-8 pb-3 flex items-center gap-2">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
                <MaterialIcon name="stars" className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
                <h3 className="text-[#0d161b] dark:text-white text-lg font-black italic tracking-tight leading-none">
                    Seleção Especial
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Farmácias em Alta</p>
            </div>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar pb-4 pl-4">
            <div className="flex items-stretch gap-3 pr-4">
                {pharmacies.filter(p => !p.is_featured).map(pharma => {
                    const isOpen = isPharmacyOpen(pharma);

                    return (
                        <Link
                            to={`/pharmacy/${pharma.id}`}
                            key={pharma.id}
                            className={`min-w-[240px] bg-white dark:bg-[#1e293b] p-3 rounded-[24px] border-b-4 border-yellow-400 shadow-lg shadow-slate-200/50 dark:shadow-black/40 flex items-center gap-3 transition-transform active:scale-95 ${!isOpen ? 'grayscale opacity-80' : ''}`}
                        >
                            {/* Logo Avatar */}
                            <div className="size-14 rounded-2xl bg-slate-50 dark:bg-black/20 shrink-0 border border-slate-100 dark:border-white/5 flex items-center justify-center p-1 overflow-hidden">
                                {pharma.logo_url ? (
                                    <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <span className="text-xl font-black text-slate-300">{pharma.name.charAt(0)}</span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate leading-tight mb-1">{pharma.name}</h4>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-md">
                                        <MaterialIcon name="star" className="text-[10px] text-yellow-500" fill />
                                        <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400">{pharma.rating || '4.8'}</span>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400">15-25 min</span>
                                </div>
                            </div>

                            {/* Arrow Action */}
                            <div className="size-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                <MaterialIcon name="arrow_forward" className="text-sm" />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    </>
);

export const NearbyPharmacies = ({ pharmacies }: { pharmacies: any[] }) => (
    <>
        <div className="px-4 pt-6 pb-2 flex justify-between items-center">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Farmácias Próximas</h3>
            <Link to="/pharmacies" className="text-primary text-sm font-bold">Ver tudo</Link>
        </div>
        <div className="px-4 flex flex-col gap-4 pb-20">
            {pharmacies.map(pharma => {
                const isOpen = isPharmacyOpen(pharma);

                return (
                    <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className={`flex gap-3 p-3 rounded-2xl border transition-all ${!isOpen
                        ? 'bg-transparent grayscale opacity-60 border-slate-100 dark:border-white/5'
                        : 'bg-transparent border-slate-100 dark:border-white/5 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-white/5'
                        } items-center`}>
                        <div className="size-12 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden p-1">
                            {pharma.logo_url ? (
                                <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-lg" />
                            ) : (
                                <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg rounded-lg">{pharma.name.charAt(0)}</div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <h4 className="text-base font-bold text-[#0d161b] dark:text-white flex items-center gap-2">
                                    {pharma.name}
                                    {pharma.isNew && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">NOVO</span>}
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
                                                        return <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest animate-pulse shadow-sm">Fecha em {diff} min</span>;
                                                    }
                                                    return null;
                                                }

                                                if (currentTime < openTime) {
                                                    return <span className="text-[8px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">Abre às {todayRule.open}</span>;
                                                }
                                            }

                                            for (let i = 1; i <= 7; i++) {
                                                const nextDay = (currentDay + i) % 7;
                                                const nextRule = pharma.opening_hours.find((h: any) => h.day === nextDay);
                                                if (nextRule && !nextRule.closed) {
                                                    const label = i === 1 ? 'Amanhã' : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][nextDay];
                                                    return <span className="text-[8px] bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">Abre {label}</span>;
                                                }
                                            }
                                        }
                                        return null;
                                    })()}
                                </h4>
                                <div className="flex items-center gap-1 text-xs font-bold bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                    <MaterialIcon name="star" className="text-[14px]" fill /> {pharma.rating || '0.0'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><MaterialIcon name="schedule" className="text-[12px]" /> 20-30 min</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <MaterialIcon name="location_on" className="text-[12px]" />
                                    {pharma.distance === Infinity ? 'N/A' : `${pharma.distance.toFixed(1)} km`}
                                </span>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    </>
);
