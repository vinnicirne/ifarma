import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { MaterialIcon } from '../../components/Shared';
import { calculateDistance } from '../../lib/geoUtils';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../components/ToastProvider';

export const GlobalCategoryPage = ({ session, userLocation }: { session: any, userLocation: any }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryName, setCategoryName] = useState('');
    const { addToCart } = useCart();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchCategoryAndProducts = async () => {
            setLoading(true);
            try {
                // Fetch category name
                const { data: catData } = await supabase
                    .from('categories')
                    .select('name')
                    .eq('id', id)
                    .single();

                if (catData) {
                    setCategoryName(catData.name);

                    // Fetch products for this category across all approved pharmacies
                    const { data: prodData } = await supabase
                        .from('products')
                        .select(`
                            id,
                            name,
                            price,
                            description,
                            image_url,
                            category,
                            pharmacy_id,
                            pharmacies!inner (
                                id,
                                name,
                                latitude,
                                longitude,
                                status
                            )
                        `)
                        .eq('pharmacies.status', 'approved')
                        .ilike('category', catData.name);

                    if (prodData) {
                        const processed = prodData.map((item: any) => {
                            let distance = Infinity;
                            const referenceLoc = userLocation || { lat: -22.8269, lng: -43.0539 };
                            if (item.pharmacies?.latitude && item.pharmacies?.longitude) {
                                distance = calculateDistance(
                                    referenceLoc.lat,
                                    referenceLoc.lng,
                                    Number(item.pharmacies.latitude),
                                    Number(item.pharmacies.longitude)
                                );
                            }
                            return {
                                ...item,
                                distance
                            };
                        });

                        // Sort by distance then price
                        const sorted = processed.sort((a, b) => {
                            if (Math.abs(a.distance - b.distance) < 2) { // 2km tolerance for similar distance
                                return a.price - b.price;
                            }
                            return a.distance - b.distance;
                        });

                        setProducts(sorted);
                    }
                }
            } catch (error) {
                console.error("Error fetching category products:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCategoryAndProducts();
        }
    }, [id, userLocation]);

    const handleAddToCart = async (e: React.MouseEvent, productId: string, pharmacyId: string) => {
        e.stopPropagation();
        if (!session) {
            navigate('/login');
            return;
        }
        try {
            await addToCart(productId, pharmacyId);
            showToast('Produto adicionado ao carrinho! 🛒', 'success');
        } catch (error: any) {
            showToast(error.message || 'Erro ao adicionar ao carrinho', 'error');
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-white dark:bg-background-dark max-w-[480px] mx-auto shadow-xl">
            <TopAppBar session={session} userLocation={userLocation} onSearch={() => { }} />

            <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                        <MaterialIcon name="arrow_back" className="text-slate-600 dark:text-slate-200" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800 dark:text-white italic uppercase">{categoryName || 'Categoria'}</h1>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <MaterialIcon name="search_off" className="text-6xl mb-4" />
                        <p>Nenhum produto encontrado nesta categoria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => navigate(`/product/${product.id}`)}
                                className="bg-white dark:bg-[#1a2e23] p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex gap-4 cursor-pointer"
                            >
                                <div className="size-24 rounded-2xl bg-slate-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 overflow-hidden">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="medication" className="text-4xl text-primary/20" />
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-slate-800 dark:text-white italic leading-tight">{product.name}</h4>
                                            <span className="text-primary font-black text-lg italic tracking-tighter">R$ {product.price.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <MaterialIcon name="store" className="text-[10px] text-slate-400" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{product.pharmacies?.name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-white/5">
                                        <div className="flex items-center gap-1">
                                            <MaterialIcon name="place" className="text-[10px] text-primary" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {product.distance === Infinity ? 'N/A' : `${product.distance.toFixed(1)} km`}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => handleAddToCart(e, product.id, product.pharmacy_id)}
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
        </div>
    );
};
