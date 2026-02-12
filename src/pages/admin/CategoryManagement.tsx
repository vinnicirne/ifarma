import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const CategoryManagement = ({ profile }: { profile: any }) => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<any>({ name: '', slug: '', image_url: '', parent_id: null, description: '', banner_price: '', banner_color: '', banner_link: '', banner_description: '' });

    useEffect(() => {
        fetchCategories();
    }, []);

    const getValidImageUrl = (url: string) => {
        if (!url) return null;
        if (url.includes('pexels.com') && !url.includes('images.pexels.com')) {
            const idMatch = url.match(/(\d+)\/?$/);
            if (idMatch && idMatch[1]) {
                return `https://images.pexels.com/photos/${idMatch[1]}/pexels-photo-${idMatch[1]}.jpeg?auto=compress&cs=tinysrgb&w=800`;
            }
        }
        return url;
    };

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('parent_id', { ascending: true, nullsFirst: true })
            .order('name');

        if (error) console.error('Erro ao buscar categorias:', error);
        else setCategories(data || []);
        setLoading(false);
    };

    // Helper to get parent name
    const getParentName = (parentId: string) => {
        const parent = categories.find(c => c.id === parentId);
        return parent ? parent.name : '-';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: currentCategory.name,
                slug: currentCategory.slug,
                image_url: currentCategory.image_url,
                parent_id: currentCategory.parent_id || null,
                description: currentCategory.description,
                banner_price: currentCategory.banner_price,
                banner_color: currentCategory.banner_color,
                banner_link: currentCategory.banner_link,
                banner_description: currentCategory.banner_description
            };

            if (editMode && currentCategory.id) {
                const { error } = await supabase
                    .from('categories')
                    .update(payload)
                    .eq('id', currentCategory.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('categories')
                    .insert([payload]);
                if (error) throw error;
            }
            fetchCategories();
            setIsModalOpen(false);
            setEditMode(false);
            setCurrentCategory({ name: '', slug: '', image_url: '', parent_id: null, description: '', banner_price: '', banner_color: '', banner_link: '', banner_description: '' });
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            alert('Erro ao salvar categoria.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) alert('Erro ao excluir categoria');
        else fetchCategories();
    };

    const handleEdit = (cat: any) => {
        setCurrentCategory(cat);
        setEditMode(true);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setCurrentCategory({ name: '', slug: '', icon_url: '' });
        setEditMode(false);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Categorias</h1>
                <button
                    onClick={handleNew}
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="add" />
                    <span className="hidden md:inline">Nova Categoria</span>
                </button>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categories.map((cat) => (
                            <div key={cat.id} className="bg-white dark:bg-[#193324] border border-slate-200 dark:border-white/5 rounded-[24px] p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group">
                                <div className="w-full h-32 bg-slate-100 dark:bg-black/20 rounded-2xl flex items-center justify-center overflow-hidden relative">
                                    {cat.image_url ? (
                                        <img src={getValidImageUrl(cat.image_url) || ''} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <MaterialIcon name="category" className="text-3xl text-primary opacity-50" />
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-slate-900 dark:text-white font-black italic text-lg">{cat.name}</h3>
                                        <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-bold uppercase tracking-widest opacity-60">/{cat.slug}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 hover:text-primary transition-colors">
                                            <MaterialIcon name="edit" className="text-sm" />
                                        </button>
                                        <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-500/10 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                                            <MaterialIcon name="delete" className="text-sm" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#193324] rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-white/10 relative animate-slide-up">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <MaterialIcon name="close" />
                        </button>

                        <h2 className="text-2xl font-black italic mb-6 text-slate-900 dark:text-white">
                            {editMode ? 'Editar Categoria' : 'Nova Categoria'}
                        </h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Nome</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCategory.name}
                                    onChange={e => setCurrentCategory({ ...currentCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                    placeholder="Ex: Medicamentos"
                                    required
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Slug (URL)</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCategory.slug}
                                    onChange={e => setCurrentCategory({ ...currentCategory, slug: e.target.value })}
                                    placeholder="Ex: medicamentos"
                                    required
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Ícone/Imagem URL</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCategory.image_url || ''}
                                    onChange={e => setCurrentCategory({ ...currentCategory, image_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Preço Banner</span>
                                    <input
                                        className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                        value={currentCategory.banner_price || ''}
                                        onChange={e => setCurrentCategory({ ...currentCategory, banner_price: e.target.value })}
                                        placeholder="Ex: R$ 12,99"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Cor Banner (Red/Hex)</span>
                                    <input
                                        className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                        value={currentCategory.banner_color || ''}
                                        onChange={e => setCurrentCategory({ ...currentCategory, banner_color: e.target.value })}
                                        placeholder="Ex: red ou #ff0000"
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Texto Banner (Destaque)</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCategory.banner_description || ''}
                                    onChange={e => setCurrentCategory({ ...currentCategory, banner_description: e.target.value })}
                                    placeholder="Ex: tudo por"
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Link de Destino</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCategory.banner_link || ''}
                                    onChange={e => setCurrentCategory({ ...currentCategory, banner_link: e.target.value })}
                                    placeholder="Link para loja, categoria ou oferta"
                                />
                            </label>

                            <button type="submit" className="mt-4 h-14 bg-primary text-[#0a0f0d] rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all">
                                {editMode ? 'Salvar Alterações' : 'Criar Categoria'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
