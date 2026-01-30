import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const PharmacyPage = ({ session }: { session: any }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [cartCount, setCartCount] = useState(0);

    // Initial cart count fetch (simplified, usually centralized in context/hook)
    useEffect(() => {
        if (session?.user?.id) {
            // logic to fetch cart count
            // For now, ignoring live update in this component unless we use the useCartCount hook
            // But we need to import it or recreate it.
        }
    }, [session]);


    const addToCart = async (productId: string, quantity: number = 1) => {
        if (!session) {
            navigate('/login');
            return;
        }
        try {
            const { data: existing } = await supabase
                .from('cart_items')
                .select('id, quantity')
                .eq('customer_id', session.user.id)
                .eq('product_id', productId)
                .single();

            if (existing) {
                await supabase
                    .from('cart_items')
                    .update({ quantity: existing.quantity + quantity })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('cart_items')
                    .insert({
                        customer_id: session.user.id,
                        product_id: productId,
                        quantity
                    });
            }
            alert('Produto adicionado ao carrinho! 🛒');
        } catch (error) {
            console.error("Error adding to cart:", error);
            alert('Erro ao adicionar ao carrinho.');
        }
    };

    useEffect(() => {
        const fetchPharmacyData = async () => {
            if (!id) return;
            setLoading(true);

            // Fetch Pharmacy Details
            const { data: pharmaData, error: pharmaError } = await supabase
                .from('pharmacies')
                .select('*')
                .eq('id', id)
                .single();

            if (pharmaError) {
                console.error("Error fetching pharmacy:", pharmaError);
                navigate('/');
                return;
            }
            setPharmacy(pharmaData);

            // Fetch Pharmacy Products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .eq('pharmacy_id', id)
                .eq('is_active', true);

            if (productsError) {
                console.error("Error fetching products:", productsError);
            } else {
                setProducts(productsData || []);
            }
            setLoading(false);
        };

        fetchPharmacyData();
    }, [id, navigate]);

    const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-background-dark flex items-center justify-center">
                <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full font-bold"></div>
            </div>
        );
    }

    if (!pharmacy) return null;

    return (
        <div className="max-w-lg mx-auto bg-background-light dark:bg-background-dark min-h-screen pb-32">
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
                        <MaterialIcon name="arrow_back" className="text-[#0d1b13] dark:text-white" />
                    </button>
                    <div className="flex gap-2">
                        <button className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
                            <MaterialIcon name="share" className="text-[#0d1b13] dark:text-white" />
                        </button>
                        <button className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
                            <MaterialIcon name="favorite" className="text-[#0d1b13] dark:text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Header Image & Profile Overlay */}
            <div className="relative w-full">
                <div className="w-full h-56 bg-center bg-cover bg-slate-200"
                    style={{ backgroundImage: pharmacy.banner_url ? `url(${pharmacy.banner_url})` : 'url("https://images.unsplash.com/photo-1586024492967-142e6b8066e7?auto=format&fit=crop&q=80&w=800")' }}>
                </div>
                <div className="absolute -bottom-12 left-4">
                    <div className="size-24 rounded-2xl bg-white p-1 shadow-lg overflow-hidden border-2 border-white">
                        <div className="w-full h-full bg-center bg-cover rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                            {pharmacy.logo_url ? (
                                <img src={pharmacy.logo_url} alt={pharmacy.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-black text-primary italic">{pharmacy.name.charAt(0)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Information */}
            <div className="pt-16 px-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#0d1b13] dark:text-white font-display italic">{pharmacy.name}</h1>
                        <div className="flex items-center gap-1 mt-1">
                            <MaterialIcon name="star" className="text-yellow-400 text-lg" fill />
                            <span className="text-sm font-bold text-[#0d1b13] dark:text-white">{pharmacy.rating || '5.0'}</span>
                            <span className="text-sm text-zinc-500">(Novo Parceiro)</span>
                        </div>
                    </div>
                    <div className="bg-primary/20 px-3 py-1 rounded-full">
                        <span className="text-primary font-bold text-xs uppercase tracking-wider">Aberto</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-zinc-500">
                    <MaterialIcon name="location_on" className="text-sm" />
                    <p className="text-sm line-clamp-1">{pharmacy.address || 'Endereço não informado'}</p>
                </div>
            </div>

            {/* Sticky Interaction Section */}
            <div className="sticky top-16 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm pt-4">
                {/* Search Bar */}
                <div className="px-4">
                    <label className="flex flex-col w-full">
                        <div className="flex items-center rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 h-12">
                            <div className="text-zinc-400 flex items-center justify-center pl-4">
                                <MaterialIcon name="search" />
                            </div>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-[#0d1b13] dark:text-white placeholder:text-zinc-400 px-3 text-base"
                                placeholder="Buscar nesta loja"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </label>
                </div>
                {/* Categories Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-4">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-primary text-black' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="px-4 mt-2">
                <h3 className="text-lg font-black italic mb-4 text-[#0d1b13] dark:text-white">Cardápio de Produtos</h3>
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-bold italic">Nenhum produto encontrado</div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredProducts.map((prod) => (
                            <div key={prod.id} className="bg-white dark:bg-zinc-800 rounded-2xl p-3 shadow-sm border border-zinc-100 dark:border-zinc-700 group hover:border-primary/50 transition-colors">
                                <Link to={`/product/${prod.id}`} className="block relative w-full aspect-square rounded-xl bg-zinc-50 dark:bg-zinc-900 mb-3 overflow-hidden">
                                    {prod.image_url ? (
                                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <MaterialIcon name="medication" className="text-zinc-200 dark:text-zinc-700 text-5xl" />
                                        </div>
                                    )}
                                    {prod.promo_price && (
                                        <div className="absolute top-2 left-2 bg-primary text-black text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">OFF</div>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            addToCart(prod.id);
                                        }}
                                        className="absolute bottom-2 right-2 size-8 bg-primary rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-95 hover:scale-110"
                                    >
                                        <MaterialIcon name="add" className="text-black font-black" />
                                    </button>
                                </Link>
                                <Link to={`/product/${prod.id}`} className="text-xs font-bold line-clamp-2 min-h-[2.5rem] hover:text-primary transition-colors text-slate-800 dark:text-white leading-tight">{prod.name}</Link>
                                <div className="mt-2 flex flex-col">
                                    {prod.promo_price ? (
                                        <>
                                            <span className="text-[10px] text-slate-400 line-through">R$ {parseFloat(prod.price).toFixed(2)}</span>
                                            <span className="text-primary font-black text-lg italic tracking-tighter">R$ {parseFloat(prod.promo_price).toFixed(2)}</span>
                                        </>
                                    ) : (
                                        <span className="text-slate-800 dark:text-white font-black text-lg italic tracking-tighter">R$ {parseFloat(prod.price).toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Bottom Nav */}
            <div className="fixed bottom-6 left-4 right-4 z-50 max-w-lg mx-auto">
                <div className="bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-full px-6 py-4 flex items-center justify-between shadow-2xl border border-white/10 ring-1 ring-white/5">
                    <Link to="/" className="flex flex-col items-center text-zinc-400 hover:text-primary transition-colors">
                        <MaterialIcon name="storefront" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Shop</span>
                    </Link>
                    <Link to="/cart" className="flex flex-col items-center relative text-primary hover:scale-110 transition-transform">
                        <div className="bg-primary size-5 rounded-full absolute -top-2 -right-2 flex items-center justify-center border-2 border-zinc-900">
                            {/* Note: In real app, re-use useCartCount here */}
                            <span className="text-[10px] text-black font-black font-sans">{localStorage.getItem('cart_count') || '0'}</span>
                        </div>
                        <MaterialIcon name="shopping_cart" fill />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Cart</span>
                    </Link>
                    <Link to="/order-tracking" className="flex flex-col items-center text-zinc-400 hover:text-primary transition-colors">
                        <MaterialIcon name="receipt_long" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Orders</span>
                    </Link>
                    <Link to="/profile" className="flex flex-col items-center text-zinc-400 hover:text-primary transition-colors">
                        <MaterialIcon name="person" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Profile</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};
