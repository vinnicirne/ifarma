import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../../components/Shared';
import { supabase } from '../../lib/supabase';

export const PromotionManagement = ({ profile }: { profile: any }) => {
    const navigate = useNavigate();
    const [promotions, setPromotions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('promotions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Erro ao buscar promoções:', error);
        else setPromotions(data || []);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!title || !startDate || !endDate) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        setIsCreating(true);
        try {
            // 1. Create Promotion
            const { data: promo, error: promoError } = await supabase
                .from('promotions')
                .insert([{
                    title,
                    start_date: startDate,
                    end_date: endDate,
                    banner_url: bannerUrl,
                    active: true,
                    created_by: profile.id
                }])
                .select()
                .single();

            if (promoError) throw promoError;

            // 2. Add All Approved Pharmacies to Participants (Default behavior for now)
            const { data: pharmacies } = await supabase
                .from('pharmacies')
                .select('id')
                .eq('status', 'approved');

            if (pharmacies && pharmacies.length > 0) {
                const participants = pharmacies.map(p => ({
                    promotion_id: promo.id,
                    pharmacy_id: p.id,
                    status: 'pending' // Stores need to accept? or default accepted? "entrar ou não" -> pending
                }));

                const { error: partError } = await supabase
                    .from('promotion_participants')
                    .insert(participants);

                if (partError) console.error('Erro ao adicionar participantes:', partError);
            }

            alert('Campanha criada com sucesso!');
            setTitle('');
            setStartDate('');
            setEndDate('');
            setBannerUrl('');
            fetchPromotions();

        } catch (error: any) {
            console.error('Erro ao criar campanha:', error);
            alert('Erro ao criar campanha: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
        const { error } = await supabase.from('promotions').delete().eq('id', id);
        if (error) alert('Erro ao excluir campanha');
        else fetchPromotions();
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Universal Header */}
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Promoções</h1>
                <div className="flex gap-3">
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-10 px-4 bg-slate-200 dark:bg-[#234833] text-slate-900 dark:text-white gap-2 text-xs font-black uppercase tracking-widest shadow-sm border border-slate-300 dark:border-transparent hover:opacity-90 active:scale-95 transition-all">
                        <MaterialIcon name="history" className="text-primary" />
                        <span className="hidden md:inline">Histórico</span>
                    </button>
                    <button className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-4 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest">
                        <MaterialIcon name="rocket_launch" />
                        <span className="hidden md:inline">Nova Campanha</span>
                    </button>
                </div>
            </header>

            <main className="pb-32 md:pb-10 p-4 md:p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Create Campaign Column */}
                    <div className="lg:w-1/3">
                        <div className="sticky top-24">
                            {/* Campaign Form Container */}
                            <div className="bg-[#193324]/30 border border-[#326748]/50 rounded-[32px] overflow-hidden shadow-xl md:bg-white md:dark:bg-[#193324] md:border-slate-200 md:dark:border-white/5">
                                <div className="hidden md:block p-6 border-b border-black/5 dark:border-white/5">
                                    <h2 className="text-slate-900 dark:text-white text-xl font-black italic">Nova Campanha</h2>
                                    <p className="text-slate-500 dark:text-[#92c9a9] text-xs font-bold mt-1">Configure o lançamento</p>
                                </div>

                                <div className="flex flex-col gap-4 p-5 md:p-6">
                                    {/* Name Field */}
                                    <label className="flex flex-col w-full">
                                        <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Nome da Campanha</p>
                                        <input
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 focus:border-primary h-14 placeholder:text-[#92c9a9]/30 md:placeholder:text-slate-400 p-4 text-base font-bold italic transition-all shadow-sm"
                                            placeholder="Ex: Black Friday Farmácias"
                                        />
                                    </label>

                                    {/* Dates Row */}
                                    <div className="flex gap-4">
                                        <label className="flex flex-col flex-1">
                                            <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Data Início</p>
                                            <input
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 h-14 p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary shadow-sm"
                                                type="date"
                                            />
                                        </label>
                                        <label className="flex flex-col flex-1">
                                            <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Data Fim</p>
                                            <input
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 h-14 p-4 text-sm font-bold focus:ring-primary/20 focus:border-primary shadow-sm"
                                                type="date"
                                            />
                                        </label>
                                    </div>

                                    {/* Banner Upload Mock */}
                                    <div className="flex flex-col w-full">
                                        <p className="text-white md:text-slate-600 md:dark:text-white text-[10px] font-black uppercase tracking-widest pb-2 px-1">Banner URL (Temporário)</p>
                                        <input
                                            value={bannerUrl}
                                            onChange={e => setBannerUrl(e.target.value)}
                                            className="form-input flex w-full rounded-2xl text-white md:text-slate-900 md:dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#326748] md:border-slate-300 md:dark:border-white/10 bg-[#193324]/50 md:bg-slate-50 md:dark:bg-black/20 focus:border-primary h-14 placeholder:text-[#92c9a9]/30 md:placeholder:text-slate-400 p-4 text-base font-bold italic transition-all shadow-sm"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    {/* Create Button */}
                                    <button
                                        onClick={handleCreate}
                                        disabled={isCreating}
                                        className="w-full bg-primary text-background-dark font-black py-4 rounded-3xl shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 uppercase tracking-tighter text-sm disabled:opacity-50"
                                    >
                                        <MaterialIcon name="rocket_launch" className="hover:rotate-12 transition-transform" />
                                        {isCreating ? 'Criando...' : 'Criar Promoção'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active List Column */}
                    <div className="flex-1">
                        <div className="px-1 pb-4">
                            <div className="flex justify-between items-center mb-6 pt-4 md:pt-0">
                                <h2 className="text-white md:text-slate-900 md:dark:text-white text-xl font-black tracking-tighter italic">Promoções Ativas</h2>
                                <span className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest italic border border-primary/20">{promotions.filter(p => p.active).length} Ativas</span>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {loading ? (
                                    <div className="col-span-2 text-center py-10 opacity-50">Carregando campanhas...</div>
                                ) : promotions.length === 0 ? (
                                    <div className="col-span-2 text-center py-10 opacity-50 font-bold uppercase tracking-widest">Nenhuma campanha encontrada</div>
                                ) : (
                                    promotions.map((promo) => (
                                        <div key={promo.id} className="bg-[#193324]/30 md:bg-white md:dark:bg-[#193324] border border-[#326748]/50 md:border-slate-200 md:dark:border-white/5 rounded-[24px] p-5 flex gap-4 items-center shadow-md group hover:bg-[#193324]/50 md:hover:shadow-lg transition-all relative overflow-hidden">
                                            <div className="size-20 rounded-2xl overflow-hidden shrink-0 border border-[#326748] md:border-slate-100 md:dark:border-white/10 flex items-center justify-center bg-slate-800 md:bg-slate-100 md:dark:bg-slate-800">
                                                {promo.banner_url ? (
                                                    <img src={promo.banner_url} alt="banner" className="w-full h-full object-cover" />
                                                ) : (
                                                    <MaterialIcon name="campaign" className="text-3xl text-primary/40 md:text-primary md:opacity-80 group-hover:scale-110 transition-transform" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white md:text-slate-900 md:dark:text-white font-black text-base truncate italic">{promo.title}</h4>
                                                <p className="text-[#92c9a9] md:text-slate-500 md:dark:text-[#92c9a9] text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">
                                                    {new Date(promo.start_date).toLocaleDateString()} até {new Date(promo.end_date).toLocaleDateString()}
                                                </p>
                                                <div className="flex gap-2 mt-3">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border italic ${promo.active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                        {promo.active ? 'Ativa' : 'Encerrada'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(promo.id)}
                                                className="bg-red-500/10 text-red-500 size-12 rounded-2xl hover:bg-red-500/20 transition-colors active:scale-90 border border-red-500/10 flex items-center justify-center"
                                            >
                                                <MaterialIcon name="delete" className="text-xl" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
