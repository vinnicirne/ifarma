import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MaterialIcon,
    LoadingSpinner,
    PageHeader
} from '../../components/Shared';

export const FeedManagement = ({ profile }: { profile: any }) => {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSections = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('app_feed_sections')
            .select('*')
            .order('position', { ascending: true });

        if (data) setSections(data);
        if (error) console.error('Error fetching feed sections:', error);
        setLoading(false);
    };

    useEffect(() => {
        fetchSections();
    }, []);

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('app_feed_sections')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (!error) {
            setSections(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;

        const newSections = [...sections];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap locally
        const temp = newSections[index];
        newSections[index] = newSections[swapIndex];
        newSections[swapIndex] = temp;

        // Update local state smoothly
        setSections(newSections);

        // Update DB
        const updates = newSections.map((s, i) => ({ id: s.id, position: i }));

        // Batch update is tricky in Supabase without RPC, doing serial for now (or use upsert if configured)
        // Optimization: Create a DB function for reordering, but for < 10 items serial is fine.
        for (const update of updates) {
            await supabase.from('app_feed_sections').update({ position: update.position }).eq('id', update.id);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-[#111a16] rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">Gerenciador do Feed</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Controle o que aparece na Home do App</p>
                </div>
                <button
                    onClick={fetchSections}
                    className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:rotate-180 transition-all text-slate-600 dark:text-slate-300"
                >
                    <MaterialIcon name="refresh" />
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visualizador / Editor de Lista */}
                <div className="lg:col-span-2 space-y-4">
                    {sections.map((section, index) => (
                        <div key={section.id} className={`flex items-center gap-4 p-4 rounded-2xl border-l-[6px] shadow-sm transition-all group ${section.is_active ? 'bg-white dark:bg-[#111a16] border-primary' : 'bg-slate-50 dark:bg-white/5 border-slate-300 opacity-60'}`}>

                            {/* Drag Handles (Visual) */}
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

                            {/* Config Preview */}
                            <div className="hidden sm:block text-[10px] font-mono text-slate-400 max-w-[150px] truncate">
                                {JSON.stringify(section.config)}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 border-l border-slate-100 dark:border-white/5 pl-4">
                                <button
                                    onClick={() => handleToggleActive(section.id, section.is_active)}
                                    className={`p-2 rounded-xl transition-all ${section.is_active ? 'text-primary bg-primary/10 hover:bg-red-500 hover:text-white' : 'text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white'}`}
                                    title={section.is_active ? "Desativar" : "Ativar"}
                                >
                                    <MaterialIcon name={section.is_active ? "visibility" : "visibility_off"} />
                                </button>
                                <button className="p-2 rounded-xl text-slate-400 hover:bg-primary hover:text-white bg-slate-100 dark:bg-white/5 transition-all">
                                    <MaterialIcon name="settings" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <button className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold hover:border-primary hover:text-primary transition-all uppercase tracking-widest text-xs">
                        <MaterialIcon name="add_circle_outline" />
                        Adicionar Nova Seção
                    </button>
                </div>

                {/* Preview Mobile (Simulação) */}
                <div className="bg-slate-900 rounded-[40px] border-4 border-slate-800 p-4 shadow-2xl h-[600px] sticky top-4 overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                    <div className="h-full w-full bg-white dark:bg-background-dark rounded-[32px] overflow-hidden relative flex flex-col">
                        <div className="bg-primary h-14 w-full shrink-0 flex items-end pb-2 px-4 justify-center">
                            <span className="text-background-dark font-black italic tracking-tighter">IFARMA</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 bg-slate-50 dark:bg-black/20">
                            {sections.filter(s => s.is_active).map(s => (
                                <div key={s.id} className="w-full min-h-[60px] bg-white dark:bg-[#1e293b] rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-2 opacity-80">
                                    <span className="text-[8px] font-black uppercase text-slate-400">{s.title}</span>
                                    <span className="text-[6px] font-mono text-slate-300">{s.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
