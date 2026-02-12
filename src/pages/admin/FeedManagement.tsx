import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MaterialIcon,
    LoadingSpinner
} from '../../components/Shared';

// Config Modal Component
const ConfigModal = ({ section, onClose, onSave, onUpload }: { section: any, onClose: () => void, onSave: (cfg: any, title: string, isActive: boolean) => void, onUpload: (f: File) => Promise<string | null> }) => {
    const [title, setTitle] = useState(section.title);
    const [config, setConfig] = useState(section.config || {});
    // Initialize banners from new structure or legacy images array
    const [banners, setBanners] = useState<{ image: string, link: string }[]>(
        section.config.banners ||
        (section.config.images ? section.config.images.map((img: string) => ({ image: img, link: '' })) : [])
    );
    const [isActive, setIsActive] = useState(section.is_active);
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const url = await onUpload(e.target.files[0]);
        if (url) {
            setBanners([...banners, { image: url, link: '' }]);
        }
        setUploading(false);
    };

    const removeBanner = (index: number) => {
        const newBanners = [...banners];
        newBanners.splice(index, 1);
        setBanners(newBanners);
    };

    const updateBannerLink = (index: number, link: string) => {
        const newBanners = [...banners];
        newBanners[index].link = link;
        setBanners(newBanners);
    };

    const handleSave = () => {
        // Save both new banners structure and legacy images for backward compatibility if needed
        // But primarily use banners. We update local config first.
        const updatedConfig = {
            ...config,
            banners: banners,
            images: banners.map(b => b.image) // Keep images sync for legacy readers
        };
        onSave(updatedConfig, title, isActive);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Seção</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                        <MaterialIcon name="close" />
                    </button>
                </div>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">Status da Seção</span>
                            <span className="text-xs text-slate-400">{isActive ? 'Visível no App' : 'Oculto no App'}</span>
                        </div>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`relative w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'} shadow-sm`} />
                        </button>
                    </div>

                    {/* Título */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Título da Seção</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl"
                        />
                    </div>

                    {/* Limit Config (Listas) */}
                    {(section.type.includes('list') || section.type.includes('grid')) && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Limite de Itens</label>
                            <input
                                type="number"
                                value={config.limit || 5}
                                onChange={e => setConfig({ ...config, limit: parseInt(e.target.value) })}
                                className="w-full p-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl"
                            />
                        </div>
                    )}

                    {/* Banner Config */}
                    {section.type === 'banner.top' && (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase text-slate-500">Banners (Carrossel)</label>

                            <div className="grid grid-cols-1 gap-4">
                                {banners.map((banner, idx) => (
                                    <div key={idx} className="flex gap-3 bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                        <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 border border-white/10 relative group">
                                            <img src={banner.image} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeBanner(idx)}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"
                                            >
                                                <MaterialIcon name="delete" className="text-xl" />
                                            </button>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Link de Redirecionamento</label>
                                            <input
                                                type="text"
                                                placeholder="ex: /category/medicamentos ou https://google.com"
                                                value={banner.link || ''}
                                                onChange={(e) => updateBannerLink(idx, e.target.value)}
                                                className="w-full p-2 text-xs bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                ))}

                                <label className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-all text-slate-400">
                                    {uploading ? <LoadingSpinner /> : (
                                        <>
                                            <MaterialIcon name="add_photo_alternate" className="text-2xl mb-1" />
                                            <span className="text-xs font-bold uppercase">Adicionar Novo Banner</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400">Recomendado: 1200x400px (JPG/PNG)</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 mt-8 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="flex-1 py-3 rounded-xl font-bold bg-primary text-black hover:brightness-110">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export const FeedManagement = ({ profile }: { profile: any }) => {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSection, setEditingSection] = useState<any | null>(null);

    const fetchSections = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('app_feed_sections').select('*').order('position');
        if (data) setSections(data);
        if (error) console.error('Error:', error);
        setLoading(false);
    };

    useEffect(() => { fetchSections(); }, []);

    const handleToggleActive = async (id: string, current: boolean) => {
        await supabase.from('app_feed_sections').update({ is_active: !current }).eq('id', id);
        setSections(s => s.map(x => x.id === id ? { ...x, is_active: !current } : x));
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
        const newSections = [...sections];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
        setSections(newSections);

        // Update DB Positions
        for (let i = 0; i < newSections.length; i++) {
            await supabase.from('app_feed_sections').update({ position: i }).eq('id', newSections[i].id);
        }
    };

    const handleUpload = async (file: File) => {
        try {
            const fileName = `banners/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { error: uploadError } = await supabase.storage.from('app-assets').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('app-assets').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (e: any) {
            alert('Erro ao enviar imagem: ' + e.message);
            return null;
        }
    };

    const handleSave = async (newConfig: any, newTitle: string, newIsActive: boolean) => {
        if (!editingSection) return;

        const { error } = await supabase
            .from('app_feed_sections')
            .update({ config: newConfig, title: newTitle, is_active: newIsActive })
            .eq('id', editingSection.id);

        if (!error) {
            setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, config: newConfig, title: newTitle, is_active: newIsActive } : s));
            setEditingSection(null);
        } else {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-[#111a16] rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Gerenciador do Feed</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Personalize a Home do App</p>
                </div>
                <button onClick={fetchSections} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:rotate-180 transition-all text-slate-600 dark:text-slate-300">
                    <MaterialIcon name="refresh" />
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visualizador da Lista */}
                <div className="lg:col-span-2 space-y-4">
                    {sections.map((section, index) => (
                        <div key={section.id} className={`flex items-center gap-4 p-4 rounded-2xl border-l-[6px] shadow-sm transition-all group ${section.is_active ? 'bg-white dark:bg-[#111a16] border-primary' : 'bg-slate-50 dark:bg-white/5 border-slate-300 opacity-60'}`}>
                            <div className="flex flex-col gap-1 text-slate-300 hover:text-primary">
                                <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="hover:text-primary disabled:opacity-20"><MaterialIcon name="expand_less" /></button>
                                <button onClick={() => handleMove(index, 'down')} disabled={index === sections.length - 1} className="hover:text-primary disabled:opacity-20"><MaterialIcon name="expand_more" /></button>
                            </div>

                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                                <span className="font-black text-lg">{index + 1}</span>
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-none">{section.title}</h3>
                                <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase bg-slate-100 dark:bg-black/20 px-2 py-0.5 rounded w-fit">{section.type}</p>
                            </div>

                            <div className="flex items-center gap-2 border-l border-slate-100 dark:border-white/5 pl-4">
                                <button onClick={() => handleToggleActive(section.id, section.is_active)} className={`p-2 rounded-xl transition-all ${section.is_active ? 'text-primary' : 'text-slate-400'}`}>
                                    <MaterialIcon name={section.is_active ? "visibility" : "visibility_off"} />
                                </button>
                                <button onClick={() => setEditingSection(section)} className="p-2 rounded-xl text-slate-400 hover:bg-primary hover:text-white bg-slate-100 dark:bg-white/5 transition-all">
                                    <MaterialIcon name="settings" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Preview Mobile */}
                <div className="bg-slate-900 rounded-[40px] border-4 border-slate-800 p-4 shadow-2xl h-[600px] sticky top-4 overflow-hidden relative hidden lg:block">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                    <div className="h-full w-full bg-white dark:bg-background-dark rounded-[32px] overflow-hidden relative flex flex-col">
                        <div className="bg-primary h-14 w-full shrink-0 flex items-end pb-2 px-4 justify-center">
                            <span className="text-background-dark font-black italic tracking-tighter">IFARMA</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 bg-slate-50 dark:bg-black/20">
                            {sections.filter(s => s.is_active).map(s => (
                                <div key={s.id} className="w-full relative group overflow-hidden bg-white dark:bg-[#1e293b] rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-2">
                                    {s.type === 'banner.top' && s.config?.images?.length > 0 ? (
                                        <img src={s.config.images[0]} className="w-full h-20 object-cover rounded-lg" />
                                    ) : (
                                        <>
                                            <span className="text-[8px] font-black uppercase text-slate-400">{s.title || 'Sem Título'}</span>
                                            <span className="text-[6px] font-mono text-slate-300">{s.type}</span>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {editingSection && (
                <ConfigModal
                    section={editingSection}
                    onClose={() => setEditingSection(null)}
                    onSave={handleSave}
                    onUpload={handleUpload}
                />
            )}
        </div>
    );
};
