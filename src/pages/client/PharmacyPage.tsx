import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';
import { useCart } from '../../hooks/useCart';
import { useNotifications } from '../../hooks/useNotifications';
import { NavigationDrawer } from '../../components/layout/NavigationDrawer';
import { ConfirmModal } from '../../components/ConfirmModal';

export const PharmacyPage = ({ session }: { session: any }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const { unreadCount: notificationCount } = useNotifications(session?.user?.id);
    const { addToCart } = useCart();

    const handleAddToCart = async (productId: string) => {
        if (!session?.user) {
            setIsLoginModalOpen(true);
            return;
        }

        try {
            await addToCart(productId, id || '');
            alert('Produto adicionado ao carrinho! 🛒');
        } catch (error: any) {
            console.error("Erro ao adicionar ao carrinho:", error);
            alert(`Erro: ${error.message}`);
        }
    };

    // ... (rest of the component)

    useEffect(() => {
        const fetchPharmacyData = async () => {
            if (!id) return;
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

                // Fetch Pharmacy Products
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('pharmacy_id', id)
                    .eq('is_active', true);

                if (!productsError) {
                    setProducts(productsData || []);
                }
            } catch (err) {
                console.error("Error loading pharmacy:", err);
                // navigate('/'); // Removido para evitar loop se falhar
            } finally {
                setLoading(false);
            }
        };

        fetchPharmacyData();
    }, [id]);

    const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

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

    const getStatusInfo = () => {
        try {
            // Safe Defaults
            const defaultClosed = { text: 'Fechado', color: 'bg-red-500/20 text-red-500', isUrgent: false };
            const defaultOpen = { text: 'Aberto', color: 'bg-green-500/20 text-green-500', isUrgent: false };

            // Manual Override Check
            if (pharmacy.is_open === false) return defaultClosed;
            if (pharmacy.is_open === true) return defaultOpen;

            // Auto Status Logic
            if (pharmacy.auto_open_status && Array.isArray(pharmacy.opening_hours) && pharmacy.opening_hours.length > 0) {
                const now = new Date();
                const currentDay = now.getDay();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                const todayRule = pharmacy.opening_hours.find((h: any) => h && h.day === currentDay);

                if (todayRule && !todayRule.closed && todayRule.open && todayRule.close) {
                    const parseTime = (t: any) => {
                        if (!t || typeof t !== 'string') return 0;
                        const [h, m] = t.split(':').map(Number);
                        return (h || 0) * 60 + (m || 0);
                    };

                    const openTime = parseTime(todayRule.open);
                    const closeTime = parseTime(todayRule.close);

                    if (currentTime >= openTime && currentTime < closeTime) {
                        const diff = closeTime - currentTime;
                        if (diff <= 60) {
                            return {
                                text: `Fecha em ${diff} min`,
                                subText: `Corre! Fecha às ${todayRule.close}`,
                                color: 'bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/20',
                                isUrgent: true
                            };
                        }
                        return {
                            text: `Aberto até ${todayRule.close}`,
                            subText: 'Aceitando Pedidos',
                            color: 'bg-primary/10 text-primary border border-primary/20',
                            isUrgent: false
                        };
                    }

                    if (currentTime < openTime) {
                        return { text: `Abre às ${todayRule.open}`, color: 'bg-blue-500/20 text-blue-500', isUrgent: false };
                    }
                }

                // Next day logic omitted for safety/brevity to fix crash
                // return defaultClosed; 
            }

            return pharmacy.is_open ? defaultOpen : defaultClosed;
        } catch (e) {
            console.error("Error calculating status:", e);
            return { text: 'Status Indisponível', color: 'bg-slate-200 text-slate-500', isUrgent: false };
        }
    };

    const status = getStatusInfo();

    // Safe Address Render
    const renderAddress = () => {
        if (!pharmacy.address) return 'Endereço não informado';
        if (typeof pharmacy.address === 'string') return pharmacy.address;
        return typeof pharmacy.address === 'object' ?
            `${pharmacy.address.street || ''}, ${pharmacy.address.number || ''}` :
            'Endereço inválido';
    };

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
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 active:scale-95 transition-transform">
                        <MaterialIcon name="arrow_back" className="text-slate-800 dark:text-white" />
                    </button>
                    <div className="flex gap-2">
                        <Link to="/notifications" className="relative flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 active:scale-95 transition-transform">
                            <MaterialIcon name="notifications" className="text-slate-800 dark:text-white" />
                            {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-pulse">
                                    {notificationCount}
                                </span>
                            )}
                        </Link>
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 active:scale-95 transition-transform"
                        >
                            <MaterialIcon name="menu" className="text-slate-800 dark:text-white" />
                        </button>
                    </div>
                </div>
            </div>

            <NavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} session={session} />

            {/* Header Image & Profile Overlay */}
            <div className="relative w-full mt-16">
                <div className="w-full h-48 bg-center bg-cover bg-slate-200"
                    style={{ backgroundImage: pharmacy.banner_url ? `url(${pharmacy.banner_url})` : undefined }}>
                    {!pharmacy.banner_url && <div className="w-full h-full bg-slate-200 dark:bg-zinc-800" />}
                </div>
                <div className="absolute -bottom-10 left-4">
                    <div className="size-20 rounded-2xl bg-white dark:bg-zinc-900 p-1 shadow-lg overflow-hidden border-2 border-white dark:border-zinc-800">
                        <div className="w-full h-full bg-center bg-cover rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                            {pharmacy.logo_url ? (
                                <img src={pharmacy.logo_url} alt={pharmacy.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            ) : (
                                <span className="text-2xl font-black text-primary italic">{pharmacy.name?.charAt(0) || '?'}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Information */}
            <div className="pt-12 px-4">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">{pharmacy.name}</h1>
                        <div className="flex items-center gap-1 mt-1">
                            <MaterialIcon name="star" className="text-yellow-400 text-sm" fill />
                            <span className="text-xs font-bold text-slate-800 dark:text-white">{pharmacy.rating || '5.0'}</span>
                            <span className="text-[10px] text-slate-500 ml-1">• {renderAddress()}</span>
                        </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-xl flex flex-col items-center justify-center min-w-[80px] ${status.color}`}>
                        <span className={`font-black text-[9px] uppercase tracking-widest ${status.isUrgent ? 'animate-pulse' : ''}`}>{status.text}</span>
                    </div>
                </div>

                {/* Search in Store */}
                <div className="mt-6 mb-4">
                    <div className="flex items-center rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 h-12 px-4 gap-2 focus-within:border-primary transition-colors">
                        <MaterialIcon name="search" className="text-slate-400" />
                        <input
                            className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder:text-slate-400 text-sm font-medium"
                            placeholder={`Buscar em ${pharmacy.name}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-4 -mx-4 px-4">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                if (cat === 'Todos') {
                                    setActiveCategory('Todos');
                                } else {
                                    navigate(`/pharmacy/${id}/category/${encodeURIComponent(cat)}`);
                                }
                            }}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeCategory === cat ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="px-4 pb-4">
                <h3 className="text-base font-black italic mb-3 text-slate-900 dark:text-white opacity-80">
                    {searchQuery ? `Resultados para "${searchQuery}"` : "Destaques"}
                </h3>

                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                        <MaterialIcon name="search_off" className="text-4xl text-slate-300 mb-2" />
                        <p className="text-sm font-bold text-slate-400">Nenhum produto encontrado</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map((prod) => (
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
                                    
                                    {/* Tag Genérico */}
                                    {prod.is_generic && (
                                        <div className="inline-block">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-black uppercase bg-orange-500 text-white shadow-sm animate-pulse">
                                                GENÉRICO
                                            </span>
                                        </div>
                                    )}
                                    
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
