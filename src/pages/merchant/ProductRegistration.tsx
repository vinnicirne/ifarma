
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { isUuid } from '../../lib/uuidUtils';
import { Toast } from '../../components/Toast';
import { MaterialIcon } from '../../components/MaterialIcon';

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

const ProductRegistration = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Catalog Search State
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogResults, setCatalogResults] = useState<any[]>([]);
    const [catalogSuggestions, setCatalogSuggestions] = useState<any[]>([]);

    // Data State
    const [categories, setCategories] = useState<any[]>([]);
    const [formData, setFormData] = useState({
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
        usage_instructions: '',
        is_generic: false
    } as Record<string, any>);

    useEffect(() => {
        fetchCategories();
        if (id) {
            fetchProduct(id);
        }
    }, [id]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const fetchProduct = async (productId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) {
            showToast('Erro ao carregar produto', 'error');
            navigate('/gestor/products');
            return;
        }

        if (data) {
            setFormData({
                name: data.name,
                brand: data.brand || '',
                category: data.category || '',
                price: data.price.toString(),
                original_price: data.original_price?.toString() || data.price.toString(),
                promo_price: data.promo_price?.toString() || '',
                stock: data.stock.toString(),
                requires_prescription: data.requires_prescription || false,
                image_url: data.image_url || '',
                sku: data.sku || '',
                ean: data.ean || '',
                dosage: data.dosage || '',
                quantity_label: data.quantity_label || '',
                principle_active: Array.isArray(data.principle_active) ? data.principle_active.join(', ') : '',
                tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
                synonyms: Array.isArray(data.synonyms) ? data.synonyms.join(', ') : '',
                control_level: data.control_level || 'none',
                usage_instructions: data.usage_instructions || '',
                is_generic: data.is_generic || false
            });
        }
        setLoading(false);
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

        const { error: uploadError } = await supabase.storage
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                showToast('Erro de autenticação. Faça login novamente.', 'error');
                return;
            }

            let pharmacyId = null;
            const impersonatedId = localStorage.getItem('impersonatedPharmacyId');

            if (impersonatedId && isUuid(impersonatedId)) {
                pharmacyId = impersonatedId;
            } else {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('pharmacy_id')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    showToast('Erro ao buscar perfil: ' + profileError.message, 'error');
                    return;
                }
                pharmacyId = profile?.pharmacy_id;
            }

            if (pharmacyId) {
                const salePrice = parseFloat(formData.promo_price.toString().replace(',', '.')) || parseFloat(formData.price.toString().replace(',', '.'));

                const payload = {
                    pharmacy_id: pharmacyId,
                    name: formData.name,
                    brand: formData.brand,
                    category: formData.category,
                    price: salePrice,
                    original_price: parseFloat(formData.original_price.toString().replace(',', '.')) || parseFloat(formData.price.toString().replace(',', '.')),
                    promo_price: formData.promo_price ? parseFloat(formData.promo_price.toString().replace(',', '.')) : null,
                    stock: parseInt(formData.stock.toString()),
                    requires_prescription: formData.requires_prescription,
                    is_generic: formData.is_generic,
                    image_url: formData.image_url,
                    sku: formData.sku,
                    ean: formData.ean,
                    // Campos de descrição adicionados
                    dosage: formData.dosage,
                    quantity_label: formData.quantity_label,
                    principle_active: formData.principle_active ? formData.principle_active.split(',').map(s => s.trim()).filter(s => s) : [],
                    tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(s => s) : [],
                    synonyms: formData.synonyms ? formData.synonyms.split(',').map(s => s.trim()).filter(s => s) : [],
                    control_level: formData.control_level,
                    usage_instructions: formData.usage_instructions
                };

                let error;
                if (id) {
                    const { error: err } = await supabase
                        .from('products')
                        .update(payload)
                        .eq('id', id);
                    error = err;
                } else {
                    const { error: err } = await supabase
                        .from('products')
                        .insert([payload]);
                    error = err;
                }

                if (!error) {
                    showToast('Produto salvo com sucesso!', 'success');
                    setTimeout(() => navigate('/gestor/products'), 1000);
                } else {
                    showToast("Erro ao salvar: " + error.message, 'error');
                }
            } else {
                showToast('Erro: Você precisa estar associado a uma farmácia para adicionar produtos.', 'error');
            }
        } catch (err) {
            showToast('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MerchantLayout activeTab="products" title={id ? "Editar Produto" : "Novo Produto"}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">
                        {id ? 'Editar Produto' : 'Novo Produto'}
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                        Preencha os dados do produto abaixo.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/gestor/products')}
                    className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 flex h-12 px-6 items-center justify-center rounded-2xl transition-all active:scale-95 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="arrow_back" />
                    Voltar
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden p-8">
                <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto">
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

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Left Column - Image */}
                        <div className="md:col-span-4 space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Foto do Produto</label>
                            <div className="relative group">
                                <label className="flex flex-col items-center justify-center w-full aspect-square rounded-3xl bg-primary/5 dark:bg-primary/10 border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all cursor-pointer overflow-hidden relative">
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
                                            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                                                <MaterialIcon name="add_photo_alternate" className="!text-4xl" />
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
                                        className="mt-3 w-full h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
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

                        {/* Right Column - Fields */}
                        <div className="md:col-span-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nome do Produto</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold focus:ring-2 focus:ring-primary/50" />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">EAN (Código de Barras)</label>
                                    <input placeholder="Opcional" value={formData.ean} onChange={e => setFormData({ ...formData, ean: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">SKU (Cód. Interno)</label>
                                    <input placeholder="Opcional" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                </div>

                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Marca</label>
                                    <input required value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Categoria</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner appearance-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
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
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner"
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
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner text-primary"
                                    />
                                </div>

                                <div className="col-span-2 space-y-4">
                                    {formData.is_generic && (
                                        <div className="bg-amber-500 text-[10px] font-black uppercase tracking-[0.2em] text-white py-1 px-4 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-amber-500/20">
                                            PRODUTO GENÉRICO
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl cursor-pointer hover:bg-amber-500/10 transition-all" onClick={() => setFormData({ ...formData, is_generic: !formData.is_generic })}>
                                        <div className={`size-6 rounded-lg flex items-center justify-center transition-all ${formData.is_generic ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-black/20 text-transparent'}`}>
                                            <MaterialIcon name="check" className="!text-xs" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Produto Genérico</p>
                                            <p className="text-[9px] font-bold text-slate-400">Marque se este produto for um medicamento genérico.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Dosagem</label>
                                        <input placeholder="Ex: 500mg" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Qtd/Embalagem</label>
                                        <input placeholder="Ex: 10 comprim" value={formData.quantity_label} onChange={e => setFormData({ ...formData, quantity_label: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Princípio Ativo (separar por vírgula)</label>
                                        <input placeholder="Dipirona Sódica" value={formData.principle_active} onChange={e => setFormData({ ...formData, principle_active: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                    </div>

                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tags de Busca</label>
                                        <input placeholder="dor, febre, ..." value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Controle Especial</label>
                                        <select
                                            value={formData.control_level}
                                            onChange={e => setFormData({ ...formData, control_level: e.target.value })}
                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner"
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
                                            rows={3}
                                            placeholder="Tomar 1 comprimido a cada 8 horas..."
                                            value={formData.usage_instructions}
                                            onChange={e => setFormData({ ...formData, usage_instructions: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-medium shadow-inner resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-black/20 rounded-xl cursor-pointer" onClick={() => setFormData({ ...formData, requires_prescription: !formData.requires_prescription })}>
                                        <input
                                            type="checkbox"
                                            id="prescription"
                                            checked={formData.requires_prescription}
                                            onChange={e => setFormData({ ...formData, requires_prescription: e.target.checked })}
                                            className="accent-primary size-5"
                                        />
                                        <label htmlFor="prescription" className="text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none">Exigir Receita Médica</label>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estoque Inicial</label>
                                    <input required type="number" placeholder="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/20 border-none text-sm font-bold shadow-inner" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-primary text-background-dark rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-sm mt-8"
                            >
                                {loading ? 'Salvando...' : 'Salvar Produto'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </MerchantLayout>
    );
};

export default ProductRegistration;
