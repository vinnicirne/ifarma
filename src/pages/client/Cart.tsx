import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { NavigationDrawer } from '../../components/layout/NavigationDrawer';

export const Cart = ({ session }: { session: any }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (session) {
            fetchCartItems();
        }
    }, [session]);

    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase
            .channel(`cart_realtime_${session.user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'cart_items',
                filter: `customer_id=eq.${session.user.id}`
            }, () => {
                fetchCartItems();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    const fetchCartItems = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) return;

        console.log('🛒 Buscando itens do carrinho para:', currentSession.user.id);

        const { data, error } = await supabase
            .from('cart_items')
            .select('*, products(*, pharmacies(*))')
            .eq('customer_id', currentSession.user.id);

        if (error) {
            console.error("❌ Erro ao buscar carrinho:", error);
            return;
        }

        if (data) {
            console.log('✅ Itens encontrados:', data.length);
            // Filtrar apenas itens que têm produtos válidos (evita crash se RLS filtrar o produto)
            const validItems = data.filter(item => item.products);
            setCartItems(validItems);
            const t = validItems.reduce((acc, item) => acc + (Number(item.products.price) * item.quantity), 0);
            setTotal(t);
        }
    };

    const updateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) {
            await removeItem(itemId);
            return;
        }

        await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', itemId);

        fetchCartItems();
    };

    const removeItem = async (itemId: string) => {
        await supabase
            .from('cart_items')
            .delete()
            .eq('id', itemId);

        fetchCartItems();
    };

    const handleCheckout = () => {
        if (!session) {
            alert('Faça login para continuar');
            navigate('/login');
            return;
        }

        if (cartItems.length === 0) {
            alert('Seu carrinho está vazio');
            return;
        }

        navigate('/checkout');
    };

    if (!session) {
        return (
            <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto items-center justify-center bg-background-light dark:bg-background-dark">
                <MaterialIcon name="shopping_cart" className="text-6xl text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 font-bold">Faça login para ver seu carrinho</p>
                <button
                    onClick={() => navigate('/login')}
                    className="mt-6 bg-primary text-white px-6 py-3 rounded-full font-bold"
                >
                    Fazer Login
                </button>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-x-hidden pb-32 bg-background-light dark:bg-background-dark font-display text-[#0d1b13] dark:text-white antialiased">
            {/* TopAppBar */}
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => navigate(-1)} className="text-[#0d1b13] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer transition-colors hover:opacity-70">
                    <MaterialIcon name="arrow_back_ios" />
                </button>
                <h2 className="text-[#0d1b13] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-2">Meu Carrinho</h2>
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-[#0d1b13] dark:text-white transition-all active:scale-95"
                >
                    <MaterialIcon name="menu" className="text-2xl" />
                </button>
            </header>

            <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} session={session} />

            <main className="flex-1 flex flex-col gap-2 p-2">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <MaterialIcon name="shopping_cart" className="text-6xl text-slate-300 dark:text-slate-700 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400 font-bold mb-2">Seu carrinho está vazio</p>
                        <p className="text-slate-500 dark:text-slate-500 text-sm">Adicione produtos para continuar</p>
                        <Link
                            to="/"
                            className="mt-6 bg-primary text-white px-6 py-3 rounded-full font-bold flex items-center gap-2"
                        >
                            <MaterialIcon name="add_shopping_cart" />
                            Buscar Produtos
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Cart Items List */}
                        <div className="flex flex-col gap-1 mt-2">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-background-dark/40 rounded-xl px-4 min-h-[88px] py-3 justify-between shadow-sm">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="size-16 bg-slate-50 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-700 bg-center bg-no-repeat bg-cover">
                                            {item.products.image_url ? (
                                                <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <MaterialIcon name="medication" className="text-primary/20 text-3xl" />
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center flex-1">
                                            <p className="text-[#0d1b13] dark:text-white text-base font-semibold leading-tight line-clamp-1">{item.products.name}</p>
                                            <p className="text-[#4c9a6c] text-xs font-medium mt-1">{item.products.pharmacies?.name}</p>
                                            <p className="text-[#0d1b13] dark:text-gray-300 text-sm font-bold mt-1">R$ {Number(item.products.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2 bg-background-light dark:bg-gray-800 rounded-full px-2 py-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="size-6 flex items-center justify-center text-primary font-bold"
                                            >
                                                -
                                            </button>
                                            <span className="text-base font-bold w-6 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="size-6 flex items-center justify-center text-primary font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-500 text-xs font-bold"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add more items button */}
                        <div className="flex px-4 py-6 justify-center">
                            <Link to="/" className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-11 px-6 bg-primary/10 dark:bg-primary/20 text-[#0d1b13] dark:text-primary gap-2 text-sm font-bold leading-normal tracking-wide transition-colors hover:bg-primary/20">
                                <MaterialIcon name="add_circle" className="text-xl" />
                                <span className="truncate">Adicionar mais itens</span>
                            </Link>
                        </div>

                        {/* Order Summary */}
                        <div className="mt-4 mx-2 p-5 bg-white dark:bg-background-dark/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 px-1">Resumo do Pedido</h3>
                            <div className="flex justify-between gap-x-6 py-2 px-1">
                                <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Subtotal</p>
                                <p className="text-[#0d1b13] dark:text-white text-base font-semibold leading-normal text-right">R$ {total.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between gap-x-6 py-2 px-1">
                                <p className="text-gray-500 dark:text-gray-400 text-base font-medium leading-normal">Taxa de Entrega</p>
                                <p className="text-primary text-base font-semibold leading-normal text-right">GRÁTIS</p>
                            </div>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 my-3"></div>
                            <div className="flex justify-between gap-x-6 py-2 px-1">
                                <p className="text-[#0d1b13] dark:text-white text-lg font-bold leading-normal">Total</p>
                                <p className="text-[#0d1b13] dark:text-white text-xl font-bold leading-normal text-right">R$ {total.toFixed(2)}</p>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Sticky Bottom CTA */}
            {cartItems.length > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 z-40">
                    <button
                        onClick={handleCheckout}
                        disabled={loading}
                        className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-4 bg-primary text-black gap-3 text-base font-bold leading-normal tracking-wide shadow-2xl shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <span className="truncate">{loading ? 'Processando...' : 'Fechar Pedido'}</span>
                        <div className="flex items-center gap-2 border-l border-black/10 pl-3">
                            <span className="text-sm font-black">R$ {total.toFixed(2)}</span>
                            {!loading && <MaterialIcon name="arrow_forward" />}
                        </div>
                    </button>
                </div>
            )}

        </div>
    );
};
