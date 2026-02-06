import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFavorites } from '../hooks/useFavorites';

const MaterialIcon = ({ name, className = "", style = {} }: { name: string, className?: string, style?: React.CSSProperties }) => (
    <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

import { BottomNav } from '../components/layout/BottomNav';

const Favorites = ({ session }: { session: any }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'Medicamentos' | 'Farmácias'>('Medicamentos');
    const [favProductsData, setFavProductsData] = useState<any[]>([]);
    const [favPharmaciesData, setFavPharmaciesData] = useState<any[]>([]);

    const { favoriteProducts, favoritePharmacies, toggleProductFavorite, togglePharmacyFavorite, loading } = useFavorites(session?.user?.id);

    useEffect(() => {
        if (session?.user?.id) {
            fetchDetailedFavorites();
        }
    }, [favoriteProducts, favoritePharmacies, session]);

    const fetchDetailedFavorites = async () => {
        if (favoriteProducts.length > 0) {
            const { data } = await supabase
                .from('products')
                .select('*')
                .in('id', favoriteProducts);
            if (data) setFavProductsData(data);
        } else {
            setFavProductsData([]);
        }

        if (favoritePharmacies.length > 0) {
            const { data } = await supabase
                .from('pharmacies')
                .select('*')
                .in('id', favoritePharmacies);
            if (data) setFavPharmaciesData(data);
        } else {
            setFavPharmaciesData([]);
        }
    };

    const handleAddToCart = async (product: any) => {
        if (!session) {
            alert('Faça login para adicionar ao carrinho');
            return;
        }

        try {
            const { error } = await supabase
                .from('cart_items')
                .insert({
                    customer_id: session.user.id,
                    product_id: product.id,
                    quantity: 1
                });

            if (error) throw error;
            alert(`${product.name} adicionado ao carrinho!`);
        } catch (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            alert('Houve um erro ao adicionar o produto.');
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden max-w-[480px] mx-auto font-display transition-colors duration-200 pb-24">
            {/* TopAppBar */}
            <div className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer active:scale-95 transition-transform"
                >
                    <MaterialIcon name="chevron_left" />
                </button>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Meus Favoritos</h2>
                <div className="flex w-12 items-center justify-end">
                    <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-gray-900 dark:text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                        <MaterialIcon name="search" />
                    </button>
                </div>
            </div>

            {/* SegmentedButtons */}
            <div className="flex px-4 py-3">
                <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-gray-200 dark:bg-[#482329] p-1 relative">
                    <button
                        onClick={() => setActiveTab('Medicamentos')}
                        className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold leading-normal transition-all ${activeTab === 'Medicamentos' ? 'bg-white dark:bg-background-dark shadow-sm text-primary' : 'text-gray-600 dark:text-[#c9929b] hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <span className="truncate">Medicamentos</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('Farmácias')}
                        className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold leading-normal transition-all ${activeTab === 'Farmácias' ? 'bg-white dark:bg-background-dark shadow-sm text-primary' : 'text-gray-600 dark:text-[#c9929b] hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <span className="truncate">Farmácias</span>
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col gap-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
                        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                        <p>Buscando seus favoritos...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'Medicamentos' && (
                            favProductsData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <MaterialIcon name="heart_broken" className="text-6xl mb-4 opacity-20" />
                                    <p className="font-bold italic">Nenhum medicamento favoritado</p>
                                </div>
                            ) : (
                                favProductsData.map(product => (
                                    <div key={product.id} className="p-4 py-2">
                                        <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-[#33191e] p-4 shadow-sm border border-gray-100 dark:border-none hover:shadow-md transition-shadow">
                                            <div className="flex flex-[2_2_0px] flex-col justify-between">
                                                <div className="flex flex-col gap-1 relative">
                                                    <div className="absolute top-0 right-0">
                                                        <button
                                                            onClick={() => toggleProductFavorite(product.id)}
                                                            className="active:scale-90 transition-transform"
                                                        >
                                                            <MaterialIcon name="favorite" className="text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-500 dark:text-[#c9929b] text-xs font-medium uppercase tracking-wider">{product.category || 'Geral'}</p>
                                                    <p className="text-gray-900 dark:text-white text-base font-bold leading-tight pr-6">{product.name}</p>
                                                    <p className="text-primary text-lg font-bold leading-normal mt-1">R$ {parseFloat(product.price).toFixed(2)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddToCart(product)}
                                                    className="flex min-w-[120px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white gap-2 text-sm font-bold leading-normal w-fit mt-3 shadow-md shadow-primary/20 active:scale-95 transition-all hover:bg-primary/90"
                                                >
                                                    <MaterialIcon name="shopping_cart" className="!text-[18px]" />
                                                    <span className="truncate">Adicionar</span>
                                                </button>
                                            </div>
                                            <div
                                                className="w-32 h-32 bg-gray-50 dark:bg-[#221013] bg-center bg-no-repeat bg-contain rounded-lg shrink-0 border border-gray-100 dark:border-white/5"
                                                style={{ backgroundImage: `url(${product.image_url || 'https://via.placeholder.com/150'})` }}
                                            >
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        )}

                        {activeTab === 'Farmácias' && (
                            favPharmaciesData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <MaterialIcon name="store_off" className="text-6xl mb-4 opacity-20" />
                                    <p className="font-bold italic">Nenhuma farmácia favoritada</p>
                                </div>
                            ) : (
                                <>
                                    <div className="px-4 pt-4 pb-2">
                                        <h3 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2">
                                            Farmácias Salvas
                                            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{favPharmaciesData.length}</span>
                                        </h3>
                                    </div>
                                    {favPharmaciesData.map(pharma => (
                                        <div key={pharma.id} className="p-4 py-2">
                                            <Link
                                                to={`/pharmacy/${pharma.id}`}
                                                className="flex items-center gap-4 rounded-xl bg-white dark:bg-[#33191e] p-4 shadow-sm border border-gray-100 dark:border-none group cursor-pointer hover:bg-gray-50 dark:hover:bg-[#33191e]/80 transition-colors"
                                            >
                                                <div
                                                    className="size-14 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-100 shrink-0"
                                                    style={{ backgroundImage: `url(${pharma.logo_url || 'https://via.placeholder.com/50'})`, backgroundSize: 'cover' }}
                                                >
                                                </div>
                                                <div className="flex flex-col flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-gray-900 dark:text-white text-base font-bold leading-tight">{pharma.name}</p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                togglePharmacyFavorite(pharma.id);
                                                            }}
                                                            className="active:scale-90 transition-transform"
                                                        >
                                                            <MaterialIcon name="favorite" className="text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`flex items-center text-xs font-bold ${pharma.is_open ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'} px-2 py-0.5 rounded`}>
                                                            {pharma.is_open ? 'ABERTO' : 'FECHADO'}
                                                        </span>
                                                        <p className="text-gray-500 dark:text-[#c9929b] text-xs font-normal">{pharma.rating || '0.0'} • 25-35 min</p>
                                                    </div>
                                                </div>
                                                <MaterialIcon name="chevron_right" className="text-gray-400" />
                                            </Link>
                                        </div>
                                    ))}
                                </>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Bottom Navigation Bar */}
            <BottomNav session={session} />
        </div>
    );
};

export default Favorites;
