import { useState, useEffect } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';

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
    image_url?: string;
    status: string;
    category?: string;
}

interface CatalogItem {
    id: string;
    name: string;
    brand: string;
    category: string;
    requires_prescription: boolean;
    image_url?: string;
}

const InventoryControl = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogSuggestions, setCatalogSuggestions] = useState<CatalogItem[]>([]);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '',
        price: '', // Preço de venda atual
        original_price: '',
        promo_price: '',
        stock: '',
        requires_prescription: false,
        image_url: ''
    });

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar a farmácia através do perfil do usuário
        const { data: profile } = await supabase
            .from('profiles')
            .select('pharmacy_id')
            .eq('id', user.id)
            .single();

        if (profile?.pharmacy_id) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('pharmacy_id', profile.pharmacy_id)
                .order('created_at', { ascending: false });

            if (data) {
                const mappedProducts = data.map(p => ({
                    ...p,
                    status: p.stock === 0 ? 'Sem Estoque' : p.stock <= 10 ? 'Baixo Estoque' : 'Ativo'
                }));
                setProducts(mappedProducts);
            }
        }
        setLoading(false);
    };

    const handleCatalogSearch = async (val: string) => {
        setCatalogSearch(val);
        if (val.length < 3) {
            setCatalogSuggestions([]);
            return;
        }

        const { data } = await supabase
            .from('product_catalog')
            .select('id, name, brand, category, requires_prescription')
            .ilike('name', `%${val}%`)
            .limit(5);

        if (data) setCatalogSuggestions(data);
    };

    const selectCatalogItem = (item: CatalogItem) => {
        setSelectedCatalogItem(item);
        setFormData(prev => ({
            ...prev,
            name: item.name,
            brand: item.brand || '',
            category: item.category || '',
            requires_prescription: item.requires_prescription,
            image_url: item.image_url || prev.image_url
        }));
        setCatalogSearch(item.name);
        setCatalogSuggestions([]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
            .from('profiles')
            .select('pharmacy_id')
            .eq('id', user?.id)
            .single();

        if (profile?.pharmacy_id) {
            const salePrice = parseFloat(formData.promo_price.toString().replace(',', '.')) || parseFloat(formData.price.toString().replace(',', '.'));

            const payload = {
                pharmacy_id: profile.pharmacy_id,
                name: formData.name,
                brand: formData.brand,
                category: formData.category,
                price: salePrice,
                original_price: parseFloat(formData.original_price.toString().replace(',', '.')) || parseFloat(formData.price.toString().replace(',', '.')),
                promo_price: formData.promo_price ? parseFloat(formData.promo_price.toString().replace(',', '.')) : null,
                stock: parseInt(formData.stock.toString()),
                requires_prescription: formData.requires_prescription,
                image_url: formData.image_url
            };

            let error;
            if (editingProduct) {
                const { error: err } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('products')
                    .insert([payload]);
                error = err;
            }

            if (!error) {
                setIsAddModalOpen(false);
                setEditingProduct(null);
                fetchProducts();
                resetForm();
            } else {
                alert("Erro ao salvar: " + error.message);
            }
        }
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({
            name: '', brand: '', category: '', price: '',
            original_price: '', promo_price: '', stock: '',
            requires_prescription: false, image_url: ''
        });
        setCatalogSearch('');
        setSelectedCatalogItem(null);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            brand: product.brand || '',
            category: product.category || '',
            price: product.price.toString(),
            original_price: product.original_price?.toString() || product.price.toString(),
            promo_price: product.promo_price?.toString() || '',
            stock: product.stock.toString(),
            requires_prescription: (product as any).requires_prescription || false,
            image_url: product.image_url || ''
        });
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir este produto permanentemente?')) return;

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) fetchProducts();
        else alert('Erro ao excluir: ' + error.message);
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
                        <div key={prod.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
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
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${prod.stock === 0 ? 'border-red-500 text-red-500 bg-red-500/10' :
                                    prod.stock <= 10 ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                                        'border-green-500 text-green-500 bg-green-500/10'
                                    }`}>
                                    {prod.status}
                                </span>
                            </div>

                            <div className="col-span-1 flex justify-center gap-2">
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
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-fade-in-up border border-white/10">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h2 className="text-xl font-black italic tracking-tighter">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <MaterialIcon name="close" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            {/* Busca no Portfólio */}
                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Buscar no Portfólio ANVISA (Atalho)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Digite o nome do remédio..."
                                        value={catalogSearch}
                                        onChange={(e) => handleCatalogSearch(e.target.value)}
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

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nome do Produto</label>
                                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Marca</label>
                                            <input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Categoria</label>
                                            <input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Preço Normal (R$)</label>
                                            <input required placeholder="0,00" value={formData.original_price || formData.price} onChange={e => setFormData({ ...formData, original_price: e.target.value, price: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-primary">Preço Promo</label>
                                            <input placeholder="0,00" value={formData.promo_price} onChange={e => setFormData({ ...formData, promo_price: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner text-primary" />
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-black/20 rounded-xl">
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
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Estoque Inicial</label>
                                            <input required type="number" placeholder="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Foto do Produto</label>
                                    <div className="flex-1 relative group">
                                        <label className="flex flex-col items-center justify-center w-full h-[320px] rounded-3xl bg-primary/5 dark:bg-primary/10 border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-4">
                                                    <span className="animate-spin text-primary text-4xl">⌛</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Subindo...</span>
                                                </div>
                                            ) : formData.image_url ? (
                                                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 text-primary/40 group-hover:text-primary transition-colors">
                                                    <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <MaterialIcon name="add_photo_alternate" className="!text-4xl" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black uppercase tracking-widest">Adicionar Foto</p>
                                                        <p className="text-[10px] font-bold opacity-60">PNG ou JPG até 5MB</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                        </label>
                                        {formData.image_url && !uploading && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                className="absolute top-4 right-4 size-10 flex items-center justify-center rounded-xl bg-red-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <MaterialIcon name="delete" />
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
        </MerchantLayout>
    );
};

export default InventoryControl;
