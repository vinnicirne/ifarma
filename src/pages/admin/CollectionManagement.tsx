import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const CollectionManagement = ({ profile }: { profile: any }) => {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentCollection, setCurrentCollection] = useState<any>({ name: '', slug: '', type: 'symptom', image_url: '' });

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .order('type')
            .order('name');

        if (error) console.error('Erro ao buscar coleções:', error);
        else setCollections(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: currentCollection.name,
                slug: currentCollection.slug,
                type: currentCollection.type,
                image_url: currentCollection.image_url
            };

            if (editMode && currentCollection.id) {
                const { error } = await supabase
                    .from('collections')
                    .update(payload)
                    .eq('id', currentCollection.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('collections')
                    .insert([payload]);
                if (error) throw error;
            }
            fetchCollections();
            setIsModalOpen(false);
            setEditMode(false);
            setCurrentCollection({ name: '', slug: '', type: 'symptom', image_url: '' });
        } catch (error) {
            console.error('Erro ao salvar coleção:', error);
            alert('Erro ao salvar coleção: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta coleção?')) return;
        const { error } = await supabase.from('collections').delete().eq('id', id);
        if (error) alert('Erro ao excluir coleção');
        else fetchCollections();
    };

    const handleEdit = (col: any) => {
        setCurrentCollection(col);
        setEditMode(true);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setCurrentCollection({ name: '', slug: '', type: 'symptom', image_url: '' });
        setEditMode(false);
        setIsModalOpen(true);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'symptom': return 'Por Sintoma';
            case 'audience': return 'Por Público';
            case 'campaign': return 'Campanha';
            case 'seasonality': return 'Sazonalidade';
            default: return type;
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div>
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Coleções</h1>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Dor e Febre, Infantil, etc.</p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name="add" />
                    <span className="hidden md:inline">Nova Coleção</span>
                </button>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {collections.map((col) => (
                            <div key={col.id} className="bg-white dark:bg-[#193324] border border-slate-200 dark:border-white/5 rounded-[24px] p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${col.type === 'symptom' ? 'bg-red-100 text-red-600' :
                                            col.type === 'audience' ? 'bg-purple-100 text-purple-600' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        {getTypeLabel(col.type)}
                                    </span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(col)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 hover:text-primary">
                                            <MaterialIcon name="edit" className="text-sm" />
                                        </button>
                                        <button onClick={() => handleDelete(col.id)} className="p-2 hover:bg-red-500/10 rounded-full text-slate-500 hover:text-red-500">
                                            <MaterialIcon name="delete" className="text-sm" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="size-12 bg-slate-100 dark:bg-black/20 rounded-xl flex items-center justify-center shrink-0">
                                        {col.image_url ? (
                                            <img src={col.image_url} alt={col.name} className="size-8 object-contain" />
                                        ) : (
                                            <MaterialIcon name="collections_bookmark" className="text-2xl text-primary opacity-50" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-slate-900 dark:text-white font-black italic text-base leading-tight">{col.name}</h3>
                                        <p className="text-slate-500 dark:text-[#92c9a9] text-[10px] font-bold uppercase tracking-widest opacity-60">/{col.slug}</p>
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
                            {editMode ? 'Editar Coleção' : 'Nova Coleção'}
                        </h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Tipo</span>
                                <select
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCollection.type}
                                    onChange={e => setCurrentCollection({ ...currentCollection, type: e.target.value })}
                                >
                                    <option value="symptom">Por Sintoma (Dor, Febre)</option>
                                    <option value="audience">Por Público (Infantil, Gestante)</option>
                                    <option value="campaign">Campanha (Black Friday)</option>
                                    <option value="seasonality">Sazonalidade (Verão, Inverno)</option>
                                </select>
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Nome</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCollection.name}
                                    onChange={e => setCurrentCollection({ ...currentCollection, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                    placeholder="Ex: Dor e Febre"
                                    required
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Slug (URL)</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCollection.slug}
                                    onChange={e => setCurrentCollection({ ...currentCollection, slug: e.target.value })}
                                    placeholder="Ex: dor-e-febre"
                                    required
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#92c9a9]">Imagem URL (Opcional)</span>
                                <input
                                    className="h-12 bg-slate-100 dark:bg-black/20 rounded-xl px-4 font-bold text-slate-900 dark:text-white border-transparent focus:border-primary focus:ring-0"
                                    value={currentCollection.image_url || ''}
                                    onChange={e => setCurrentCollection({ ...currentCollection, image_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </label>

                            <button type="submit" className="mt-4 h-14 bg-primary text-[#0a0f0d] rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all">
                                {editMode ? 'Salvar Alterações' : 'Criar Coleção'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
