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
                <button className="text-primary text-xs font-black uppercase tracking-widest">Ver todas</button>
            </div>
            <div className="flex overflow-x-auto hide-scrollbar gap-4 px-5 pb-4">
                {categories.map((cat) => (
                    <Link
                        to={cat.banner_link || `/category/${cat.id}`}
                        key={cat.id}
                        className="relative min-w-[140px] h-[200px] rounded-[32px] overflow-hidden shadow-xl shrink-0 active:scale-95 transition-transform"
                        style={{ backgroundColor: cat.banner_color || '#1a2e23' }}
                    >
                        {/* Header Text */}
                        <div className="absolute top-4 left-0 right-0 px-4 text-center z-20">
                            {cat.banner_description && (
                                <p className="text-[10px] font-black uppercase tracking-tighter text-white/80 leading-tight">
                                    {cat.banner_description}
                                </p>
                            )}
                            <h2 className="text-white text-lg font-black leading-tight truncate">
                                {cat.name}
                            </h2>
                            {cat.banner_price && (
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="text-white text-[10px] font-bold opacity-70 leading-none">por</span>
                                    <span className="text-white text-xl font-black italic tracking-tighter leading-none">
                                        {cat.banner_price}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Product/Category Image at Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-center p-2 z-10">
                            {cat.image_url ? (
                                <img
                                    src={cat.image_url}
                                    alt={cat.name}
                                    className="w-full h-full object-contain transform hover:scale-110 transition-transform"
                                />
                            ) : (
                                <MaterialIcon name="category" className="text-5xl text-white/10 mb-4" />
                            )}
                        </div>

                        {/* Subtle Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
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
            <div className="px-5 mb-4 flex items-baseline justify-between">
                <h3 className="text-white text-xl font-black italic tracking-tight">
                    {isFallback ? 'Destaques na Região' : (title || 'Farmácias em Destaque')}
                </h3>
                {isFallback && <span className="text-[10px] font-black text-primary uppercase animate-pulse">Populares</span>}
            </div>
            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth">
                <div className="flex px-4 gap-4 pb-2" style={{ minWidth: 'max-content' }}>
                    {displayList.map(pharma => {
                        const isOpen = isPharmacyOpen(pharma);

                        return (
                            <Link to={`/pharmacy/${pharma.id}`} key={pharma.id}
                                className={`flex flex-col gap-3 shrink-0 transition-transform active:scale-95 ${!isOpen ? 'grayscale opacity-60' : ''}`}>
                                <div className={`relative size-36 rounded-[40px] bg-[#1a2e23] border border-white/5 shadow-2xl overflow-hidden p-4 flex items-center justify-center ${!isFallback ? 'border-b-4 border-yellow-500 shadow-[0_4px_10px_rgba(234,179,8,0.2)]' : ''}`}>
                                    {pharma.logo_url ? (
                                        <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-2xl" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-4xl italic">
                                            {pharma.name.charAt(pharma.name.startsWith('Farmácia') ? 9 : 0)}
                                        </div>
                                    )}

                                    {!isOpen && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-[10px] font-black text-white px-3 py-1 bg-red-500/80 rounded-full">FECHADA</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-2 max-w-[144px]">
                                    <p className="text-white text-sm font-black italic truncate mb-1">{pharma.name}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <MaterialIcon name="star" className="text-[10px] text-yellow-500" fill />
                                            <span className="text-[11px] font-black text-slate-300">{pharma.rating || '5.0'}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-500 ml-auto lowercase">30 min</span>
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
            <div className="px-5 pt-8 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
                        <MaterialIcon name={isFallback ? "trending_up" : "local_offer"} className="text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-[#0d161b] dark:text-white text-lg font-black italic tracking-tight leading-none">
                            {isFallback ? 'Mais Vendidos' : (title || 'Ofertas Especiais')}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {isFallback ? 'Destaques da região' : 'Produtos em Anúncio'}
                        </p>
                    </div>
                </div>
                {isFallback && (
                    <span className="text-[8px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full uppercase tracking-tighter">
                        Top Vendas
                    </span>
                )}
            </div>

            <div className="flex overflow-x-auto hide-scrollbar pb-4 pl-4">
                <div className="flex items-stretch gap-3 pr-4">
                    {products.map(item => (
                        <Link
                            to={`/product/${item.id}`}
                            key={item.id}
                            className={`min-w-[160px] bg-white dark:bg-[#1e293b] p-3 rounded-[24px] border border-slate-100 dark:border-white/5 shadow-lg flex flex-col gap-2 transition-transform active:scale-95 border-b-4 border-yellow-500/60 shadow-[0_4px_10px_rgba(234,179,8,0.1)]`}
                        >
                            <div className="aspect-square rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                                ) : (
                                    <MaterialIcon name="medication" className="text-3xl text-primary/20" />
                                )}
                                {(item.promotional_price || isFallback) && (
                                    <div className={`absolute top-1 right-1 ${item.promotional_price ? 'bg-red-500' : 'bg-blue-500'} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full`}>
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
