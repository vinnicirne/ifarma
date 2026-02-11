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
            try {
                const { data } = await supabase
                    .from('promotions')
                    .select('*')
                    .eq('active', true)
                    .gte('end_date', new Date().toISOString().split('T')[0]);

                if (data && data.length > 0) {
                    setPromotions(data);
                    return;
                }
            } catch (e) {
                console.warn("Error loading banners:", e);
            }

            // 3. Fallback Final: Mock (Sempre garante algo visual)
            setPromotions([
                { id: 'mk1', title: 'Ofertas da Semana', subtitle: 'Até 50% OFF', color1: '#132218', color2: '#13ec6d' },
                { id: 'mk2', title: 'Saúde em Dia', subtitle: 'Vitaminas & Suplementos', color1: '#1a2e23', color2: '#1392ec' }
            ]);
        };
        loadBanners();
    }, [config]);

    if (promotions.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto hide-scrollbar">
            <div className="flex px-4 py-2 gap-4">
                {promotions.map((promo: any) => (
                    <div key={promo.id} className="relative shrink-0 w-[85vw] max-w-[340px] aspect-[21/9] rounded-[28px] overflow-hidden shadow-2xl border border-white/5"
                        style={{
                            background: promo.image_url ? `url(${promo.image_url}) center/cover no-repeat` : `linear-gradient(135deg, ${promo.color1 || '#132218'} 0%, ${promo.color2 || '#13ec6d'} 100%)`
                        }}>
                        {!promo.image_url && (
                            <div className="absolute inset-0 flex flex-col justify-center p-6 text-white bg-black/30">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-1">{promo.name || promo.title}</p>
                                <p className="text-2xl font-black leading-tight italic">{promo.subtitle || 'Confira as novidades'}</p>
                                <div className="mt-3">
                                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">Ver Oferta</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CATEGORIES ---
export const CategoryGrid = ({ config, title }: { config?: any, title?: string }) => (
    <>
        <div className="flex items-center justify-between px-5 pt-8 pb-3">
            <h3 className="text-[#0d161b] dark:text-white text-xl font-bold italic tracking-tight leading-none">{title || 'Categorias'}</h3>
            <button className="text-primary text-xs font-black uppercase tracking-widest">Ver todas</button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 pt-0">
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
                <div key={cat.name} className="flex flex-1 gap-3 rounded-3xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a2e23] p-5 items-center shadow-lg shadow-black/5 active:scale-95 transition-transform">
                    <div className="text-primary bg-primary/10 size-10 flex items-center justify-center rounded-xl shrink-0">
                        <MaterialIcon name={cat.icon} />
                    </div>
                    <h2 className="text-[#0d161b] dark:text-white text-sm font-black italic truncate leading-tight">{cat.name}</h2>
                </div>
            ))}
        </div>
    </>
);

// --- FEATURED PHARMACIES ---
export const FeaturedPharmacies = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => {
    if (!pharmacies || pharmacies.length === 0) return null;

    // Filter logic: if no featured found, use all pharmacies (top 10)
    const featured = pharmacies.filter(p => p.is_featured);
    const list = featured.length > 0 ? featured : pharmacies;
    const limit = config?.limit && config.limit > 0 ? config.limit : 10;
    const displayList = list.slice(0, limit);

    return (
        <div className="w-full mt-2">
            <div className="px-5 py-4">
                <h3 className="text-white text-xl font-black italic tracking-tight">{title || 'Farmácias em Destaque'}</h3>
            </div>
            <div className="w-full overflow-x-auto hide-scrollbar">
                <div className="flex px-4 gap-4 pb-4">
                    {displayList.map(pharma => {
                        const isOpen = isPharmacyOpen(pharma);

                        return (
                            <Link to={`/pharmacy/${pharma.id}`} key={pharma.id}
                                className={`flex flex-col gap-2 transition-transform active:scale-95 ${!isOpen ? 'grayscale' : ''}`}>
                                <div className="relative size-32 rounded-[32px] bg-[#1a2e23] border border-white/5 shadow-2xl overflow-hidden p-3 flex items-center justify-center">
                                    {pharma.logo_url ? (
                                        <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-2xl" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-3xl italic">
                                            {pharma.name.charAt(pharma.name.startsWith('Farmácia') ? 9 : 0)}
                                        </div>
                                    )}

                                    {!isOpen && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="text-[10px] font-black text-white px-2 py-1 bg-black/60 rounded-full">FECHADO</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-1 max-w-[128px]">
                                    <p className="text-white text-xs font-black italic truncate mb-1">{pharma.name}</p>
                                    <div className="flex items-center gap-1">
                                        <MaterialIcon name="star" className="text-[10px] text-yellow-500" fill />
                                        <span className="text-[10px] font-black text-slate-300">{pharma.rating || '5.0'}</span>
                                        <span className="text-[8px] font-bold text-slate-500 ml-auto lowercase">30 min</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

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
