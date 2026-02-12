import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../../components/Shared';


export const SystemSettings = ({ profile }: { profile: any }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'finance' | 'ads'>('general');
    const defaultKeys = [
        'google_maps_api_key', 'whatsapp_api_url', 'whatsapp_api_key', 'whatsapp_instance_id',
        'global_charge_per_order', 'global_fixed_fee', 'global_charge_percentage', 'global_percentage_fee',
        'mp_public_key', 'mp_access_token', 'asaas_api_key', 'admob_enabled',
        'admob_app_id_android', 'admob_banner_id_android', 'admob_interstitial_id_android',
        'admob_app_open_id_android', 'admob_rewarded_id_android', 'admob_rewarded_interstitial_id_android',
        'admob_native_id_android', 'primary_color', 'background_color'
    ];

    const [settings, setSettings] = useState<Record<string, string>>(
        defaultKeys.reduce((acc, key) => ({ ...acc, [key]: '' }), {})
    );
    const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadSettings = async () => {
            const { data } = await supabase.from('system_settings').select('*');
            if (data) {
                const settingsMap: Record<string, string> = {};
                data.forEach(s => settingsMap[s.key] = s.value || '');
                setSettings(prev => ({ ...prev, ...settingsMap }));
                setOriginalSettings({ ...settingsMap });
            }
        };
        loadSettings();
    }, []);

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // Alerta de segurança para App ID - Verifica se mudou em relação ao banco
        if (settings['admob_app_id_android'] !== originalSettings['admob_app_id_android']) {
            const confirmBuild = window.confirm("🚨 ATENÇÃO: Você alterou o APP ID. Isso invalida o seu aplicativo atual. Você terá que gerar um NOVO APK/AAB e enviar para a Google Play para que os anúncios voltem a funcionar. Deseja salvar mesmo assim?");
            if (!confirmBuild) return;
        }

        setIsSaving(true);
        setSuccess(false);

        // Mapeamos as chaves que queremos garantir que existam no banco
        const keysToSave = [
            'google_maps_api_key',
            'whatsapp_api_url',
            'whatsapp_api_key',
            'whatsapp_instance_id',
            'global_charge_per_order',
            'global_fixed_fee',
            'global_charge_percentage',
            'global_percentage_fee',
            'mp_public_key',
            'mp_access_token',
            'asaas_api_key',
            'admob_enabled',
            'admob_app_id_android',
            'admob_banner_id_android',
            'admob_interstitial_id_android',
            'admob_app_open_id_android',
            'admob_rewarded_id_android',
            'admob_rewarded_interstitial_id_android',
            'admob_native_id_android',
            'primary_color',
            'background_color'
        ];

        const settingsArray = keysToSave.map(key => ({
            key,
            value: settings[key] || '',
            description: 'Configuração do Sistema'
        }));

        const { error } = await supabase
            .from('system_settings')
            .upsert(settingsArray, { onConflict: 'key' });

        if (error) {
            console.error("Erro ao salvar configurações:", error);
            alert("Erro ao salvar: Verifique suas permissões.");
        } else {
            setSuccess(true);
            setOriginalSettings({ ...settings });
            setTimeout(() => setSuccess(false), 3000);
        }
        setIsSaving(false);
    };

    const handleTestWhatsApp = async () => {
        const waUrl = settings['whatsapp_api_url'];
        const waKey = settings['whatsapp_api_key'];
        const waInstance = settings['whatsapp_instance_id'];

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

    const AdBlockInfo = ({ title, description, tip }: { title: string, description: string, tip: string }) => (
        <div className="group relative">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{title}</span>
                <MaterialIcon name="info" className="text-[14px] text-slate-500 cursor-help" />
            </div>
            <p className="text-[9px] text-slate-400 italic mb-2 leading-tight pr-4">{description}</p>
            {/* Tooltip on Hover */}
            <div className="invisible group-hover:visible absolute z-50 bg-slate-900 text-white text-[10px] p-3 rounded-xl shadow-2xl -top-2 left-full ml-4 w-64 border border-white/10 backdrop-blur-xl animate-fade-in">
                <div className="flex items-center gap-2 mb-1 text-primary">
                    <MaterialIcon name="lightbulb" className="text-xs" />
                    <span className="font-bold uppercase tracking-tighter">Dica Estratégica</span>
                </div>
                {tip}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-8 px-8 flex items-center justify-between p-5">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tighter italic text-slate-900 dark:text-white">Ajustes da Plataforma</h1>
                    <div className="flex gap-4 mt-2">
                        {[
                            { id: 'general', label: 'Geral', icon: 'settings' },
                            { id: 'finance', label: 'Financeiro', icon: 'payments' },

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
                                    <input
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                        value={settings['primary_color'] || '#13EC6D'}
                                        onChange={(e) => handleChange('primary_color', e.target.value)}
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Cor de Fundo</span>
                                    <input
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                        value={settings['background_color'] || '#0d1b13'}
                                        onChange={(e) => handleChange('background_color', e.target.value)}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-6 space-y-6">
                            <h3 className="text-lg font-black italic border-b border-white/5 pb-4">Conectividade</h3>
                            <div className="space-y-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Google Maps Key</span>
                                    <input
                                        type="password"
                                        placeholder="Chave da API"
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                        value={settings['google_maps_api_key'] || ''}
                                        onChange={(e) => handleChange('google_maps_api_key', e.target.value)}
                                    />
                                </label>
                                <div className="h-px bg-white/5"></div>
                                <label className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">WhatsApp API URL</span>
                                        <button onClick={handleTestWhatsApp} disabled={isTesting} className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">Testar Envio</button>
                                    </div>
                                    <input
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                        value={settings['whatsapp_api_url'] || ''}
                                        onChange={(e) => handleChange('whatsapp_api_url', e.target.value)}
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">WA Token</span>
                                        <input
                                            type="password"
                                            className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                            value={settings['whatsapp_api_key'] || ''}
                                            onChange={(e) => handleChange('whatsapp_api_key', e.target.value)}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">WA Instance</span>
                                        <input
                                            className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                            value={settings['whatsapp_instance_id'] || ''}
                                            onChange={(e) => handleChange('whatsapp_instance_id', e.target.value)}
                                        />
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
                                        <input
                                            type="checkbox"
                                            className="accent-primary size-5"
                                            checked={settings['global_charge_per_order'] === 'true'}
                                            onChange={(e) => handleChange('global_charge_per_order', e.target.checked ? 'true' : 'false')}
                                        />
                                        <span className="font-black uppercase tracking-widest text-xs">Ativar Taxa Fixa</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="h-12 w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 text-sm font-bold"
                                            placeholder="0.00"
                                            value={settings['global_fixed_fee'] || ''}
                                            onChange={(e) => handleChange('global_fixed_fee', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
                                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="accent-primary size-5"
                                            checked={settings['global_charge_percentage'] === 'true'}
                                            onChange={(e) => handleChange('global_charge_percentage', e.target.checked ? 'true' : 'false')}
                                        />
                                        <span className="font-black uppercase tracking-widest text-xs">Ativar Taxa Percentual</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black">%</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="h-12 w-full bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold"
                                            placeholder="0.0"
                                            value={settings['global_percentage_fee'] || ''}
                                            onChange={(e) => handleChange('global_percentage_fee', e.target.value)}
                                        />
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
                                        <input
                                            className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-xs font-mono"
                                            placeholder="APP_USR-..."
                                            value={settings['mp_public_key'] || ''}
                                            onChange={(e) => handleChange('mp_public_key', e.target.value)}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Access Token</span>
                                        <input
                                            type="password"
                                            className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-xs font-mono"
                                            placeholder="APP_USR-..."
                                            value={settings['mp_access_token'] || ''}
                                            onChange={(e) => handleChange('mp_access_token', e.target.value)}
                                        />
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
                                        <input
                                            type="password"
                                            className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-xs font-mono"
                                            placeholder="$a..."
                                            value={settings['asaas_api_key'] || ''}
                                            onChange={(e) => handleChange('asaas_api_key', e.target.value)}
                                        />
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
                                        <input
                                            type="checkbox"
                                            className="accent-blue-500 size-5"
                                            checked={settings['admob_enabled'] === 'true'}
                                            onChange={(e) => handleChange('admob_enabled', e.target.checked ? 'true' : 'false')}
                                        />
                                        <span className="font-black uppercase tracking-widest text-xs">Exibir Anúncios</span>
                                    </label>
                                    <p className="text-[10px] text-slate-500">
                                        Ao ativar, os banners aparecerão na tela inicial do app do cliente.
                                    </p>
                                </div>

                                <label className="flex flex-col gap-2">
                                    <AdBlockInfo
                                        title="App ID (Android)"
                                        description="CPF do seu aplicativo. Vincula o código à sua conta AdMob."
                                        tip="CUIDADO: Se mudar este ID, você deve gerar uma VERSÃO NOVA do aplicativo e subir na loja."
                                    />
                                    <input
                                        placeholder="ca-app-pub-3940256099942544~3347511713"
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                        value={settings['admob_app_id_android'] || ''}
                                        onChange={(e) => handleChange('admob_app_id_android', e.target.value)}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#193324] rounded-[32px] border border-slate-200 dark:border-white/5 p-8 space-y-6">
                            <h3 className="text-lg font-black italic border-b border-white/5 pb-4">Blocos de Anúncios</h3>

                            <label className="flex flex-col gap-2">
                                <AdBlockInfo
                                    title="Banner ID (Home)"
                                    description="Anúncio pequeno e fixo. Ideal para a base da tela inicial."
                                    tip="É o que tem mais visualizações. Ótimo para manter a conta sempre ativa."
                                />
                                <input
                                    placeholder="ca-app-pub-.../..."
                                    className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                    value={settings['admob_banner_id_android'] || ''}
                                    onChange={(e) => handleChange('admob_banner_id_android', e.target.value)}
                                />
                            </label>

                            <label className="flex flex-col gap-2">
                                <AdBlockInfo
                                    title="Interstitial ID"
                                    description="Anúncio de tela cheia que 'pula' na troca de telas."
                                    tip="Use em transições importantes, como ao confirmar um pedido ou fechar o carrinho."
                                />
                                <input
                                    placeholder="ca-app-pub-.../..."
                                    className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                    value={settings['admob_interstitial_id_android'] || ''}
                                    onChange={(e) => handleChange('admob_interstitial_id_android', e.target.value)}
                                />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="flex flex-col gap-2">
                                    <AdBlockInfo
                                        title="App Open ID"
                                        description="Anúncio de abertura. Aparece logo que o app inicia."
                                        tip="Monetiza cada vez que o cliente abre o app para conferir o status de um pedido."
                                    />
                                    <input
                                        placeholder="ca-app-pub-.../..."
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                        value={settings['admob_app_open_id_android'] || ''}
                                        onChange={(e) => handleChange('admob_app_open_id_android', e.target.value)}
                                    />
                                </label>

                                <label className="flex flex-col gap-2">
                                    <AdBlockInfo
                                        title="Rewarded ID"
                                        description="Vídeo premiado. O usuário assiste para ganhar algo."
                                        tip="É o que gera MAIS dinheiro. Use para dar frete grátis ou cupons extras de desconto."
                                    />
                                    <input
                                        placeholder="ca-app-pub-.../..."
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                        value={settings['admob_rewarded_id_android'] || ''}
                                        onChange={(e) => handleChange('admob_rewarded_id_android', e.target.value)}
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="flex flex-col gap-2">
                                    <AdBlockInfo
                                        title="Rew. Interstitial"
                                        description="Intersticial com recompensa passiva."
                                        tip="Menos cansativo que o vídeo longo e ainda gera uma receita premium."
                                    />
                                    <input
                                        placeholder="ca-app-pub-.../..."
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                        value={settings['admob_rewarded_interstitial_id_android'] || ''}
                                        onChange={(e) => handleChange('admob_rewarded_interstitial_id_android', e.target.value)}
                                    />
                                </label>

                                <label className="flex flex-col gap-2">
                                    <AdBlockInfo
                                        title="Native ID"
                                        description="Anúncio 'camuflado' que imita o design do app."
                                        tip="Ideal para colocar no meio da lista de farmácias ou produtos sugeridos."
                                    />
                                    <input
                                        placeholder="ca-app-pub-.../..."
                                        className="h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                                        value={settings['admob_native_id_android'] || ''}
                                        onChange={(e) => handleChange('admob_native_id_android', e.target.value)}
                                    />
                                </label>
                            </div>

                            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 mt-4 backdrop-blur-md">
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-2">
                                    <MaterialIcon name="warning" className="text-sm" />
                                    Regra de Ouro
                                </p>
                                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                                    Nunca clique nos próprios anúncios ou peça para conhecidos clicarem. O Google detecta padrões e pode banir sua conta permanentemente em 24h.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
