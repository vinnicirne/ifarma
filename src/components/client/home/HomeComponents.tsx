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
        <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth">
            <div className="flex px-4 py-3 gap-4" style={{ minWidth: 'max-content' }}>
                {promotions.map((promo: any) => (
                    <div key={promo.id}
                        className="relative w-[320px] h-[140px] rounded-[32px] overflow-hidden shadow-2xl border border-white/5 shrink-0">
                        {/* Background Layer */}
                        <div className="absolute inset-0 z-0"
                            style={{
                                background: promo.image_url ? `url(${promo.image_url}) center/cover no-repeat` : `linear-gradient(135deg, ${promo.color1 || '#132218'} 0%, ${promo.color2 || '#13ec6d'} 100%)`
                            }}
                        />

                        {/* Overlay Layer */}
                        {!promo.image_url && (
                            <div className="absolute inset-0 z-10 flex flex-col justify-center p-6 bg-black/40">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">
                                    {promo.name || promo.title || 'Oferta Ifarma'}
                                </p>
                                <h2 className="text-2xl font-black leading-tight italic text-white">
                                    {promo.subtitle || 'Confira as novidades'}
                                </h2>
                                <div className="mt-4">
                                    <span className="px-4 py-1.5 bg-primary/20 hover:bg-primary/30 rounded-full text-[9px] font-black uppercase tracking-widest text-primary border border-primary/30 backdrop-blur-md transition-colors">
                                        Ver Agora
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CATEGORIES (VERTICAL BANNERS) ---
export const CategoryGrid = ({ config, title }: { config?: any, title?: string }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('position', { ascending: true })
                .limit(config?.limit || 10);

            if (data) setCategories(data);
            setLoading(false);
        };
        fetchCategories();
    }, [config]);

    if (loading || categories.length === 0) return null;

    return (
        <>
            <div className="flex items-center justify-between px-5 pt-8 pb-3">
                <h3 className="text-[#0d161b] dark:text-white text-xl font-bold italic tracking-tight leading-none">{title || 'Categorias'}</h3>
                <Link to="/categories" className="text-primary text-xs font-black uppercase tracking-widest">Ver todas</Link>
            </div>
            <div className="flex overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory gap-3 px-5 pb-5">
                {categories.map((cat) => (
                    <Link
                        to={cat.banner_link || `/category/${cat.id}`}
                        key={cat.id}
                        className="relative min-w-[140px] h-[200px] rounded-[32px] overflow-hidden shadow-xl shrink-0 snap-start active:scale-95 transition-transform bg-[#1a2e23]"
                    >
                        {/* 100% Background Image */}
                        <div className="absolute inset-0 w-full h-full">
                            {cat.image_url ? (
                                <img
                                    src={cat.image_url}
                                    alt={cat.name}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                    <MaterialIcon name="category" className="text-5xl text-white/10" />
                                </div>
                            )}
                        </div>

                        {/* Overlay Gradient for Text Legibility (Style Marketplace) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

                        {/* Text Content Overlay (Bottom-left aligned) */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col gap-0.5">
                            {cat.banner_description && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-tight">
                                    {cat.banner_description}
                                </span>
                            )}
                            <h2 className="text-white text-lg font-black leading-tight truncate italic">
                                {cat.name}
                            </h2>
                            {cat.banner_price && (
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-white/60 text-[9px] font-bold">A partir de</span>
                                    <span className="text-white text-base font-black italic tracking-tighter">
                                        R$ {cat.banner_price}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
};

// --- FEATURED PHARMACIES ---
export const FeaturedPharmacies = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => {
    // 1. Tentar anúncios (is_featured)
    let displayList = (pharmacies || []).filter(p => p.is_featured === true).slice(0, config?.limit || 10);
    let isFallback = false;

    // 2. Fallback: Se não houver anúncios, mostrar as Top 5 da região (melhor score/ranking)
    if (displayList.length === 0 && pharmacies && pharmacies.length > 0) {
        displayList = pharmacies.slice(0, 5);
        isFallback = true;
    }

    if (displayList.length === 0) return null;

    return (
        <div className="w-full py-4">
            <div className="px-5 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <MaterialIcon name="stars" className="text-yellow-500 text-xl" fill />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-tight">
                            PATROCINADO
                        </p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Lojas em destaque por publicidade
                        </p>
                    </div>
                </div>
                <Link to="/pharmacies" className="text-primary text-xs font-bold opacity-80 hover:opacity-100 flex items-center gap-1">
                    Ver todos <MaterialIcon name="chevron_right" className="text-sm" />
                </Link>
            </div>
            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth">
                <div className="flex px-5 gap-3 pb-5">
                    {displayList.map(pharma => {
                        const isOpen = isPharmacyOpen(pharma);

                        return (
                            <Link to={`/pharmacy/${pharma.id}`} key={pharma.id}
                                className={`flex flex-col gap-3 p-3 w-40 rounded-[40px] bg-[#1a2e23] shrink-0 transition-transform active:scale-95 border-b-4 border-yellow-400 shadow-[0_12px_20px_-8px_rgba(250,204,21,0.6)] ${!isOpen ? 'grayscale opacity-60' : ''}`}>

                                <div className="aspect-square rounded-2xl bg-black/20 flex items-center justify-center p-2 relative overflow-hidden">
                                    {pharma.logo_url ? (
                                        <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-3xl italic">
                                            {pharma.name.charAt(pharma.name.startsWith('Farmácia') ? 9 : 0)}
                                        </div>
                                    )}

                                    {!isOpen && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-[8px] font-black text-white px-2 py-0.5 bg-red-500 rounded-full">FECHADA</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1 min-w-0">
                                    <p className="text-white text-xs font-black italic truncate uppercase leading-tight tracking-tight">
                                        {pharma.name}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <MaterialIcon name="star" className="text-[10px] text-yellow-500" fill />
                                            <span className="text-[11px] font-black text-yellow-500">{pharma.rating || '5.0'}</span>
                                            <span className="text-[9px] text-slate-500 ml-1">
                                                ({pharma.distance === Infinity ? 'N/A' : `${pharma.distance.toFixed(1)}km`})
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-500 lowercase truncate">
                                            ⏱ {pharma.delivery_time_min || '20'}-{pharma.delivery_time_max || '30'} min
                                        </span>
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

// --- SPECIAL HIGHLIGHTS (ADS DE PRODUTOS COM FALLBACK) ---
export const SpecialHighlights = ({ config, title, pharmacies }: { pharmacies: any[], config?: any, title?: string }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFallback, setIsFallback] = useState(false);

    useEffect(() => {
        const fetchProductAds = async () => {
            // 1. Tentar anúncios de produtos ou promoções
            let { data, error } = await supabase
                .from('products')
                .select(`
                    id, 
                    name, 
                    price, 
                    promotional_price, 
                    image_url, 
                    pharmacy_id,
                    pharmacies!inner(name, plan, status)
                `)
                .eq('pharmacies.status', 'approved')
                .or(`promotional_price.not.is.null, pharmacies.plan.in.("premium","pro")`)
                .limit(config?.limit || 10);

            // 2. Fallback: Se não houver banners pagos ou promoções, pegar produtos das top farmácias da região
            if ((!data || data.length === 0) && pharmacies && pharmacies.length > 0) {
                const nearPharmacyIds = pharmacies.slice(0, 3).map(p => p.id);
                const { data: fallbackData } = await supabase
                    .from('products')
                    .select(`
                        id, 
                        name, 
                        price, 
                        promotional_price, 
                        image_url, 
                        pharmacy_id,
                        pharmacies!inner(name, plan, status)
                    `)
                    .in('pharmacy_id', nearPharmacyIds)
                    .limit(10);

                data = fallbackData;
                setIsFallback(true);
            }

            // Randomizar a ordem dos anúncios para ser justo com os anunciantes
            if (data && !isFallback) {
                data = data.sort(() => Math.random() - 0.5);
            }

            if (data) setProducts(data);
            setLoading(false);
        };
        fetchProductAds();
    }, [config, pharmacies]);

    if (loading || products.length === 0) return null;

    return (
        <>
            <div className="px-5 pt-8 pb-3 flex items-center gap-3">
                <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <MaterialIcon name="local_offer" className="text-yellow-500 text-xl" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-tight">
                        MAIS VENDIDOS
                    </p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {isFallback ? 'Destaques da Região' : 'Produtos em Alta'}
                    </p>
                </div>
            </div>

            <div className="flex overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory gap-3 px-5 pb-5">
                {products.map(item => (
                    <Link
                        to={`/product/${item.id}`}
                        key={item.id}
                        className={`w-40 bg-white dark:bg-[#1a2e23] p-3 rounded-[32px] flex flex-col gap-2 transition-all active:scale-95 border-b-4 border-yellow-400 shadow-[0_10px_15px_-6px_rgba(250,204,21,0.4)] shrink-0 snap-start`}
                    >
                        <div className="aspect-square rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                            ) : (
                                <MaterialIcon name="medication" className="text-3xl text-primary/20" />
                            )}
                            {(item.promotional_price || isFallback) && (
                                <div className={`absolute top-1 right-1 ${item.promotional_price ? 'bg-red-500' : 'bg-yellow-400'} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md`}>
                                    {item.promotional_price ? 'OFERTA' : 'POPULAR'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate leading-tight">{item.name}</h4>
                            <p className="text-[8px] text-slate-400 truncate mb-1">{item.pharmacies.name}</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-primary font-black text-sm italic">R$ {(item.promotional_price || item.price).toFixed(2)}</span>
                                {item.promotional_price && (
                                    <span className="text-[8px] text-slate-400 line-through">R$ {item.price.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
};

// --- NEARBY PHARMACIES ---
export const NearbyPharmacies = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => (
    <>
        <div className="px-4 pt-6 pb-2 flex justify-between items-center">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{title || 'Farmácias Próximas'}</h3>
            <Link to="/pharmacies" className="text-primary text-sm font-bold opacity-80 hover:opacity-100">Ver tudo</Link>
        </div>
        <div className="px-4 flex flex-col gap-2 pb-5">
            {pharmacies.slice(0, config?.limit || 20).map(pharma => {
                const isOpen = isPharmacyOpen(pharma);

                return (
                    <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className={`flex gap-3 p-2.5 rounded-2xl border transition-all active:scale-[0.98] ${!isOpen
                        ? 'bg-transparent grayscale opacity-60 border-slate-100 dark:border-white/5'
                        : pharma.is_featured
                            ? 'bg-white dark:bg-[#1a2e23] border-yellow-400/50 shadow-[0_4px_15px_rgba(250,204,21,0.2)] border-b-2'
                            : 'bg-white dark:bg-[#1a2e23] border-slate-100 dark:border-white/5 hover:border-primary/20 shadow-sm'
                        } items-center`}>
                        <div className="size-14 rounded-xl bg-slate-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden p-1">
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
