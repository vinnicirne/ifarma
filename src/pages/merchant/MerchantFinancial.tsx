import { useState, useEffect } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { Toast } from '../../components/Toast';

const Toggle = ({ check, onChange, label, disabled = false }: any) => (
    <div className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 ${disabled ? 'opacity-50' : ''}`}>
        <span className="font-bold text-slate-700 dark:text-white text-sm">{label}</span>
        <button
            onClick={() => !disabled && onChange(!check)}
            className={`w-12 h-6 rounded-full transition-colors relative ${check ? 'bg-primary' : 'bg-slate-300 dark:bg-white/20'}`}
        >
            <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${check ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
);

const MerchantFinancial = () => {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any>({
        accepts_cash: true,
        accepts_pix: true,
        accepts_debit: true,
        accepts_credit: true,
        pix_key: '',
        pix_key_type: 'random'
    });
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if Admin Impersonating
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            let pId = null;

            if (profile?.role === 'admin') {
                const impersonatedId = localStorage.getItem('impersonatedPharmacyId');
                if (impersonatedId) {
                    pId = impersonatedId;
                }
            }

            if (!pId) {
                // Get Pharmacy by Owner
                const { data: pharm } = await supabase
                    .from('pharmacies')
                    .select('id')
                    .eq('owner_id', user.id)
                    .single();
                if (pharm) pId = pharm.id;
            }

            if (!pId) return;
            setPharmacyId(pId);

            // Get Settings
            const { data: paySettings, error } = await supabase
                .from('pharmacy_payment_settings')
                .select('*')
                .eq('pharmacy_id', pId)
                .single();

            if (paySettings) {
                setSettings(paySettings);
            } else {
                // If no settings exist, create default
                const { data: newSettings } = await supabase
                    .from('pharmacy_payment_settings')
                    .insert([{ pharmacy_id: pId }])
                    .select()
                    .single();

                if (newSettings) setSettings(newSettings);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!pharmacyId) return;
        try {
            const { error } = await supabase
                .from('pharmacy_payment_settings')
                .update({
                    accepts_cash: settings.accepts_cash,
                    accepts_pix: settings.accepts_pix,
                    accepts_debit: settings.accepts_debit,
                    accepts_credit: settings.accepts_credit,
                    pix_key: settings.pix_key,
                    pix_key_type: settings.pix_key_type,
                    updated_at: new Date().toISOString()
                })
                .eq('pharmacy_id', pharmacyId);

            if (error) throw error;
            showToast('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Error saving:', error);
            showToast('Erro ao salvar configurações.', 'error');
        }
    };

    return (
        <MerchantLayout activeTab="financial" title="Financeiro">
            <div className="max-w-4xl mx-auto pb-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-black italic text-slate-900 dark:text-white tracking-tighter">Configuração Financeira</h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Defina como sua farmácia recebe pagamentos.</p>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Carregando configurações...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Payment Methods */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Formas de Pagamento</h3>
                            <div className="bg-white dark:bg-zinc-800 p-6 rounded-[32px] border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">

                                <Toggle
                                    label="Aceitar Dinheiro (Espécie)"
                                    check={settings.accepts_cash}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_cash: v })}
                                />

                                <Toggle
                                    label="Aceitar Cartão de Débito (Maquininha)"
                                    check={settings.accepts_debit}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_debit: v })}
                                />

                                <Toggle
                                    label="Aceitar Cartão de Crédito (Maquininha)"
                                    check={settings.accepts_credit}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_credit: v })}
                                />

                                <Toggle
                                    label="Aceitar PIX (Na Entrega ou App)"
                                    check={settings.accepts_pix}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_pix: v })}
                                />

                            </div>

                            {/* PIX Settings */}
                            {settings.accepts_pix && (
                                <div className="bg-white dark:bg-zinc-800 p-6 rounded-[32px] border border-slate-200 dark:border-white/5 space-y-4 shadow-sm animate-fade-in">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2">Configuração do PIX</h4>

                                    <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                                        <span className="material-symbols-outlined text-blue-500 mt-1">info</span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            Ao ativar o <strong>PIX</strong>, o cliente verá essa opção no checkout.
                                            <br /><br />
                                            Como o pagamento é feito diretamente para a loja, você poderá:
                                            <ul className="list-disc ml-4 mt-2 mb-2">
                                                <li>Receber na entrega (Maquininha/QR Code).</li>
                                                <li>Informar sua chave pelo Chat do pedido.</li>
                                            </ul>
                                            Não é necessário cadastrar chaves aqui no sistema.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Online Payments (Future) */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white">Pagamento Online</h3>

                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[32px] text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full bg-blend-overlay blur-3xl -mr-16 -mt-16"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-3xl bg-white/20 p-2 rounded-xl">account_balance_wallet</span>
                                        <h4 className="text-xl font-black italic">Mercado Pago</h4>
                                    </div>

                                    <p className="text-sm opacity-90 mb-6 font-medium">
                                        Receba pagamentos online diretamente pelo App. Cartão de Crédito com segurança e PIX Automático.
                                    </p>

                                    <button disabled className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl w-full flex items-center justify-center gap-2 cursor-not-allowed border border-white/10">
                                        <span className="material-symbols-outlined text-sm">lock_clock</span>
                                        Em Breve
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 rounded-[32px] border border-dashed border-slate-200 dark:border-white/10 text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Resumo Financeiro</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    O extrato de repasses estará disponível assim que a integração online for ativada.
                                </p>
                            </div>
                        </div>

                    </div>
                )}

                {/* Save Button */}
                <div className="fixed bottom-8 right-8">
                    <button
                        onClick={handleSave}
                        className="bg-primary hover:bg-emerald-600 text-white shadow-xl shadow-primary/30 p-4 rounded-full flex items-center gap-3 font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                        <span className="material-symbols-outlined">save</span>
                        <span className="pr-2">Salvar Alterações</span>
                    </button>
                </div>

            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </MerchantLayout >
    );
};

export default MerchantFinancial;
