import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { BottomNav } from '../../components/layout/BottomNav';
import { useCartCount } from '../../hooks/useCartCount';
import { useCart } from '../../hooks/useCart';


// --- Shared Helper for Distance ---
import { calculateDistance } from '../../lib/geoUtils';

// --- Subcomponents for Home ---

const PromoCarousel = () => {
    const [promotions, setPromotions] = useState<any[]>([]);

    useEffect(() => {
        const fetchPromos = async () => {
            const { data } = await supabase
                .from('promotions')
                .select('*')
                .eq('is_active', true)
                .gte('end_date', new Date().toISOString().split('T')[0]); // Only future/present promos

            if (data && data.length > 0) {
                setPromotions(data);
            } else {
                // Fallback Mock se não tiver nada no banco (para não ficar vazio)
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

const CategoryGrid = () => (
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

const FeaturedPharmacies = ({ pharmacies }: { pharmacies: any[] }) => (
    <>
        <div className="px-4 pt-6 pb-2">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Farmácias em Destaque</h3>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar">
            <div className="flex items-stretch p-4 gap-4">
                {pharmacies.filter(p => p.is_featured).map(pharma => (
                    <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className="min-w-[160px] flex flex-col gap-2">
                        <div className="w-full aspect-square rounded-2xl bg-slate-100 flex items-center justify-center p-4 border border-slate-100 dark:border-slate-800 dark:bg-slate-900 overflow-hidden relative shadow-sm">
                            {pharma.logo_url ? (
                                <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-black text-2xl italic`}>
                                    {pharma.name.charAt(0)}
                                </div>
                            )}
                            {pharma.is_open && (
                                <div className="absolute bottom-2 right-2 bg-success text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ABERTO</div>
                            )}
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
                ))}
            </div>
        </div>
    </>
);

const NearbyPharmacies = ({ pharmacies }: { pharmacies: any[] }) => (
    <>
        <div className="px-4 pt-6 pb-2 flex justify-between items-center">
            <h3 className="text-[#0d161b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Farmácias Próximas</h3>
            <Link to="/pharmacies" className="text-primary text-sm font-bold">Ver tudo</Link>
        </div>
        <div className="px-4 flex flex-col gap-4 pb-20">
            {pharmacies.map(pharma => (
                <Link to={`/pharmacy/${pharma.id}`} key={pharma.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 items-start shadow-sm hover:border-primary/30 transition-colors">
                    <div className="size-16 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 overflow-hidden">
                        {pharma.logo_url ? (
                            <img src={pharma.logo_url} alt={pharma.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 text-primary flex items-center justify-center font-bold text-xl">{pharma.name.charAt(0)}</div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <h4 className="text-base font-bold text-[#0d161b] dark:text-white flex items-center gap-2">
                                {pharma.name}
                                {pharma.isNew && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">NOVO</span>}
                            </h4>
                            <div className="flex items-center gap-1 text-xs font-bold bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                <MaterialIcon name="star" className="text-[14px]" fill /> {pharma.rating || '0.0'}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1"><MaterialIcon name="schedule" className="text-[14px]" /> 20-30 min</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <MaterialIcon name="location_on" className="text-[14px]" />
                                {pharma.distance === Infinity ? 'N/A' : `${pharma.distance.toFixed(1)} km`}
                            </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    </>
);

export const ClientHome = ({ userLocation, sortedPharmacies, session }: { userLocation: { lat: number, lng: number } | null, sortedPharmacies: any[], session: any }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const cartCount = useCartCount(session?.user?.id); // Using the hook for logic, although TopAppBar also displays it.

    // --- Cart Shared Logic ---
    const { addToCart } = useCart();
    // --- Cart Shared Logic ---
    const handleAddToCart = async (productId: string) => {
        if (!session) {
            navigate('/login');
            return;
        }

        try {
            // Find the item in search results to get pharmacy_id
            const item = searchResults.find(r => r.id === productId);
            const pharmacyId = item?.pharmacy_id;

            await addToCart(productId, pharmacyId || '');
            alert('Produto adicionado ao carrinho! 🛒');
        } catch (error: any) {
            console.error("💥 Erro ao adicionar ao carrinho:", error);
            alert(`Erro: ${error.message}`);
        }
    };

    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.length < 3) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            const { data, error } = await supabase
                .from('products')
                .select(`
          id,
          price,
          name,
          category,
          image_url,
          pharmacy_id,
          pharmacy:pharmacies!inner(name, latitude, longitude)
        `)
                .ilike('name', `%${searchQuery}%`)
                .order('price', { ascending: true });

            if (error) {
                console.error("Search error:", error);
                setSearchResults([]);
            } else if (data) {
                // Calculate distance and sort
                const processed = data.map((item: any) => {
                    let distance = Infinity;
                    const referenceLoc = userLocation || { lat: -22.8269, lng: -43.0539 };
                    if (item.pharmacy.latitude && item.pharmacy.longitude) {
                        distance = calculateDistance(
                            referenceLoc.lat,
                            referenceLoc.lng,
                            Number(item.pharmacy.latitude),
                            Number(item.pharmacy.longitude)
                        );
                    }
                    return {
                        ...item,
                        product: { name: item.name, category: item.category, image_url: item.image_url }, // Adapting structure to match original code expectation
                        distance
                    };
                });

                // Sort by distance if prices are close, or just by price then distance
                const sorted = processed.sort((a, b) => {
                    if (Math.abs(a.price - b.price) < 0.01) return a.distance - b.distance;
                    return a.price - b.price;
                });

                setSearchResults(sorted);
            }
            setIsSearching(false);
        };

        const timer = setTimeout(performSearch, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, userLocation]);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-[480px] mx-auto shadow-xl bg-white dark:bg-background-dark">
            <TopAppBar
                onSearch={setSearchQuery}
                userLocation={userLocation}
                session={session}
            />

            <main className="flex-1">
                {searchQuery.length > 0 ? (
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white italic">
                                {isSearching ? 'Buscando...' : `Resultados para "${searchQuery}"`}
                            </h2>
                            {searchResults.length > 0 && (
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">
                                    {searchResults.length} {searchResults.length === 1 ? 'item' : 'itens'}
                                </span>
                            )}
                        </div>

                        {searchResults.length === 0 && !isSearching ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <MaterialIcon name="search_off" className="text-6xl mb-4 opacity-20" />
                                <p className="font-bold italic">Nenhum produto encontrado</p>
                                <p className="text-xs opacity-60">Tente buscar por termos mais genéricos</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {searchResults.map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-[#1a2e23] p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex gap-4">
                                        <div className="size-24 rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden">
                                            {item.product.image_url ? (
                                                <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <MaterialIcon name="medication" className="text-4xl text-primary/20" />
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-black text-slate-800 dark:text-white italic leading-tight">{item.product.name}</h4>
                                                    <span className="text-primary font-black text-lg italic tracking-tighter">R$ {parseFloat(item.price).toFixed(2)}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.product.category}</p>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <MaterialIcon name="store" className="text-[14px] text-primary" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black italic text-slate-700 dark:text-slate-200">{item.pharmacy.name}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {item.distance === Infinity ? 'Distância N/A' : `${item.distance.toFixed(1)} km`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddToCart(item.id)}
                                                    className="bg-primary text-background-dark size-8 rounded-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg shadow-primary/20"
                                                >
                                                    <MaterialIcon name="add" className="font-black" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <PromoCarousel />
                        <CategoryGrid />
                        <FeaturedPharmacies pharmacies={sortedPharmacies} />
                        <NearbyPharmacies pharmacies={sortedPharmacies} />
                    </>
                )}
            </main>
            <BottomNav session={session} />
        </div>
    );
};
