import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { useCart } from '../../hooks/useCart';

export const ProductPage = ({ session }: { session: any }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);

    const { addToCart: addToCartHook } = useCart();

    const handleAddToCart = async () => {
        if (!session) {
            navigate('/login');
            return;
        }

        try {
            await addToCartHook(product.id, product.pharmacy_id, qty);
            alert('Produto adicionado ao carrinho! 🛒');
            navigate('/cart');
        } catch (error: any) {
            console.error("Erro ao adicionar ao carrinho:", error);
            alert(`Erro: ${error.message}`);
        }
    };

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          pharmacy:pharmacies(name)
        `)
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching product:", error);
                navigate(-1);
                return;
            }
            setProduct(data);
            setLoading(false);
        };
        fetchProduct();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full font-bold"></div>
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-white dark:bg-background-dark pb-32">
            <div className="relative h-64 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-12 overflow-hidden">
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 size-10 bg-white/90 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg z-10 text-slate-800 dark:text-white">
                    <MaterialIcon name="arrow_back" />
                </button>

                {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain relative z-10" />
                ) : (
                    <MaterialIcon name="medication" className="text-primary text-[120px] opacity-20 relative z-10" />
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-background-dark/20 opacity-40"></div>
            </div>

            <div className="px-6 -mt-6 relative z-10">
                <div className="flex flex-col gap-2">
                    {product.requires_prescription && (
                        <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full self-start flex items-center gap-1 shadow-sm">
                            <MaterialIcon name="description" className="text-[12px]" /> EXIGE RECEITA MÉDICA
                        </span>
                    )}
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white mt-2 font-display italic leading-tight">{product.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{product.category || 'Geral'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-primary font-bold text-xs uppercase tracking-widest">{product.pharmacy?.name}</span>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-display">Descrição Detalhada</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                        {product.description || 'Nenhuma descrição disponível para este produto.'}
                    </p>
                </div>

                <div className="mt-10 flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-[32px] border border-slate-100 dark:border-white/5">
                    <div className="flex flex-col">
                        {product.promo_price ? (
                            <>
                                <span className="text-slate-400 text-[10px] line-through font-bold">R$ {parseFloat(product.price).toFixed(2)}</span>
                                <span className="text-3xl font-black text-primary italic tracking-tighter">R$ {parseFloat(product.promo_price).toFixed(2)}</span>
                            </>
                        ) : (
                            <span className="text-3xl font-black text-slate-800 dark:text-white italic tracking-tighter">R$ {parseFloat(product.price).toFixed(2)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                        <button onClick={() => setQty(Math.max(1, qty - 1))} className="size-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center font-black text-lg transition-colors">-</button>
                        <span className="font-black text-xl text-slate-800 dark:text-white tabular-nums w-6 text-center">{qty}</span>
                        <button onClick={() => setQty(qty + 1)} className="size-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center font-black text-xl text-primary transition-colors">+</button>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-slate-100 dark:border-white/10 p-5 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex flex-col gap-3">
                    {product.requires_prescription && (
                        <button
                            onClick={() => !session ? navigate('/login') : navigate('/prescription-upload')}
                            className="flex w-full items-center justify-center gap-2 h-14 rounded-3xl border-2 border-primary bg-transparent text-primary font-black text-sm uppercase tracking-widest transition-all active:scale-95 hover:bg-primary/5"
                        >
                            <MaterialIcon name="photo_camera" /> Enviar Receita
                        </button>
                    )}
                    <button
                        onClick={handleAddToCart}
                        className="flex w-full items-center justify-center gap-2 h-14 rounded-3xl bg-primary text-background-dark font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 hover:scale-[1.02]"
                    >
                        <MaterialIcon name="shopping_cart" /> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    );
};
