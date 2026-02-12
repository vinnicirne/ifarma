import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const AdManagement = ({ profile }: { profile: any }) => {
    const [highlights, setHighlights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form Fiel ao Mock-up
    const [formData, setFormData] = useState({
        title: '',
        image_url: '',
        destination_id: '',
        days_period: '7',
        start_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchHighlights();
    }, []);

    const fetchHighlights = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ads_campaigns')
            .select(`
                *,
                metrics:ads_metrics(impressions, clicks)
            `)
            .order('created_at', { ascending: false });

        if (error) console.error('Erro ao buscar destaques:', error);
        else setHighlights(data || []);
        setLoading(false);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('ads-banners')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('ads-banners')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
        } catch (err: any) {
            alert('Erro no upload: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleActivate = async () => {
        if (!formData.title || !formData.image_url || !formData.destination_id) {
            alert('Por favor, preencha todos os campos e faça o upload do banner.');
            return;
        }

        setIsSaving(true);
        try {
            const end = new Date(formData.start_date);
            end.setDate(end.getDate() + parseInt(formData.days_period));

            const { data: campaign, error } = await supabase
                .from('ads_campaigns')
                .insert([{
                    title: formData.title,
                    image_url: formData.image_url,
                    destination_type: 'store',
                    destination_id: formData.destination_id,
                    start_date: formData.start_date,
                    end_date: end.toISOString(),
                    is_active: true,
                    created_by: profile.id,
                    region_id: 'global'
                }])
                .select()
                .single();

            if (error) throw error;
            await supabase.from('ads_metrics').insert([{ campaign_id: campaign.id }]);

            alert('Parabéns! O destaque foi ativado.');
            setFormData({ title: '', image_url: '', destination_id: '', days_period: '7', start_date: new Date().toISOString().split('T')[0] });
            fetchHighlights();
        } catch (err: any) {
            alert('Erro ao ativar destaque: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item: any) => {
        if (!window.confirm('Tem certeza que deseja apagar este destaque? O arquivo também será removido do servidor.')) return;

        try {
            // 1. Extrair o nome do arquivo da URL
            if (item.image_url.includes('ads-banners')) {
                const fileName = item.image_url.split('/').pop();
                if (fileName) {
                    await supabase.storage.from('ads-banners').remove([fileName]);
                }
            }

            // 2. Deletar do Banco (Métricas são deletadas por cascata se configurado, ou manualmente agora)
            await supabase.from('ads_metrics').delete().eq('campaign_id', item.id);
            const { error } = await supabase.from('ads_campaigns').delete().eq('id', item.id);

            if (error) throw error;
            fetchHighlights();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString();

    return (
        <div className="flex flex-col gap-6">
            {/* 1. Header Fiel ao Desenho */}
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-[#0d1b13]/80 backdrop-blur-md border-b border-white/5 -mx-8 px-8 py-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tighter text-white">Destaques Patrocinados</h1>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">Sua farmácia em evidência na sua região</p>
                    </div>
                    <button onClick={fetchHighlights} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                        <MaterialIcon name="refresh" className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-8 space-y-10">
                {/* 2. Cards de Status e Métricas (Seção Mock-up) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">STATUS</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black italic">{highlights.some(h => h.is_active) ? 'ATIVO' : 'NENHUM'}</span>
                            <MaterialIcon name="check_circle" className="text-primary" />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">DESTAQUES TOTAIS</span>
                        <p className="text-2xl font-black italic">{highlights.length}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">VISUALIZAÇÕES GERAIS</span>
                        <div className="flex items-center gap-2">
                            <MaterialIcon name="visibility" className="text-slate-400 text-sm" />
                            <p className="text-2xl font-black italic">{highlights.reduce((acc, h) => acc + (h.metrics?.[0]?.impressions || 0), 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* 3. Vitrine de Destaques (Mock-up) */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-black italic uppercase tracking-tighter text-slate-400">VITRINE DE DESTAQUES</h2>

                        <div className="space-y-6">
                            {highlights.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-[#193324] rounded-[32px] overflow-hidden border border-white/5 shadow-2xl group relative">
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="absolute top-4 right-4 z-20 size-10 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
                                    >
                                        <MaterialIcon name="delete" />
                                    </button>

                                    <div className="aspect-video relative overflow-hidden">
                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-primary text-background-dark text-[8px] font-black px-2 py-0.5 rounded-lg">PATROCINADO</span>
                                            </div>
                                            <p className="text-white text-[10px] font-bold opacity-80 uppercase tracking-widest">Lojas em destaque por publicidade</p>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-lg font-black italic">{item.title}</h4>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Vigência: <span className="text-primary">{formatDate(item.start_date)} → {formatDate(item.end_date)}</span></p>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                                <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">ATIVO</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Visualizações</p>
                                                <p className="text-xl font-black italic text-white">{item.metrics?.[0]?.impressions || 0}</p>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Acessos à Loja</p>
                                                <p className="text-xl font-black italic text-primary">{item.metrics?.[0]?.clicks || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {highlights.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] opacity-30 text-center">
                                    <MaterialIcon name="hotel_class" className="text-6xl mb-4 text-primary" />
                                    <p className="font-black italic text-lg uppercase tracking-tight">Nenhum destaque ativo</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Ativar / Renovar Destaque (Form) */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-black italic uppercase tracking-tighter text-slate-400">ATIVAR / RENOVAR DESTAQUE</h2>

                        <div className="bg-white dark:bg-[#193324] rounded-[32px] p-8 border border-white/5 shadow-xl space-y-8">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome do Destaque (Interno)</span>
                                <input type="text" placeholder="Ex: Campanha Farmácia Vida" className="w-full bg-black/20 border border-white/5 rounded-xl h-14 px-5 text-sm font-bold text-white shadow-inner"
                                    value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>

                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Banner da Farmácia</span>
                                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer ${formData.image_url ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-primary/30'}`}>
                                    {uploading ? (
                                        <MaterialIcon name="sync" className="text-3xl animate-spin text-primary" />
                                    ) : formData.image_url ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <MaterialIcon name="check_circle" className="text-4xl text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Banner Carregado!</span>
                                        </div>
                                    ) : (
                                        <>
                                            <MaterialIcon name="add_photo_alternate" className="text-4xl mb-2 text-slate-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Clique para subir o banner</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                </label>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Farmácia Beneficiada (ID)</span>
                                <input type="text" placeholder="ID da Farmácia" className="w-full bg-black/20 border border-white/5 rounded-xl h-14 px-5 text-sm font-bold text-white"
                                    value={formData.destination_id} onChange={e => setFormData({ ...formData, destination_id: e.target.value })} />
                            </div>

                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Período Selecionado</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {['7', '15', '30'].map((p) => (
                                        <button key={p} onClick={() => setFormData({ ...formData, days_period: p })}
                                            className={`h-12 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${formData.days_period === p ? 'bg-primary border-primary text-background-dark shadow-[0_0_20px_rgba(19,236,109,0.3)]' : 'bg-transparent border-white/10 text-slate-500'}`}>
                                            {p} Dias
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-4 border-t border-white/5">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local de Exibição</span>
                                <span className="text-xs font-black italic text-white uppercase tracking-tighter">Destaques da Região</span>
                            </div>

                            <button onClick={handleActivate} disabled={isSaving || uploading}
                                className="w-full bg-primary text-background-dark font-black h-16 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-primary/30 uppercase tracking-tight text-lg disabled:opacity-50">
                                <MaterialIcon name="bolt" fill />
                                {isSaving ? 'Salvando...' : 'ATIVAR DESTAQUE'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
