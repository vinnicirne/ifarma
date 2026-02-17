import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { isUuid } from '../../lib/uuidUtils';
import { Toast } from '../../components/Toast';

const formatCurrency = (value: string | number) => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const parseCurrency = (value: string) => {
    return value.replace(/\D/g, '')
        .replace(/(\d)(\d{2})$/, '$1,$2')
        .replace(/(?=(\d{3})+(\D))\B/g, '.');
};

const MaterialIcon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface Product {
    id: string;
    name: string;
    brand: string;
    stock: number;
    price: number;
    original_price?: number;
    promo_price?: number;
    sku?: string;
    ean?: string;
    image_url?: string;
    status: string;
    category?: string;
    requires_prescription: boolean;
    is_active: boolean;
}

interface CatalogItem {
    id: string;
    name: string;
    brand: string;
    category: string;
    requires_prescription: boolean;
    ean?: string;
    image_url?: string;
}

const InventoryControl = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        let pharmacyId = null;
        const impersonatedId = localStorage.getItem('impersonatedPharmacyId');

        if (impersonatedId && isUuid(impersonatedId)) {
            console.log('🎭 Admin visualizando farmácia:', impersonatedId);
            pharmacyId = impersonatedId;
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('pharmacy_id')
                .eq('id', user.id)
                .single();

            pharmacyId = profile?.pharmacy_id;
        }

        if (pharmacyId) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('pharmacy_id', pharmacyId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setProducts(data);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };



    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir este produto permanentemente?')) return;

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            fetchProducts();
            showToast('Produto excluído.', 'success');
        }
        else showToast('Erro ao excluir: ' + error.message, 'error');
    };

    const toggleProductStatus = async (product: Product) => {
        const newStatus = !product.is_active;

        // Optimistic Update
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));

        const { error } = await supabase
            .from('products')
            .update({ is_active: newStatus })
            .eq('id', product.id);

        if (error) {
            showToast('Erro ao atualizar status: ' + error.message, 'error');
            fetchProducts(); // Revert on error
        } else {
            showToast(`Produto ${newStatus ? 'ativado' : 'pausado'}.`, 'success');
        }
    };

    return (
        <MerchantLayout activeTab="products" title="Produtos">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Inventário</h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Gerencie seus produtos e preços.</p>
                </div>
                <button
                    onClick={() => navigate('/gestor/products/new')}
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-12 px-6 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="add_circle" />
                    Adicionar Produto
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <div className="col-span-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto / Marca</div>
                    <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque</div>
                    <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Preço (R$)</div>
                    <div className="col-span-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                    <div className="col-span-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {loading ? (
                        <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando inventário...</div>
                    ) : products.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum produto cadastrado.</div>
                    ) : products.map((prod) => (
                        <div key={prod.id} className={`grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group ${!prod.is_active ? 'opacity-50 grayscale-[0.8]' : ''}`}>
                            <div className="col-span-5 flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-slate-100 dark:bg-black/20 flex items-center justify-center border border-slate-200 dark:border-white/5 overflow-hidden">
                                    {prod.image_url ? (
                                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="medication" className="text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{prod.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{prod.brand}</p>
                                </div>
                            </div>

                            <div className="col-span-2 flex justify-center">
                                <span className={`px-3 py-1 rounded-xl text-xs font-black ${prod.stock <= 5 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300'}`}>
                                    {prod.stock} un
                                </span>
                            </div>

                            <div className="col-span-2 text-center flex flex-col items-center">
                                {prod.promo_price ? (
                                    <>
                                        <span className="text-[10px] text-red-500 line-through">R$ {prod.original_price?.toFixed(2).replace('.', ',')}</span>
                                        <span className="font-black text-slate-900 dark:text-white">R$ {prod.promo_price.toFixed(2).replace('.', ',')}</span>
                                    </>
                                ) : (
                                    <span className="font-black text-slate-700 dark:text-slate-200 text-sm">R$ {prod.price.toFixed(2).replace('.', ',')}</span>
                                )}
                            </div>

                            <div className="col-span-2 flex justify-center">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${prod.status === 'Pausado' ? 'border-slate-400 text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' :
                                    prod.stock === 0 ? 'border-red-500 text-red-500 bg-red-500/10' :
                                        prod.stock <= 10 ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                                            'border-green-500 text-green-500 bg-green-500/10'
                                    }`}>
                                    {prod.status}
                                </span>
                            </div>

                            <div className="col-span-1 flex justify-center gap-2">
                                <button
                                    onClick={() => toggleProductStatus(prod)}
                                    title={prod.is_active ? "Pausar Vendas" : "Retomar Vendas"}
                                    className={`size-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${prod.is_active
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-600'
                                        : 'bg-green-100 hover:bg-green-200 text-green-600'
                                        }`}
                                >
                                    <MaterialIcon name={prod.is_active ? "pause" : "play_arrow"} className="text-sm" />
                                </button>
                                <button onClick={() => navigate(`/gestor/products/edit/${prod.id}`)} className="size-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors flex items-center justify-center shadow-sm">
                                    <MaterialIcon name="edit" className="text-sm" />
                                </button>
                                <button onClick={() => handleDelete(prod.id)} className="size-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center shadow-sm">
                                    <MaterialIcon name="delete" className="text-[16px]" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Adição com Busca ANVISA */}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </MerchantLayout>
    );
};

export default InventoryControl;
