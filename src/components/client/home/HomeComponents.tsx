import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { MaterialIcon } from '../../MaterialIcon';
import { PharmacyCard, isPharmacyOpen } from './PharmacyCard'; // Importando o novo componente e helper

const getValidImageUrl = (url: string) => {
    if (!url) return null;
    // Corrigir links do Pexels que apontam para a página em vez da imagem direta
    if (url.includes('pexels.com') && !url.includes('images.pexels.com')) {
        const idMatch = url.match(/(\d+)\/?$/);
        if (idMatch && idMatch[1]) {
            return `https://images.pexels.com/photos/${idMatch[1]}/pexels-photo-${idMatch[1]}.jpeg?auto=compress&cs=tinysrgb&w=800`;
        }
    }
    return url;
};

// --- PROMO CAROUSEL (TOP HEADLINES) ---
// --- PROMO CAROUSEL (TOP HEADLINES) ---
export const PromoCarousel = ({ config }: { config?: any }) => {
    const navigate = useNavigate();
    const [promotions, setPromotions] = useState<any[]>([]);

    useEffect(() => {
        const loadBanners = async () => {
            // Prioritize new 'banners' structure with links
            if (config?.banners && config.banners.length > 0) {
                setPromotions(config.banners.map((b: any, idx: number) => ({
                    id: `cfg-b-${idx}`,
                    image_url: b.image,
                    link: b.link
                })));
                return;
            }

            // Fallback to legacy 'images' structure
            if (config?.images && config.images.length > 0) {
                setPromotions(config.images.map((url: string, idx: number) => ({
                    id: `cfg-${idx}`,
                    image_url: url,
                    link: null
                })));
                return;
            }

            try {
                const { data } = await supabase
                    .from('promotions')
                    .select('*')
                    .eq('is_active', true)
                    .gte('end_date', new Date().toISOString().split('T')[0]);

                if (data && data.length > 0) {
                    setPromotions(data);
                    return;
                }
            } catch (e) {
                console.warn("Error loading banners:", e);
            }

            setPromotions([
                { id: 'mk1', title: 'Ofertas da Semana', subtitle: 'Até 50% OFF', color1: '#132218', color2: '#13ec6d' },
                { id: 'mk2', title: 'Saúde em Dia', subtitle: 'Vitaminas & Suplementos', color1: '#1a2e23', color2: '#1392ec' }
            ]);
        };
        loadBanners();
    }, [config]);

    const handleBannerClick = (promo: any) => {
        if (promo.link) {
            if (promo.link.startsWith('http')) {
                window.open(promo.link, '_blank');
            } else {
                navigate(promo.link);
            }
        }
    };

    if (promotions.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory scroll-pl-8">
            <div className="flex px-8 pr-8 py-3 gap-3 min-w-max">
                {promotions.map((promo: any) => {
                    const containerClasses = "relative w-[300px] h-[135px] rounded-[32px] overflow-hidden shadow-xl border border-white/5 shrink-0 snap-start transition-transform active:scale-[0.98] cursor-pointer";

                    return (
                        <div
                            key={promo.id}
                            onClick={() => handleBannerClick(promo)}
                            className={containerClasses}
                        >
                            <div className="absolute inset-0 z-0"
                                style={{
                                    background: promo.image_url ? `url(${promo.image_url}) center/cover no-repeat` : `linear-gradient(135deg, ${promo.color1 || '#132218'} 0%, ${promo.color2 || '#13ec6d'} 100%)`
                                }}
                            />

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
                    );
                })}
            </div>
        </div>
    );
};

// --- INTERNAL AD CAROUSEL (AD SERVER NATIVO) ---
export const InternalAdCarousel = ({ region = 'global' }: { region?: string }) => {
    const navigate = useNavigate();
    const [ads, setAds] = useState<any[]>([]);

    useEffect(() => {
        const fetchAds = async () => {
            const today = new Date().toISOString();
            const { data } = await supabase
                .from('ads_campaigns')
                .select('*')
                .eq('is_active', true)
                .lte('start_date', today)
                .or(`end_date.is.null, end_date.gte.${today}`)
                .eq('region_id', region)
                .order('created_at', { ascending: false });

            if (data) setAds(data);
        };
        fetchAds();
    }, [region]);

    const trackMetric = async (campaignId: string, type: 'views' | 'clicks') => {
        const { data: current } = await supabase.from('ads_metrics').select(type).eq('campaign_id', campaignId).single();
        if (current) {
            await supabase.from('ads_metrics').update({ [type]: (current[type] || 0) + 1 }).eq('campaign_id', campaignId);
        }
    };

    const handleAdClick = (ad: any) => {
        trackMetric(ad.id, 'clicks');
        let path = '/';
        switch (ad.destination_type) {
            case 'store': path = `/pharmacy/${ad.destination_id}`; break;
            case 'category': path = `/category/${ad.destination_id}`; break;
            case 'product': path = `/product/${ad.destination_id}`; break;
            case 'external': window.open(ad.destination_id, '_blank'); return;
        }
        navigate(path);
    };

    if (ads.length === 0) return null;

    return (
        <div className="w-full pb-4">
            <div className="px-8 mb-3 flex items-center gap-2">
                <MaterialIcon name="verified" className="text-primary text-sm" />
                <span className="text-[10px] font-black uppercase text-white tracking-widest">Patrocinado</span>
            </div>

            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth">
                <div className="flex px-8 gap-3" style={{ minWidth: 'max-content' }}>
                    {ads.map((ad: any) => (
                        <div
                            key={ad.id}
                            onClick={() => handleAdClick(ad)}
                            className="relative w-[300px] h-[180px] rounded-[28px] overflow-hidden shadow-xl border border-white/5 shrink-0 cursor-pointer active:scale-95 transition-all"
                        >
                            <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- CATEGORY GRID ---
export const CategoryGrid = ({ config, title }: { config?: any, title?: string }) => {
    const navigate = useNavigate();
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
        <div className="w-full py-4">
            <div className="flex items-center justify-between px-8 mb-4">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-white text-xl font-bold italic tracking-tight leading-none uppercase">{title || 'Categorias'}</h3>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Navegue por departamento</p>
                </div>
                <Link to="/categories" className="text-primary text-xs font-black uppercase tracking-widest">Ver todas</Link>
            </div>
            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory pb-2 scroll-pl-8">
                <div className="flex gap-3 px-8 pr-8 min-w-max">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => navigate(cat.banner_link || `/category/${cat.id}`)}
                            className="relative min-w-[125px] h-[170px] rounded-[32px] overflow-hidden shadow-2xl shrink-0 snap-start active:scale-95 transition-transform bg-[#1a2e23] border border-white/5 cursor-pointer"
                        >
                            <div className="absolute inset-0 w-full h-full">
                                {cat.image_url ? (
                                    <img
                                        src={getValidImageUrl(cat.image_url) || ''}
                                        alt={cat.name}
                                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                        <MaterialIcon name="category" className="text-5xl text-white/10" />
                                    </div>
                                )}
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

                            <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col gap-0.5">
                                {cat.banner_description && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary leading-tight">
                                        {cat.banner_description}
                                    </span>
                                )}
                                <h2 className="text-white text-base font-black leading-tight truncate italic">
                                    {cat.name}
                                </h2>
                                {cat.banner_price && (
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className="text-white/60 text-[8px] font-bold">A partir de</span>
                                        <span className="text-white text-sm font-black italic tracking-tighter">
                                            R$ {cat.banner_price}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- FEATURED PHARMACIES ---
export const FeaturedPharmacies = ({ pharmacies, config, title }: { pharmacies: any[], config?: any, title?: string }) => {
    // Garante array
    const checkIsFeatured = (p: any) => p?.is_featured === true || p?.is_featured === 'true' || p?.is_featured === 1;
    const sourceList = Array.isArray(pharmacies) ? pharmacies : [];

    // Filtra featured
    let displayList = sourceList.filter(checkIsFeatured);

    // Fallback agressivo
    if ((!displayList || displayList.length === 0) && sourceList.length > 0) {
        displayList = sourceList.slice(0, 5);
    }

    // Limite
    displayList = displayList.slice(0, config?.limit || 10);

    if (displayList.length === 0) return null;

    return (
        <div className="w-full py-4 min-h-[240px]">
            <div className="px-8 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <MaterialIcon name="verified" className="text-yellow-500 text-xl" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] font-black text-white uppercase tracking-[0.15em] italic leading-tight">PATROCINADO</p>
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest">Destaque por publicidade</p>
                    </div>
                </div>
                {displayList.length > 3 && (
                    <Link to="/pharmacies" className="text-[10px] font-bold text-primary hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1">
                        Ver todos <MaterialIcon name="arrow_forward" className="text-sm" />
                    </Link>
                )}
            </div>

            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory scroll-pl-8">
                <div className="flex gap-2 px-8 pr-8 pb-5 min-w-max">
                    {displayList.map((pharmacy: any, index: number) => (
                        <PharmacyCard
                            key={pharmacy.id || index}
                            pharmacy={pharmacy}
                            className="w-28 shrink-0 snap-start"
                        />
                    ))}
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
            let { data } = await supabase
                .from('products')
                .select(`
                    id, 
                    name, 
                    price, 
                    promo_price,
                    image_url, 
                    pharmacy_id,
                    pharmacies!inner(name, plan, status)
                `)
                .eq('pharmacies.status', 'approved')
                .limit(config?.limit || 10);

            if ((!data || data.length === 0)) {
                // FALLBACK: Get products from any approved pharmacy if featured pharmacies aren't available
                const { data: fallbackData } = await supabase
                    .from('products')
                    .select(`
                        id, 
                        name, 
                        price, 
                        promo_price,
                        image_url, 
                        pharmacy_id,
                        pharmacies!inner(name, plan, status)
                    `)
                    .eq('pharmacies.status', 'approved')
                    .limit(10);

                data = fallbackData;
                setIsFallback(true);
            }

            if (data) {
                data = data.sort(() => Math.random() - 0.5);
            }

            if (data) setProducts(data);
            setLoading(false);
        };
        fetchProductAds();
    }, [config, pharmacies]);

    if (loading || products.length === 0) return null;

    return (
        <div className="w-full">
            <div className="px-8 pt-8 pb-3 flex items-center gap-3">
                <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <MaterialIcon name="verified" className="text-yellow-500 text-xl" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-black text-white italic uppercase tracking-[0.15em] leading-tight">
                        {title || 'Mais Vendidos'}
                    </p>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                        {isFallback ? 'DESTAQUES DA REGIÃO' : 'PRODUTOS EM ALTA'}
                    </p>
                </div>
            </div>

            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory pb-5 scroll-pl-8">
                <div className="flex gap-3 px-8 pr-8 min-w-max">
                    {products.map(item => (
                        <Link
                            to={`/product/${item.id}`}
                            key={item.id}
                            className={`w-32 bg-white dark:bg-[#1a2e23] p-3 rounded-[32px] flex flex-col gap-2 transition-all active:scale-95 border-b-4 border-yellow-400 shadow-[0_10px_15px_-6px_rgba(250,204,21,0.4)] shrink-0 snap-start`}
                        >
                            <div className="aspect-square rounded-2xl bg-white dark:bg-black/20 flex items-center justify-center p-2 overflow-hidden relative border border-slate-100 dark:border-white/5">
                                {item.image_url ? (
                                    <img src={getValidImageUrl(item.image_url) || ''} alt={item.name} className="w-full h-full object-contain" />
                                ) : (
                                    <MaterialIcon name="medication" className="text-3xl text-primary/20" />
                                )}
                                {((item.promo_price ?? item.promotional_price) || isFallback) && (
                                    <div className={`absolute top-1 right-1 ${(item.promo_price ?? item.promotional_price) ? 'bg-red-500' : 'bg-blue-600'} text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md`}>
                                        {(item.promo_price ?? item.promotional_price) ? 'OFERTA' : 'POPULAR'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-[11px] truncate leading-tight italic">{item.name}</h4>
                                <p className="text-[8px] text-slate-400 truncate mb-1 uppercase font-bold">{item.pharmacies.name}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-primary font-black text-base italic tracking-tighter">R$ {((item.promo_price ?? item.promotional_price) || item.price).toFixed(2)}</span>
                                    {(item.promo_price ?? item.promotional_price) && (
                                        <span className="text-[8px] text-slate-400 line-through">R$ {item.price.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- NEARBY PHARMACIES ---
export const NearbyPharmacies = ({ pharmacies, config, title }: { pharmacies?: any[], config?: any, title?: string }) => {
    // Hardening against data issues
    const list = Array.isArray(pharmacies) ? pharmacies : [];
    if (list.length === 0) return null; // Hide if empty

    return (
        <div className="w-full">
            <div className="px-8 pt-6 pb-2 flex justify-between items-center">
                <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{title || 'Farmácias Próximas'}</h3>
                <Link to="/pharmacies" className="text-primary text-xs font-black uppercase tracking-widest">
                    Mapa
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-2 px-8 pb-10">
                {list.slice(0, config?.limit || 10).map((pharma) => {
                    const isOpen = isPharmacyOpen(pharma);
                    return (
                        <Link
                            to={`/pharmacy/${pharma.id}`}
                            key={pharma.id}
                            className={`flex items-center gap-4 p-4 rounded-[28px] bg-white dark:bg-[#1a2e23] border border-slate-100 dark:border-white/5 active:scale-[0.98] transition-all shadow-sm ${!isOpen ? 'grayscale' : ''}`}
                        >
                            <div className="size-16 rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center p-2 relative overflow-hidden border border-slate-100 dark:border-white/5">
                                {pharma.logo_url ? (
                                    <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-contain rounded-lg" />
                                ) : (
                                    <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl italic">
                                        {pharma.name?.charAt(pharma.name.startsWith('Farmácia') ? 9 : 0) || 'F'}
                                    </div>
                                )}

                                {!isOpen && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-[7px] font-black text-white px-1.5 py-0.5 bg-red-500 rounded-full">FECHADA</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="text-slate-800 dark:text-white font-black italic uppercase text-sm leading-tight truncate tracking-tight">{pharma.name}</h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1">
                                        <MaterialIcon name="star" className="text-[10px] text-yellow-500" />
                                        <span className="text-xs font-black text-yellow-500">{pharma.rating || '5.0'}</span>
                                    </div>
                                    {(pharma.delivery_time_min && pharma.delivery_time_max) && (
                                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                            <MaterialIcon name="schedule" className="text-[12px]" />
                                            <span>{pharma.delivery_time_min}-{pharma.delivery_time_max} min</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <MaterialIcon name="place" className="text-[10px] text-primary" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {pharma.distance === Infinity || pharma.distance === undefined ? 'Distância N/A' : typeof pharma.distance === 'number' ? `${pharma.distance.toFixed(1)} km` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

// --- HOME SKELETON (LOADING STATE) ---
export const HomeSkeleton = () => (
    <div className="w-full h-full bg-[#0d161b] animate-pulse">
        {/* Promo Carousel Skeleton */}
        <div className="w-full overflow-x-auto hide-scrollbar pt-4 pb-2">
            <div className="flex px-8 gap-2">
                {[1, 2].map(i => (
                    <div key={i} className="w-[300px] h-[135px] rounded-[32px] bg-[#1a2e23] border border-white/5 shrink-0" />
                ))}
            </div>
        </div>

        {/* Categories Skeleton */}
        <div className="w-full overflow-x-auto hide-scrollbar py-4">
            <div className="flex px-8 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-[125px] h-[170px] rounded-[32px] bg-[#1a2e23] border border-white/5 shrink-0" />
                ))}
            </div>
        </div>

        {/* Pharmacy List Skeleton */}
        <div className="px-8 pt-6 pb-2 flex justify-between items-center">
            <div className="h-6 w-40 bg-[#1a2e23] rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-2 px-8 pb-10">
            {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-24 rounded-[28px] bg-[#1a2e23] border border-white/5" />
            ))}
        </div>
    </div>
);
