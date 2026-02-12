import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const MonetizationManagement = ({ profile }: { profile: any }) => {
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'plans' | 'ads'>('plans');

    // Tabela de Preços Sugeridos para Venda de Ads
    const [adPricing, setAdPricing] = useState({
        price_week: '99.00',
        price_month: '299.00'
    });

    useEffect(() => {
        const loadSettings = async () => {
            const { data } = await supabase.from('system_settings').select('*');
            if (data) {
                const settingsMap: any = {};
                data.forEach(s => settingsMap[s.key] = s.value);
                setAdPricing({
                    price_week: settingsMap['ad_price_week'] || '99.00',
                    price_month: settingsMap['ad_price_month'] || '299.00'
                });
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const settings = [
                { key: 'ad_price_week', value: adPricing.price_week },
                { key: 'ad_price_month', value: adPricing.price_month }
            ];

            const { error } = await supabase
                .from('system_settings')
                .upsert(settings.map(s => ({ ...s, description: 'Preços de Venda de Publicidade' })), { onConflict: 'key' });

            if (error) throw error;
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Erro ao salvar:', err);
            alert('Erro ao salvar os preços.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div>
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Gestão de Receita e Planos</h1>
                    <div className="flex gap-4 mt-2">
                        <button onClick={() => setActiveTab('plans')} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${activeTab === 'plans' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}>
                            <MaterialIcon name="card_membership" className="text-sm" />
                            Assinaturas das Lojas
                        </button>
                        <button onClick={() => setActiveTab('ads')} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${activeTab === 'ads' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}>
                            <MaterialIcon name="campaign" className="text-sm" />
                            Venda de Publicidade
                        </button>
                    </div>
                </div>
                {activeTab === 'ads' && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-6 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                    >
                        <MaterialIcon name={success ? "check_circle" : (isSaving ? "sync" : "save")} className={isSaving ? "animate-spin" : ""} />
                        <span>{success ? "Salvo!" : "Definir Preços"}</span>
                    </button>
                )}
            </header>

            <main className="p-4 md:p-8 pb-20">
                {activeTab === 'plans' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="bg-primary/10 border border-primary/20 p-8 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-5">
                                <div className="size-16 rounded-3xl bg-primary flex items-center justify-center text-background-dark shadow-xl shadow-primary/30">
                                    <MaterialIcon name="account_balance_wallet" className="text-3xl" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black italic">Receita de Assinaturas (MRR)</h4>
                                    <p className="text-xs text-slate-400">Total arrecadado mensalmente através dos lojistas parceiros.</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black italic text-primary">R$ 12.450,00</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Previsão para este mês</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'free', name: 'GRATUITO', price: 'R$ 0', fee: '5%', features: ['Catálogo Básico', 'Pedidos via Chat', 'Sem Banners'], color: 'slate' },
                                { id: 'pro', name: 'PROFISSIONAL', price: 'R$ 99', fee: '3%', features: ['Banners em Destaque', 'Estoque Automático', 'Push Ilimitado'], color: 'blue', isPopular: true },
                                { id: 'premium', name: 'PREMIUM', price: 'R$ 249', fee: '1%', features: ['Taxa Zero no App', 'Suporte VIP 24h', 'Gestão de Entregadores'], color: 'primary' }
                            ].map((plan) => (
                                <div key={plan.id} className={`bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8 flex flex-col relative transition-all hover:scale-[1.02] shadow-xl ${plan.isPopular ? 'ring-2 ring-primary ring-offset-4 ring-offset-[#0d1b13]' : ''}`}>
                                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${plan.color === 'primary' ? 'text-primary' : plan.color === 'blue' ? 'text-blue-500' : 'text-slate-400'}`}>{plan.name}</h3>
                                    <div className="flex items-baseline gap-2 mt-4">
                                        <span className="text-4xl font-black italic">{plan.price}</span>
                                        <span className="text-[10px] font-bold text-slate-500">/mês</span>
                                    </div>
                                    <div className="mt-2 text-xs font-black text-primary italic">Sua Comissão: {plan.fee} por venda</div>

                                    <div className="mt-8 space-y-4 flex-1">
                                        {plan.features.map((feat, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <MaterialIcon name="check_circle" className="text-primary text-sm" />
                                                <span className="text-xs font-medium text-slate-300">{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'ads' && (
                    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8 space-y-8 shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <MaterialIcon name="sell" className="text-2xl" />
                                </div>
                                <h3 className="text-xl font-black italic">Preços de Venda (Anúncios)</h3>
                            </div>

                            <p className="text-xs text-slate-400 italic">Defina quanto você irá cobrar para ativar o selo "Patrocinado" em banners ou lojas.</p>

                            <div className="space-y-6">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Valor por Semana</span>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                        <input
                                            type="number"
                                            value={adPricing.price_week}
                                            onChange={e => setAdPricing({ ...adPricing, price_week: e.target.value })}
                                            className="h-14 w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-bold outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                </label>

                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Valor por Mês (Combo)</span>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                        <input
                                            type="number"
                                            value={adPricing.price_month}
                                            onChange={e => setAdPricing({ ...adPricing, price_month: e.target.value })}
                                            className="h-14 w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-bold outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                </label>
                            </div>

                            <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20">
                                <div className="flex gap-3">
                                    <MaterialIcon name="info" className="text-blue-500" />
                                    <p className="text-[10px] text-slate-300 font-bold leading-relaxed">
                                        Ao vender um anúncio, você cadastra o banner em <span className="text-blue-500">Banners & Ads</span>. O lojista paga diretamente a você (PIX/Dinheiro) e o lucro é 100% seu.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#111a16] p-8 rounded-[32px] border border-white/5 shadow-xl flex flex-col justify-between">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">Receita Direta de Ads</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">Receita Ads (Este Mês)</span>
                                        <p className="text-4xl font-black italic mt-2 text-white">R$ 2.450,00</p>
                                        <div className="flex items-center gap-2 mt-2 text-green-500">
                                            <MaterialIcon name="trending_up" className="text-sm" />
                                            <span className="text-[10px] font-black">+15% vs mês anterior</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Campanhas Vendidas</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-white">Farmácia Vida (Destaque)</span>
                                        <span className="text-primary font-black">R$ 299,00</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs opacity-60">
                                        <span className="text-white">MedSempre (Banner Topo)</span>
                                        <span className="text-primary font-black">R$ 99,00</span>
                                    </div>
                                    <div className="h-px bg-white/5 my-2"></div>
                                    <div className="flex justify-between items-center text-sm font-black italic">
                                        <span>Total</span>
                                        <span>R$ 398,00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
