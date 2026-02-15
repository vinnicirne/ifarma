import { useState, useEffect } from 'react';
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
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogResults, setCatalogResults] = useState<any[]>([]);
    const [catalogSuggestions, setCatalogSuggestions] = useState<any[]>([]);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '', // This will now store ID or Name depending on logic
        price: '',
        original_price: '',
        promo_price: '',
        stock: '',
        requires_prescription: false,
        image_url: '',
        sku: '',
        ean: '',
        // New Fields
        dosage: '',
        quantity_label: '',
        principle_active: '', // Comma separated
        tags: '', // Comma separated
        synonyms: '', // Comma separated
        control_level: 'none',
        usage_instructions: ''
    } as Record<string, any>);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCatalogSearch = async () => {
        if (!catalogSearch.trim()) {
            setCatalogSuggestions([]);
            return;
        }

        const { data, error } = await supabase
            .from('product_catalog')
            .select('*')
            .or(`name.ilike.%${catalogSearch}%,brand.ilike.%${catalogSearch}%,ean.eq.${catalogSearch}`)
            .limit(10);

        if (!error && data) {
            setCatalogSuggestions(data);
        }
    };

    const selectCatalogItem = (item: any) => {
        setSelectedCatalogItem(item);
        setFormData({
            ...formData,
            name: item.name || '',
            brand: item.brand || '',
            category: item.category || '',
            ean: item.ean || '',
            dosage: item.dosage || '',
            quantity_label: item.quantity_label || '',
            requires_prescription: item.requires_prescription || false,
            principle_active: Array.isArray(item.active_ingredient) ? item.active_ingredient.join(', ') : '',
            tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        });
        setCatalogSearch('');
        setCatalogSuggestions([]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);

        if (uploadError) {
            showToast('Erro ao fazer upload da imagem', 'error');
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        setFormData({ ...formData, image_url: publicUrl });
        setUploading(false);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            brand: '',
            category: '',
            price: '',
            original_price: '',
            promo_price: '',
            stock: '',
            requires_prescription: false,
            image_url: '',
            sku: '',
            ean: '',
            dosage: '',
            quantity_label: '',
            principle_active: '',
            tags: '',
            synonyms: '',
            control_level: 'none',
            usage_instructions: ''
        });
        setSelectedCatalogItem(null);
        setCatalogSearch('');
        setCatalogSuggestions([]);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const fetchProducts = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        // 🔥 DETECTAR PHARMACY_ID (Admin Impersonation ou Perfil do Usuário)
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('🔵 handleSave chamado!', formData);
        setLoading(true);

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('👤 User:', user?.id);

            if (authError || !user) {
                console.error('❌ Erro de autenticação:', authError);
                showToast('Erro de autenticação. Faça login novamente.', 'error');
                return;
            }

            // 🔥 DETECTAR PHARMACY_ID (Admin Impersonation ou Perfil do Usuário)
            let pharmacyId = null;
            const impersonatedId = localStorage.getItem('impersonatedPharmacyId');

            if (impersonatedId && isUuid(impersonatedId)) {
                console.log('🎭 Admin gerenciando farmácia:', impersonatedId);
                pharmacyId = impersonatedId;
            } else {
                // Buscar pharmacy_id do perfil do usuário
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('pharmacy_id')
                    .eq('id', user.id)
                    .single();

                console.log('🏪 Pharmacy ID do perfil:', profile?.pharmacy_id);

                if (profileError) {
                    console.error('❌ Erro ao buscar perfil:', profileError);
                    showToast('Erro ao buscar perfil: ' + profileError.message, 'error');
                    return;
                }

                pharmacyId = profile?.pharmacy_id;
            }

            console.log('✅ Pharmacy ID final:', pharmacyId);

            if (pharmacyId) {
                const salePrice = parseFloat(formData.promo_price.toString().replace(',', '.')) || parseFloat(formData.price.toString().replace(',', '.'));

                const payload = {
                    pharmacy_id: pharmacyId, // 🔥 USAR pharmacyId EM VEZ DE profile.pharmacy_id
                    name: formData.name,
                    brand: formData.brand,
                    category: formData.category, // Assuming text for now to avoid breaking legacy, ideally ID
                    price: salePrice,
                    original_price: parseFloat(formData.original_price.toString().replace(',', '.')) || parseFloat(formData.price.toString().replace(',', '.')),
                    promo_price: formData.promo_price ? parseFloat(formData.promo_price.toString().replace(',', '.')) : null,
                    stock: parseInt(formData.stock.toString()),
                    requires_prescription: formData.requires_prescription,
                    image_url: formData.image_url,
                    sku: formData.sku,
                    ean: formData.ean,
                    // New Fields
                    dosage: formData.dosage,
                    quantity_label: formData.quantity_label,
                    principle_active: formData.principle_active ? formData.principle_active.split(',').map((s: string) => s.trim()) : [],
                    tags: formData.tags ? formData.tags.split(',').map((s: string) => s.trim()) : [],
                    synonyms: formData.synonyms ? formData.synonyms.split(',').map((s: string) => s.trim()) : [],
                    control_level: formData.control_level,
                    usage_instructions: formData.usage_instructions
                };

                console.log('📦 Payload:', payload);

                // ... (insert/update logic remains same) ...
                let error;
                if (editingProduct) {
                    console.log('✏️ Atualizando produto:', editingProduct.id);
                    const { error: err } = await supabase
                        .from('products')
                        .update(payload)
                        .eq('id', editingProduct.id);
                    error = err;
                } else {
                    console.log('➕ Inserindo novo produto');
                    const { error: err } = await supabase
                        .from('products')
                        .insert([payload]);
                    error = err;
                }

                console.log('❓ Error:', error);

                if (!error) {
                    console.log('✅ Produto salvo com sucesso!');
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                    fetchProducts();
                    resetForm();
                    showToast('Produto salvo com sucesso!', 'success');
                } else {
                    console.error('❌ Erro ao salvar:', error);
                    showToast("Erro ao salvar: " + error.message, 'error');
                }
            } else {
                console.error('❌ Pharmacy ID não encontrado!');
                showToast('Erro: Você precisa estar associado a uma farmácia para adicionar produtos.', 'error');
            }
        } catch (err) {
            console.error('💥 ERRO CRÍTICO em handleSave:', err);
            showToast('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product: any) => { // Type 'any' used to access new fields not yet in Product interface
        setEditingProduct(product);
        setFormData({
            name: product.name,
            brand: product.brand || '',
            category: product.category || '',
            price: product.price.toString(),
            original_price: product.original_price?.toString() || product.price.toString(),
            promo_price: product.promo_price?.toString() || '',
            stock: product.stock.toString(),
            requires_prescription: product.requires_prescription || false,
            image_url: product.image_url || '',
            sku: product.sku || '',
            ean: product.ean || '',
            // Populate New Fields
            dosage: product.dosage || '',
            quantity_label: product.quantity_label || '',
            principle_active: Array.isArray(product.principle_active) ? product.principle_active.join(', ') : '',
            tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
            synonyms: Array.isArray(product.synonyms) ? product.synonyms.join(', ') : '',
            control_level: product.control_level || 'none',
            usage_instructions: product.usage_instructions || ''
        });
        setIsAddModalOpen(true);
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
                    onClick={() => {
                        setEditingProduct(null);
                        resetForm();
                        setIsAddModalOpen(true);
                    }}
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
                                <button onClick={() => handleEdit(prod)} className="size-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors flex items-center justify-center shadow-sm">
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
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-fade-in-up border border-white/10 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h2 className="text-xl font-black italic tracking-tighter">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <MaterialIcon name="close" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto">
                            {/* Busca no Portfólio */}
                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Buscar no Portfólio ANVISA (Atalho)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Digite o nome do remédio..."
                                        value={catalogSearch}
                                        onChange={(e) => {
                                            setCatalogSearch(e.target.value);
                                            if (e.target.value.length > 2) {
                                                handleCatalogSearch();
                                            } else {
                                                setCatalogSuggestions([]);
                                            }
                                        }}
                                        className="w-full h-12 px-10 rounded-2xl bg-slate-50 dark:bg-black/20 border-none focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
                                    />
                                    <MaterialIcon name="search" className="position absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>

                                {catalogSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 overflow-hidden z-10">
                                        {catalogSuggestions.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => selectCatalogItem(item)}
                                                className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{item.brand}</p>
                                                </div>
                                                <MaterialIcon name="add" className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nome do Produto</label>
                                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold" />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">EAN (Código de Barras)</label>
                                        <input placeholder="Opcional" value={formData.ean} onChange={e => setFormData({ ...formData, ean: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">SKU (Cód. Interno)</label>
                                        <input placeholder="Opcional" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Marca</label>
                                            <input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Categoria</label>
                                            <select
                                                required
                                                value={formData.category} // If migrating to ID, this should match ID. If legacy text, it saves text.
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner"
                                            >
                                                <option value="">Selecione...</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option> // Saving Name for legacy compat. Ideal: ID
                                                ))}
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Preço Normal (R$)</label>
                                            <input
                                                required
                                                placeholder="0,00"
                                                value={formData.original_price || formData.price}
                                                onChange={e => {
                                                    const formatted = parseCurrency(e.target.value);
                                                    setFormData({ ...formData, original_price: formatted, price: formatted });
                                                }}
                                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 text-primary">Preço Promo</label>
                                            <input
                                                placeholder="0,00"
                                                value={formData.promo_price}
                                                onChange={e => {
                                                    const formatted = parseCurrency(e.target.value);
                                                    setFormData({ ...formData, promo_price: formatted });
                                                }}
                                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner text-primary"
                                            />
                                        </div>

                                        {/* New Fields Block */}
                                        <div className="col-span-2 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                                            <div className="col-span-1">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Dosagem</label>
                                                <input placeholder="Ex: 500mg" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Qtd/Embalagem</label>
                                                <input placeholder="Ex: 10 comprim" value={formData.quantity_label} onChange={e => setFormData({ ...formData, quantity_label: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                            </div>

                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Princípio Ativo (separar por vírgula)</label>
                                                <input placeholder="Dipirona Sódica" value={formData.principle_active} onChange={e => setFormData({ ...formData, principle_active: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                            </div>

                                            <div className="col-span-1">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tags de Busca</label>
                                                <input placeholder="dor, febre, ..." value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Controle Especial</label>
                                                <select
                                                    value={formData.control_level}
                                                    onChange={e => setFormData({ ...formData, control_level: e.target.value })}
                                                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner"
                                                >
                                                    <option value="none">Sem Cor</option>
                                                    <option value="prescription_only">Venda sob Prescrição</option>
                                                    <option value="controlled_yellow">Receita Amarela (A)</option>
                                                    <option value="controlled_blue">Receita Azul (B)</option>
                                                </select>
                                            </div>

                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Modo de Uso / Instruções</label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Tomar 1 comprimido a cada 8 horas..."
                                                    value={formData.usage_instructions}
                                                    onChange={e => setFormData({ ...formData, usage_instructions: e.target.value })}
                                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-medium shadow-inner resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-black/20 rounded-xl">
                                                <input
                                                    type="checkbox"
                                                    id="prescription"
                                                    checked={formData.requires_prescription}
                                                    onChange={e => setFormData({ ...formData, requires_prescription: e.target.checked })}
                                                    className="accent-primary size-5"
                                                />
                                                <label htmlFor="prescription" className="text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer">Exigir Receita Médica</label>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estoque Inicial</label>
                                            <input required type="number" placeholder="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Foto do Produto</label>
                                    <div className="flex-1 relative group">
                                        <label className="flex flex-col items-center justify-center w-full h-[240px] rounded-2xl bg-primary/5 dark:bg-primary/10 border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="animate-spin text-primary text-3xl">⌛</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Subindo...</span>
                                                </div>
                                            ) : formData.image_url ? (
                                                <img
                                                    src={formData.image_url}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://placehold.co/400x400?text=Erro+Imagem';
                                                        e.currentTarget.classList.add('opacity-50');
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 text-primary/40 group-hover:text-primary transition-colors">
                                                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <MaterialIcon name="add_photo_alternate" className="!text-3xl" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-black uppercase tracking-widest">Adicionar Foto</p>
                                                        <p className="text-[9px] font-bold opacity-60">PNG ou JPG até 5MB</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                        </label>

                                        {(formData.name || (catalogSearch && catalogSearch.length > 2)) && (
                                            <button
                                                type="button"
                                                onClick={() => window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent((formData.name || catalogSearch) + ' ' + (formData.brand || '') + ' png')}`, '_blank')}
                                                className="mt-3 w-full h-9 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                                            >
                                                <MaterialIcon name="search" className="text-sm" />
                                                Buscar Foto no Google
                                            </button>
                                        )}

                                        {formData.image_url && !uploading && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                className="absolute top-3 right-3 size-9 flex items-center justify-center rounded-xl bg-red-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <MaterialIcon name="delete" className="text-sm" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-primary text-background-dark rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Carregando...' : 'Salvar Produto'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </MerchantLayout>
    );
};

export default InventoryControl;
