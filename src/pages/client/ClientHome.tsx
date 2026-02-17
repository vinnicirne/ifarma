import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { useCartCount } from '../../hooks/useCartCount';
import { useCart } from '../../hooks/useCart';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// --- Shared Helper for Distance ---
import { calculateDistance } from '../../lib/geoUtils';

// --- Subcomponents for Home ---

import {
    PromoCarousel,
    InternalAdCarousel,
    CategoryGrid,
    FeaturedPharmacies,
    SpecialHighlights,
    NearbyPharmacies,
    HomeSkeleton
} from '../../components/client/home/HomeComponents';
import { rankPharmaciesIfoodStyle } from '../../lib/ranking';

export const ClientHome = ({ userLocation, sortedPharmacies, session }: { userLocation: { lat: number, lng: number } | null, sortedPharmacies: any[], session: any }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [feedSections, setFeedSections] = useState<any[]>([]);
    const [loadingFeed, setLoadingFeed] = useState(true);
    const cartCount = useCartCount(session?.user?.id);

    // --- FALLBACK SYSTEM (Resilience) ---
    const [fallbackPharmacies, setFallbackPharmacies] = useState<any[]>([]);
    const [fallbackTried, setFallbackTried] = useState(false);

    // Decide qual lista usar: props (do App.tsx) ou fallback (local)
    // Se sortedPharmacies vier vazio (erro do pai/anon), usa fallback
    // --- RANQUEAMENTO CONSISTENTE (iFood Style) ---
    // Import dinâmico da função de ranking seria ideal, mas para simplificar vamos assumir que está importada
    // ou movemos a lógica para cá. Como o usuário pediu src/lib/ranking.ts, vamos importar.
    // Mas imports devem ser no topo. Vou adicionar o import no topo em outro passo ou usar require.
    // Melhor: adicionar o import no topo e usar aqui.

    const pharmaciesToUseRaw = (Array.isArray(sortedPharmacies) && sortedPharmacies.length > 0)
        ? sortedPharmacies
        : fallbackPharmacies;

    // Aplica ranking consistente
    const pharmaciesToUse = useMemo(() => {
        // Se já vier ranqueado do pai, usamos (mas o pai tem random).
        // O usuário pediu para aplicar o MESMO ranking.
        // Mas sortedPharmacies vem via props.
        // Se eu re-ranquear aqui, perco o trabalho do pai?
        // O usuário disse: "E use também na lista final (pra garantir consistência)"
        return rankPharmaciesIfoodStyle(pharmaciesToUseRaw, userLocation);
    }, [pharmaciesToUseRaw, userLocation]);

    // STABILITY FIX (iFood-style): Prevent re-ordering during load/render
    const pharmaciesStable = useMemo(() => {
        if (!pharmaciesToUse || pharmaciesToUse.length === 0) return [];
        return pharmaciesToUse;
    }, [pharmaciesToUse]);

    useEffect(() => {
        const loadFallback = async () => {
            // Se já tem dados do pai OU já tentou o fallback, para por aqui
            if ((Array.isArray(sortedPharmacies) && sortedPharmacies.length > 0) || fallbackTried) return;

            setFallbackTried(true);
            try {
                // Usa nosso Service robusto
                const { PharmacyService } = await import('../../services/pharmacy.service');
                const data = await PharmacyService.getApproved();
                if (data && data.length > 0) {
                    console.log('✅ ClientHome: Fallback ativado com sucesso. Farmácias:', data.length);
                    setFallbackPharmacies(data);
                }
            } catch (err) {
                console.error('❌ ClientHome: Erro no fallback de farmácias:', err);
            }
        };

        loadFallback();
    }, [sortedPharmacies, fallbackTried]); // Re-executa se sortedPharmacies mudar (ex: login)

    const { addToCart } = useCart();

    // Fetch Feed Configuration & Handle AdMob Position
    useEffect(() => {
        const fetchFeed = async () => {
            const { data, error } = await supabase
                .from('app_feed_sections')
                .select('*')
                .eq('is_active', true)
                .order('position', { ascending: true });

            const { data: settingsData } = await supabase
                .from('system_settings')
                .select('*');

            if (data && data.length > 0) {
                // Prevenir duplicatas de tipo no frontend por segurança
                const uniqueSections = data.reduce((acc: any[], current: any) => {
                    const x = acc.find(item => item.type === current.type);
                    if (!x) return acc.concat([current]);
                    else return acc;
                }, []);

                setFeedSections(uniqueSections);
                const settingsMap: any = {};
                settingsData?.forEach(s => settingsMap[s.key] = s.value);
                handleAdMob(uniqueSections, settingsMap);
            }
            setLoadingFeed(false);
        };

        const handleAdMob = async (feedData: any[], _settings: any) => {
            if (!Capacitor.isNativePlatform()) {
                if (import.meta.env.DEV) console.log('📱 AdMob: Web detectado - anúncios só aparecem no app nativo (APK)');
                return;
            }

            try {
                const { initializeAdMob, showBanner, hideBanner, getAdMobStatus } = await import('../../lib/adMob');
                await initializeAdMob();

                const admobSection = feedData.find(s => s.type === 'admob.banner');
                if (admobSection && admobSection.is_active) {
                    const index = feedData.findIndex(s => s.type === 'admob.banner');
                    const position = index === 0 ? 'TOP_CENTER' : 'BOTTOM_CENTER';
                    await showBanner(position as 'TOP_CENTER' | 'BOTTOM_CENTER');
                    if (import.meta.env.DEV) console.log('📺 AdMob: Banner solicitado', getAdMobStatus());
                } else {
                    await hideBanner();
                    if (import.meta.env.DEV && !admobSection) console.log('📺 AdMob: Seção admob.banner não encontrada no feed');
                }
            } catch (e) {
                console.error('AdMob Execution Error:', e);
            }
        };

        fetchFeed();

        // Realtime Updates
        const channel = supabase.channel('feed_updates_home')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feed_sections' }, () => {
                fetchFeed();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (Capacitor.isNativePlatform()) AdMob.hideBanner().catch(() => { });
        };
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
          is_generic,
          dosage,
          quantity_label,
          principle_active,
          tags,
          synonyms,
          control_level,
          usage_instructions,
          brand,
          stock,
          requires_prescription,
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
                return <PromoCarousel key={section.id} config={section.config || {}} />;
            case 'ads.internal':
                return <InternalAdCarousel key={section.id} region="global" />;
            case 'category_grid':
                return <CategoryGrid key={section.id} config={section.config || {}} title={section.title} />;
            case 'pharmacy_list.featured':
                return <FeaturedPharmacies key={section.id} pharmacies={pharmaciesToUse} config={section.config || {}} title={section.title} />;
            case 'pharmacy_list.bonus':
                return <SpecialHighlights key={section.id} pharmacies={pharmaciesToUse} config={section.config || {}} title={section.title} />;
            case 'pharmacy_list.nearby':
                return <NearbyPharmacies key={section.id} pharmacies={pharmaciesToUse} config={section.config || {}} title={section.title} />;
            case 'admob.banner':
                // No app nativo: banner overlay. No web: placeholder explicativo em DEV
                if (import.meta.env.DEV && !Capacitor.isNativePlatform()) {
                    return (
                        <div key={section.id} className="mx-4 my-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
                                📱 Anúncios aparecem apenas no app (APK)
                            </p>
                        </div>
                    );
                }
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden max-w-[480px] mx-auto shadow-xl bg-[#0d161b]">
            <TopAppBar
                onSearch={setSearchQuery}
                userLocation={userLocation}
                session={session}
            />

            <main className="flex-1 pb-10">
                {searchQuery.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        <div className="px-8 py-4">
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
                        </div>

                        {searchResults.length === 0 && !isSearching ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <MaterialIcon name="search_off" className="text-6xl mb-4 opacity-20" />
                                <p className="font-bold italic">Nenhum produto encontrado</p>
                                <p className="text-xs opacity-60">Tente buscar por termos mais genéricos</p>
                            </div>
                        ) : (
                            <div className="px-4 grid grid-cols-1 gap-4">
                                {searchResults.map((item, i) => (
                                    <div key={i} className="bg-white dark:bg-[#1a2e23] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex gap-4">
                                        <div className="size-24 rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden">
                                            {item.product.image_url ? (
                                                <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <MaterialIcon name="medication" className="text-4xl text-primary/20" />
                                            )}
                                            {item.is_generic && (
                                                <div className="absolute top-1 left-1 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-lg z-10 animate-pulse">
                                                    GENÉRICO
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-black text-slate-800 dark:text-white italic leading-tight">{item.product.name}</h4>
                                                    <span className="text-primary font-black text-lg italic tracking-tighter">R$ {parseFloat(item.price).toFixed(2)}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.product.category}</p>
                                                
                                                {/* Informações adicionais do produto */}
                                                {item.brand && (
                                                    <p className="text-[9px] text-slate-500 font-medium mt-1">Marca: {item.brand}</p>
                                                )}
                                                {item.dosage && (
                                                    <p className="text-[9px] text-slate-500 font-medium">Dosagem: {item.dosage}</p>
                                                )}
                                                {item.quantity_label && (
                                                    <p className="text-[9px] text-slate-500 font-medium">Embalagem: {item.quantity_label}</p>
                                                )}
                                                {item.principle_active && item.principle_active.length > 0 && (
                                                    <p className="text-[9px] text-slate-500 font-medium">Princípio Ativo: {Array.isArray(item.principle_active) ? item.principle_active.join(', ') : item.principle_active}</p>
                                                )}
                                                {item.requires_prescription && (
                                                    <div className="inline-flex items-center gap-1 mt-2">
                                                        <MaterialIcon name="medical_services" className="text-red-500 text-xs" />
                                                        <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">Receita Obrigatória</span>
                                                    </div>
                                                )}
                                                {item.control_level && item.control_level !== 'none' && (
                                                    <div className="inline-flex items-center gap-1 mt-1">
                                                        <MaterialIcon name="warning" className="text-amber-500 text-xs" />
                                                        <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest">
                                                            {item.control_level === 'controlled_yellow' ? 'Receita Amarela' : 
                                                             item.control_level === 'controlled_blue' ? 'Receita Azul' : 
                                                             item.control_level === 'prescription_only' ? 'Venda sob Prescrição' : 'Controle Especial'}
                                                        </span>
                                                    </div>
                                                )}
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
                            <HomeSkeleton />
                        ) : feedSections.length > 0 ? (
                            <>
                                {feedSections.map(section => renderFeedSection(section))}
                                {feedSections.every(s => s.type !== 'pharmacy_list.nearby') && (
                                    <NearbyPharmacies pharmacies={pharmaciesStable} />
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col gap-6 pb-20">
                                <PromoCarousel />
                                <MaterialIcon name="wifi_off" className="text-5xl text-slate-200 mb-4" />
                                <h3 className="text-slate-500 font-bold">Nenhuma farmácia encontrada</h3>
                                <p className="text-xs text-slate-400 mt-2 max-w-[200px]">
                                    Verifique sua conexão ou tente novamente.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-6 px-6 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};
