import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';

export const SystemSettings = ({ profile }: { profile: any }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'finance' | 'notifications' | 'ads'>('general');

    useEffect(() => {
        const loadSettings = async () => {
            const { data } = await supabase.from('system_settings').select('*');
            if (data) {
                const settingsMap: any = {};
                data.forEach(s => settingsMap[s.key] = s.value);

                const mappings: any = {
                    'google_maps_api_key': 'google_maps_key',
                    'whatsapp_api_url': 'wa_api_url',
                    'whatsapp_api_key': 'wa_api_key',
                    'whatsapp_instance_id': 'wa_instance_id',
                    'global_charge_per_order': 'global_charge_order',
                    'global_fixed_fee': 'global_fixed_fee',
                    'global_charge_percentage': 'global_charge_percent',
                    'global_percentage_fee': 'global_perc_fee',
                    'mp_public_key': 'mp_pub_key',
                    'mp_access_token': 'mp_acc_token',
                    'asaas_api_key': 'asaas_key',
                    'admob_enabled': 'admob_enabled',
                    'admob_app_id_android': 'admob_app_id',
                    'admob_banner_id_android': 'admob_banner_id',
                    'admob_interstitial_id_android': 'admob_interstitial_id'
                };

                Object.entries(mappings).forEach(([key, id]) => {
                    const input = document.getElementById(id as string) as HTMLInputElement;
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = settingsMap[key] === 'true';
                        } else {
                            input.value = settingsMap[key] || '';
                        }
                    }
                });
            }
        };
        loadSettings();
    }, [activeTab]);

    const handleSave = async () => {
        setIsSaving(true);
        setSuccess(false);

        const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
        const getCheck = (id: string) => (document.getElementById(id) as HTMLInputElement)?.checked ? 'true' : 'false';

        const settings = [
            { key: 'google_maps_api_key', value: getVal('google_maps_key') },
            { key: 'whatsapp_api_url', value: getVal('wa_api_url') },
            { key: 'whatsapp_api_key', value: getVal('wa_api_key') },
            { key: 'whatsapp_instance_id', value: getVal('wa_instance_id') },
            { key: 'global_charge_per_order', value: getCheck('global_charge_order') },
            { key: 'global_fixed_fee', value: getVal('global_fixed_fee') },
            { key: 'global_charge_percentage', value: getCheck('global_charge_percent') },
            { key: 'global_percentage_fee', value: getVal('global_perc_fee') },
            { key: 'mp_public_key', value: getVal('mp_pub_key') },
            { key: 'mp_access_token', value: getVal('mp_acc_token') },
            { key: 'asaas_api_key', value: getVal('asaas_key') },
            { key: 'admob_enabled', value: getCheck('admob_enabled') },
            { key: 'admob_app_id_android', value: getVal('admob_app_id') },
            { key: 'admob_banner_id_android', value: getVal('admob_banner_id') },
            { key: 'admob_interstitial_id_android', value: getVal('admob_interstitial_id') }
        ];

        const { error } = await supabase
            .from('system_settings')
            .upsert(settings.map(s => ({ ...s, description: 'Configuração do Sistema' })), { onConflict: 'key' });

        if (error) {
            console.error("Erro ao salvar configurações:", error);
            alert("Erro ao salvar: Verifique suas permissões.");
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setIsSaving(false);
    };

    const handleTestWhatsApp = async () => {
        const waUrl = (document.getElementById('wa_api_url') as HTMLInputElement)?.value;
        const waKey = (document.getElementById('wa_api_key') as HTMLInputElement)?.value;
        const waInstance = (document.getElementById('wa_instance_id') as HTMLInputElement)?.value;

        if (!waUrl || !waKey || !waInstance) {
            alert("Preencha todos os campos do WhatsApp antes de testar.");
            return;
        }

        setIsTesting(true);
        try {
            const { error } = await supabase.functions.invoke('whatsapp-notifier', {
                body: {
                    record: {
                        id: 'test-id',
                        total_price: '0.00',
                        customer_name: 'Teste Admin',
                        address: 'Rua de Teste, 123',
                        pharmacy_id: 'd9b33703-e85d-4f1b-bd57-8677c768837e'
                    }
                }
            });

            if (error) throw error;
            alert("🚀 Teste enviado! Verifique o WhatsApp.");
        } catch (err: any) {
            console.error("Erro no teste de WhatsApp:", err);
            alert(`Erro no teste: ${err.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Ajustes da Plataforma</h1>
                    <div className="flex gap-4 mt-2">
                        {[
                            { id: 'general', label: 'Geral', icon: 'settings' },
                            { id: 'finance', label: 'Financeiro', icon: 'payments' },
                            { id: 'notifications', label: 'Avisos', icon: 'notifications' },
                            { id: 'ads', label: 'Anúncios', icon: 'campaign' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
                            >
                                <MaterialIcon name={tab.icon} className="text-sm" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-background-dark flex h-10 px-6 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-90 gap-2 text-xs font-black uppercase tracking-widest"
                >
                    <MaterialIcon name={success ? "check_circle" : (isSaving ? "sync" : "save")} className={isSaving ? "animate-spin" : ""} />
                    <span>{success ? "Salvo!" : "Salvar"}</span>
                </button>
            </header>

            <main className="p-4 md:p-8">
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-6 space-y-6">
                            <h3 className="text-lg font-black italic border-b border-white/5 pb-4">Identidade Visual</h3>
                            <div className="flex items-center gap-6">
                                <div className="size-20 bg-black/20 rounded-2xl border border-white/10 flex items-center justify-center">
                                    <MaterialIcon name="image" className="text-3xl text-primary/40" />
                                </div>
                                <button className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">Trocar Logo</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Cor Primária</span>
                                    <input className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" defaultValue="#13EC6D" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Cor de Fundo</span>
                                    <input className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" defaultValue="#0d1b13" />
                                </label>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-6 space-y-6">
                            <h3 className="text-lg font-black italic border-b border-white/5 pb-4">Conectividade</h3>
                            <div className="space-y-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Google Maps Key</span>
                                    <input id="google_maps_key" type="password" placeholder="Chave da API" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                </label>
                                <div className="h-px bg-white/5"></div>
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">WhatsApp API URL</span>
                                        <button onClick={handleTestWhatsApp} disabled={isTesting} className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">Testar Envio</button>
                                    </div>
                                    <input id="wa_api_url" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">WA Token</span>
                                        <input id="wa_api_key" type="password" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">WA Instance</span>
                                        <input id="wa_instance_id" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <MaterialIcon name="public" />
                                </div>
                                <h3 className="text-lg font-black italic">Taxas Padrão (Globais)</h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-6 italic">Taxas aplicadas caso a loja não possua regra individual.</p>

                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
                                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                        <input id="global_charge_order" type="checkbox" className="accent-primary size-5" />
                                        <span className="font-black uppercase tracking-widest text-xs">Ativar Taxa Fixa</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">R$</span>
                                        <input id="global_fixed_fee" type="number" step="0.01" className="h-12 w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-bold" placeholder="0.00" />
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
                                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                        <input id="global_charge_percent" type="checkbox" className="accent-primary size-5" />
                                        <span className="font-black uppercase tracking-widest text-xs">Ativar Taxa Percentual</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black">%</span>
                                        <input id="global_perc_fee" type="number" step="0.1" className="h-12 w-full bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" placeholder="0.0" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8">
                                <h3 className="text-lg font-black italic mb-6 flex items-center gap-2">
                                    <MaterialIcon name="payments" className="text-primary" />
                                    Mercado Pago
                                </h3>
                                <div className="space-y-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Public Key</span>
                                        <input id="mp_pub_key" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-xs font-mono" placeholder="APP_USR-..." />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Access Token</span>
                                        <input id="mp_acc_token" type="password" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-xs font-mono" placeholder="APP_USR-..." />
                                    </label>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8">
                                <h3 className="text-lg font-black italic mb-6 flex items-center gap-2">
                                    <MaterialIcon name="wallet" className="text-primary" />
                                    Asaas
                                </h3>
                                <div className="space-y-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">API Key</span>
                                        <input id="asaas_key" type="password" className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-xs font-mono" placeholder="$a..." />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ads' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <MaterialIcon name="campaign" />
                                </div>
                                <h3 className="text-lg font-black italic">Google AdMob</h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-6 italic">Monetize o aplicativo exibindo banners de publicidade.</p>

                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
                                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                        <input id="admob_enabled" type="checkbox" className="accent-blue-500 size-5" />
                                        <span className="font-black uppercase tracking-widest text-xs">Exibir Anúncios</span>
                                    </label>
                                    <p className="text-[10px] text-slate-500">
                                        Ao ativar, os banners aparecerão na tela inicial do app do cliente.
                                    </p>
                                </div>

                                <label className="flex flex-col gap-2 opacity-50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">App ID (Android)</span>
                                    <input id="admob_app_id" placeholder="ca-app-pub-..." className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                    <span className="text-[9px] text-red-400 font-bold">* Requer rebuild do app se alterado (Atualize o AndroidManifest.xml)</span>
                                </label>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                            <h3 className="text-lg font-black italic border-b border-white/5 pb-4">Blocos de Anúncios</h3>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Banner ID (Home)</span>
                                <input id="admob_banner_id" placeholder="ca-app-pub-.../..." className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                <span className="text-[10px] text-slate-500">ID do bloco de anúncio tipo Banner</span>
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Interstitial ID (Opcional)</span>
                                <input id="admob_interstitial_id" placeholder="ca-app-pub-.../..." className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold" />
                                <span className="text-[10px] text-slate-500">ID do bloco de anúncio tipo Interstitial (Tela cheia)</span>
                            </label>

                            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 mt-4">
                                <p className="text-[10px] text-blue-400 font-bold">
                                    💡 Dica: Use os IDs de teste do Google durante o desenvolvimento para evitar banimento da conta.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
