import React, { useState, useEffect } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const MerchantPromotions = () => {
    const [promotions, setPromotions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);

    useEffect(() => {
        const fetchContext = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let pid = localStorage.getItem('impersonatedPharmacyId');
            if (!pid) {
                const { data: owned } = await supabase.from('pharmacies').select('id').eq('owner_id', user.id).maybeSingle();
                pid = owned?.id;
                if (!pid) {
                    const { data: prof } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single();
                    pid = prof?.pharmacy_id;
                }
            }
            setPharmacyId(pid);
        };
        fetchContext();
    }, []);

    useEffect(() => {
        if (pharmacyId) fetchPromotions();
    }, [pharmacyId]);

    const fetchPromotions = async () => {
        setLoading(true);
        // Fetch all active promotions
        const { data: activePromos, error: promoError } = await supabase
            .from('promotions')
            .select('*')
            .eq('active', true)
            .gte('end_date', new Date().toISOString().split('T')[0]);

        if (promoError) {
            console.error('Error fetching promos:', promoError);
            setLoading(false);
            return;
        }

        // Fetch user's participation status
        const { data: participations, error: partError } = await supabase
            .from('promotion_participants')
            .select('*')
            .eq('pharmacy_id', pharmacyId);

        if (partError) console.error('Error fetching participations:', partError);

        // Merge data
        const merged = activePromos?.map(promo => {
            const part = participations?.find(p => p.promotion_id === promo.id);
            return {
                ...promo,
                participation_status: part?.status || 'none', // none, pending, accepted, rejected
                participation_id: part?.id
            };
        });

        setPromotions(merged || []);
        setLoading(false);
    };

    const handleJoin = async (promoId: string) => {
        if (!pharmacyId) return;
        try {
            const { error } = await supabase
                .from('promotion_participants')
                .insert([{
                    promotion_id: promoId,
                    pharmacy_id: pharmacyId,
                    status: 'accepted'
                }]);

            if (error) throw error;
            alert('Você entrou na campanha! 🎉');
            fetchPromotions();
        } catch (error: any) {
            console.error('Error joining:', error);
            alert('Erro ao entrar na campanha.');
        }
    };

    const handleUpdateStatus = async (promoId: string, status: 'accepted' | 'rejected') => {
        if (!pharmacyId) return;
        try {
            // Check if record exists first
            const { data: existing } = await supabase
                .from('promotion_participants')
                .select('id')
                .eq('promotion_id', promoId)
                .eq('pharmacy_id', pharmacyId)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('promotion_participants')
                    .update({ status })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('promotion_participants')
                    .insert([{
                        promotion_id: promoId,
                        pharmacy_id: pharmacyId,
                        status: status
                    }]);
                if (error) throw error;
            }

            alert(status === 'accepted' ? 'Participação confirmada!' : 'Participação recusada.');
            fetchPromotions();
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status.');
        }
    };

    return (
        <MerchantLayout activeTab="promotions" title="Campanhas & Promoções">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">
                        Campanhas da Rede
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                        Participe das ações de marketing e aumente suas vendas.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                ) : promotions.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-zinc-800 rounded-[32px] border border-slate-100 dark:border-white/5">
                        <MaterialIcon name="campaign" className="text-6xl text-slate-300 mb-4" />
                        <h3 className="text-lg font-black text-slate-900 dark:text-white italic">Nenhuma campanha ativa</h3>
                        <p className="text-sm text-slate-500">Fique atento às novidades!</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {promotions.map(promo => (
                            <div key={promo.id} className="bg-white dark:bg-zinc-800 rounded-[32px] p-6 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden group">
                                {/* Banner Preview */}
                                <div className="md:w-64 h-40 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 dark:border-white/5 relative">
                                    {promo.banner_url ? (
                                        <img src={promo.banner_url} alt={promo.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <MaterialIcon name="campaign" className="text-5xl text-primary/40" />
                                    )}
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <h3 className="text-xl font-black italic text-slate-900 dark:text-white mb-2">{promo.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4 line-clamp-2">
                                        {promo.description || 'Campanha oficial da rede. Participe para ganhar destaque no app e aumentar o fluxo de clientes.'}
                                    </p>

                                    <div className="flex flex-wrap gap-4 items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <MaterialIcon name="calendar_today" className="text-sm" />
                                            {new Date(promo.start_date).toLocaleDateString()} - {new Date(promo.end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Area */}
                                <div className="flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                                    {promo.participation_status === 'accepted' ? (
                                        <>
                                            <div className="bg-green-500/10 text-green-500 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs border border-green-500/20">
                                                <MaterialIcon name="check_circle" />
                                                Participando
                                            </div>
                                            <button
                                                onClick={() => handleUpdateStatus(promo.id, 'rejected')}
                                                className="text-red-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline text-center"
                                            >
                                                Sair da Campanha
                                            </button>
                                        </>
                                    ) : promo.participation_status === 'rejected' ? (
                                        <>
                                            <div className="bg-red-500/10 text-red-500 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs border border-red-500/20 opacity-70">
                                                <MaterialIcon name="block" />
                                                Recusado
                                            </div>
                                            <button
                                                onClick={() => handleUpdateStatus(promo.id, 'accepted')}
                                                className="text-primary hover:text-green-500 text-[10px] font-black uppercase tracking-widest hover:underline text-center"
                                            >
                                                Entrar Novamente
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(promo.id, 'accepted')}
                                                className="bg-primary hover:bg-primary/90 text-background-dark py-3 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <MaterialIcon name="thumb_up" />
                                                Participar
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(promo.id, 'rejected')}
                                                className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 py-3 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                                            >
                                                Agora Não
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MerchantLayout>
    );
};

export default MerchantPromotions;
