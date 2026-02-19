
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { useCart } from '../../hooks/useCart';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../components/ToastProvider';

export const PharmacyCategoryPage = ({ session }: { session: any }) => {
    const { id, categoryName } = useParams();
    const navigate = useNavigate();
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const { addToCart } = useCart();
    const { showToast } = useToast();

    const decodedCategoryName = decodeURIComponent(categoryName || '');

    const handleAddToCart = async (productId: string) => {
        if (!session?.user) {
            setIsLoginModalOpen(true);
            return;
        }

        try {
            await addToCart(productId, id || '');
            showToast('Produto adicionado ao carrinho! 🛒', 'success');
        } catch (error: any) {
            console.error("💥 Erro ao adicionar ao carrinho:", error);
            showToast(error.message || 'Erro ao adicionar produto', 'error');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !decodedCategoryName) return;
            setLoading(true);

            try {
                // Fetch Pharmacy Details
                const { data: pharmaData, error: pharmaError } = await supabase
                    .from('pharmacies')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (pharmaError) throw pharmaError;
                if (!pharmaData) throw new Error("Farmácia não encontrada");

                setPharmacy(pharmaData);

                // Fetch Category Products
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('pharmacy_id', id)
                    .eq('category', decodedCategoryName)
                    .eq('is_active', true);

                if (productsError) throw productsError;
                setProducts(productsData || []);

            } catch (err) {
                console.error("Error loading data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, decodedCategoryName]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full font-bold"></div>
            </div>
        );
    }

    if (!pharmacy) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900 text-slate-500">
                <MaterialIcon name="store_off" className="text-6xl mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Loja não encontrada</h2>
                <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold">Voltar</button>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto bg-slate-50 dark:bg-zinc-950 min-h-screen pb-10">
            <ConfirmModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onConfirm={() => navigate('/login')}
                title="Login Necessário 🔐"
                description="Para adicionar produtos ao carrinho e fazer pedidos, você precisa entrar na sua conta."
                confirmText="Fazer Login"
                cancelText="Agora não"
                type="info"
            />

            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center p-4 gap-4 max-w-lg mx-auto">
                    <button onClick={() => navigate(`/pharmacy/${id}`)} className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 active:scale-95 transition-transform">
                        <MaterialIcon name="arrow_back" className="text-slate-800 dark:text-white" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{decodedCategoryName}</h1>
                        <p className="text-xs text-slate-500 font-medium">{pharmacy.name}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="pt-24 px-4">
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <MaterialIcon name="search_off" className="text-6xl text-slate-200 dark:text-zinc-800 mb-4" />
                        <p className="text-slate-400 font-bold">Nenhum produto nesta categoria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {products.map((prod) => (
                            <div key={prod.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-zinc-800 group hover:border-primary/50 transition-all active:scale-[0.98]">
                                <Link to={`/product/${prod.id}`} className="block relative w-full aspect-square rounded-xl bg-slate-50 dark:bg-black/20 mb-3 overflow-hidden">
                                    {prod.image_url ? (
                                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <MaterialIcon name="medication" className="text-slate-200 dark:text-zinc-700 text-4xl" />
                                        </div>
                                    )}
                                    {/* Quick Add Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleAddToCart(prod.id);
                                        }}
                                        className="absolute bottom-2 right-2 size-8 bg-primary text-black rounded-lg flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                    >
                                        <MaterialIcon name="add" className="font-black text-lg" />
                                    </button>
                                </Link>

                                <div className="space-y-1">
                                    <Link to={`/product/${prod.id}`} className="text-xs font-bold line-clamp-2 text-slate-800 dark:text-white leading-tight h-8">
                                        {prod.name}
                                    </Link>
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-sm italic text-slate-900 dark:text-white">R$ {parseFloat(prod.price || '0').toFixed(2)}</p>
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
