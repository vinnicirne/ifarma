import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { MaterialIcon } from '../../Shared';
import { isPharmacyOpen } from '../../../lib/pharmacyUtils';

// --- PROMO CAROUSEL (BANNERS) ---
export const PromoCarousel = ({ config }: { config?: any }) => {
    const [promotions, setPromotions] = useState<any[]>([]);

    useEffect(() => {
        const loadBanners = async () => {
            // 1. Prioridade: Imagens configuradas no Admin
            if (config?.images && config.images.length > 0) {
                setPromotions(config.images.map((url: string, idx: number) => ({
                    id: `cfg-${idx}`,
                    image_url: url
                })));
                return;
            }

            // 2. Fallback: Buscar da tabela 'promotions' (Legado)
            const { data } = await supabase
                .from('promotions')
                .select('*')
                .eq('active', true)
                .gte('end_date', new Date().toISOString().split('T')[0]);

            if (data && data.length > 0) {
                setPromotions(data);
            } else {
                // 3. Fallback Final: Mock
                setPromotions([
                    { id: 'mk1', title: 'Ofertas da Semana', subtitle: 'Até 50% OFF', color1: '#1392ec', color2: '#0056b3' },
                    { id: 'mk2', title: 'Saúde em Dia', subtitle: 'Vitaminas & Suplementos', color1: '#f59e0b', color2: '#d97706' }
                ]);
            }
        };
        loadBanners();
    }, [config]);

    return (
        <div className="flex overflow-x-auto hide-scrollbar">
            <div className="flex items-stretch p-4 gap-3">
                {promotions.map((promo: any) => (
                    <div key={promo.id} className="flex h-full flex-1 flex-col gap-3 rounded-xl min-w-[320px] snap-center">
                        <div className="w-full bg-center bg-no-repeat aspect-[21/9] bg-cover rounded-xl flex flex-col relative overflow-hidden shadow-lg shadow-black/10 transition-transform active:scale-95"
                            style={{
                                backgroundImage: promo.image_url ? `url(${promo.image_url})` : undefined,
                                background: promo.image_url ? undefined : `linear-gradient(135deg, ${promo.color1 || '#1392ec'} 0%, ${promo.color2 || '#0056b3'} 100%)`
                            }}>
                            {!promo.image_url && (
                                <div className="p-4 flex flex-col justify-center h-full text-white bg-black/10 backdrop-blur-[1px]">
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-90">{promo.name || promo.title}</p>
                                    <p className="text-xl font-bold leading-tight">{promo.subtitle || 'Confira as novidades'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CATEGORIES ---
export const CategoryGrid = ({ config, title }: { config?: any, title?: string }) => (
    <>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{title || 'Categorias'}</h3>
            <button className="text-primary text-sm font-semibold">Ver todas</button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 pt-0">
            {[
                { name: 'Dor e Febre', icon: 'pill' },
                { name: 'Higiene', icon: 'clean_hands' },
                { name: 'Infantil', icon: 'child_care' },
                { name: 'Suplementos', icon: 'fitness_center' },
                ...(config?.limit && config.limit > 4 ? [
                    { name: 'Dermocosméticos', icon: 'face' },
                    { name: 'Primeiros Socorros', icon: 'medical_services' }
                ] : [])
            ].slice(0, config?.limit || 4).map(cat => (
                <div key={cat.name} className="flex flex-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 items-center shadow-sm active:scale-95 transition-transform">
                    <div className="text-primary bg-primary/10 p-2 rounded-lg">
                        <MaterialIcon name={cat.icon} />
                    </div>
                    <h2 className="text-[#0d161b] dark:text-white text-sm font-bold leading-tight">{cat.name}</h2>
                </div>
            ))}
        </div>
    </>
);

// --- FEATURED PHARMACIES ---
export const FeaturedPharmacies = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => (
    <>
        <div className="px-4 pt-6 pb-2">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{title || 'Farmácias em Destaque'}</h3>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar">
            <div className="flex items-stretch p-4 pt-0 gap-4">
                {pharmacies.filter(p => p.is_featured).slice(0, config?.limit || 10).map(pharma => {
                    const isOpen = isPharmacyOpen(pharma);

                    return (
                        <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className={`min-w-[140px] w-[140px] flex flex-col gap-2 transition-all active:scale-95 ${!isOpen ? 'grayscale opacity-70' : ''}`}>
                            <div className="w-full aspect-square rounded-2xl bg-white dark:bg-[#1e293b] flex items-center justify-center p-2 border border-slate-100 dark:border-white/5 overflow-hidden relative shadow-sm">
                                {pharma.logo_url ? (
                                    <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain" />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary font-black text-4xl italic`}>
                                        {pharma.name.charAt(0)}
                                    </div>
                                )}

                                {pharma.isNew && (
                                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest shadow-sm">NOVO</div>
                                )}
                            </div>
                            <div>
                                <p className="text-[#0d161b] dark:text-white text-sm font-bold truncate">{pharma.name}</p>
                                <p className="text-slate-500 text-xs flex items-center gap-1 font-medium">
                                    <MaterialIcon name="star" className="text-[10px] text-yellow-500" fill /> {pharma.rating || '5.0'} • 20 min
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    </>
);

// --- SPECIAL HIGHLIGHTS ---
export const SpecialHighlights = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => (
    <>
        <div className="px-5 pt-8 pb-3 flex items-center gap-2">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
                <MaterialIcon name="stars" className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
                <h3 className="text-[#0d161b] dark:text-white text-lg font-black italic tracking-tight leading-none">
                    {title || 'Seleção Especial'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Farmácias em Alta</p>
            </div>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar pb-4 pl-4">
            <div className="flex items-stretch gap-3 pr-4">
                {pharmacies.filter(p => !p.is_featured).slice(0, config?.limit || 10).map(pharma => {
                    const isOpen = isPharmacyOpen(pharma);

                    return (
                        <Link
                            to={`/pharmacy/${pharma.id}`}
                            key={pharma.id}
                            className={`min-w-[260px] bg-white dark:bg-[#1e293b] p-3 rounded-[24px] border-b-4 border-yellow-400 shadow-lg shadow-slate-200/50 dark:shadow-black/20 flex items-center gap-3 transition-transform active:scale-95 ${!isOpen ? 'grayscale opacity-80' : ''}`}
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

// --- NEARBY PHARMACIES ---
export const NearbyPharmacies = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => (
    <>
        <div className="px-4 pt-6 pb-2 flex justify-between items-center">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{title || 'Farmácias Próximas'}</h3>
            <Link to="/pharmacies" className="text-primary text-sm font-bold opacity-80 hover:opacity-100">Ver tudo</Link>
        </div>
        <div className="px-4 flex flex-col gap-3 pb-24">
            {pharmacies.slice(0, config?.limit || 20).map(pharma => {
                const isOpen = isPharmacyOpen(pharma);

                return (
                    <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className={`flex gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98] ${!isOpen
                        ? 'bg-transparent grayscale opacity-60 border-slate-100 dark:border-white/5'
                        : 'bg-white dark:bg-[#1e293b] border-slate-100 dark:border-white/5 hover:border-primary/30 shadow-sm'
                        } items-center`}>
                        <div className="size-16 rounded-xl bg-slate-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden p-1">
                            {pharma.logo_url ? (
                                <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-lg" />
                            ) : (
                                <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg rounded-lg">{pharma.name.charAt(0)}</div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-0.5">
                            <div className="flex justify-between items-start">
                                <h4 className="text-base font-bold text-[#0d161b] dark:text-white flex items-center gap-2 leading-none">
                                    {pharma.name}
                                    {pharma.isNew && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">NOVO</span>}
                                </h4>
                                <div className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                    <MaterialIcon name="star" className="text-[10px] text-yellow-500" fill /> {pharma.rating || '5.0'}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">
                                <span className="flex items-center gap-1"><MaterialIcon name="schedule" className="text-[12px]" /> 20-30 min</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <MaterialIcon name="location_on" className="text-[12px]" />
                                    {pharma.distance === Infinity ? 'N/A' : `${pharma.distance.toFixed(1)} km`}
                                </span>
                            </div>

                            {/* Status Tag */}
                            {!isOpen && (
                                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1">Fechado Agora</span>
                            )}
                        </div>
                    </Link>
                );
            })}
        </div>
    </>
);
