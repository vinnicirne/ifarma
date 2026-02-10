import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { BottomNav } from '../../components/layout/BottomNav';
import { useCartCount } from '../../hooks/useCartCount';
import { useCart } from '../../hooks/useCart';
import { AdMobBanner } from '../../components/AdMobBanner';


// --- Shared Helper for Distance ---
import { calculateDistance } from '../../lib/geoUtils';

// --- Subcomponents for Home ---

import {
    PromoCarousel,
    CategoryGrid,
    FeaturedPharmacies,
    SpecialHighlights,
    NearbyPharmacies
} from '../../components/client/home/HomeComponents';

export const ClientHome = ({ userLocation, sortedPharmacies, session }: { userLocation: { lat: number, lng: number } | null, sortedPharmacies: any[], session: any }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [feedSections, setFeedSections] = useState<any[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(true);
    const cartCount = useCartCount(session?.user?.id);

    const { addToCart } = useCart();

    // Fetch Feed Configuration
    useEffect(() => {
        const fetchFeed = async () => {
            const { data, error } = await supabase
                .from('app_feed_sections')
                .select('*')
                .eq('is_active', true)
                .order('position', { ascending: true });

            if (data && data.length > 0) {
                setFeedSections(data);
            }
            setLoadingFeed(false);
        };
        fetchFeed();
    }, []);

    const handleAddToCart = async (productId: string) => {
        if (!session) {
            navigate('/login');
            return;
        }

        try {
            // Find item in search results
            const item = searchResults.find(r => r.id === productId);
            const pharmacyId = item?.pharmacy_id;

            await addToCart(productId, pharmacyId || '');
            alert('Produto adicionado ao carrinho! 🛒');
        } catch (error: any) {
            console.error("💥 Erro ao adicionar ao carrinho:", error);
            alert(`Erro: ${error.message}`);
        }
    };


    // ... (Keep existing search logic useEffect) ...
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
                        product: { name: item.name, category: item.category, image_url: item.image_url },
                        distance
                    };
                });

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

    const renderFeedSection = (section: any) => {
        switch (section.type) {
            case 'banner.top':
                return <PromoCarousel key={section.id} />;
            case 'category_grid':
                return <CategoryGrid key={section.id} />;
            case 'pharmacy_list.featured':
                return <FeaturedPharmacies key={section.id} pharmacies={sortedPharmacies} />;
            case 'pharmacy_list.bonus':
                return <SpecialHighlights key={section.id} pharmacies={sortedPharmacies} />;
            case 'pharmacy_list.nearby':
                return <NearbyPharmacies key={section.id} pharmacies={sortedPharmacies} />;
            default:
                return null;
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-[480px] mx-auto shadow-xl bg-white dark:bg-background-dark">
            <TopAppBar
                onSearch={setSearchQuery}
                userLocation={userLocation}
                session={session}
            />
            <AdMobBanner />


            <main className="flex-1 pb-32">
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
                        {loadingFeed ? (
                            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                        ) : feedSections.length > 0 ? (
                            feedSections.map(section => renderFeedSection(section))
                        ) : (
                            // Fallback se não configurado
                            <>
                                <PromoCarousel />
                                <CategoryGrid />
                                <FeaturedPharmacies pharmacies={sortedPharmacies} />
                                <SpecialHighlights pharmacies={sortedPharmacies} />
                                <NearbyPharmacies pharmacies={sortedPharmacies} />
                            </>
                        )}
                    </>
                )}
            </main>
            <BottomNav session={session} />
        </div>
    );
};
