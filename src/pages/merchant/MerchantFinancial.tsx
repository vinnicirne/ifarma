import { useState, useEffect } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { isUuid } from '../../lib/uuidUtils';
import { Toast } from '../../components/Toast';
import { formatCurrency } from '../../types/billing';
import {
    Wallet,
    Banknote,
    QrCode,
    CreditCard,
    Smartphone,
    Info,
    Save,
    Lock,
    Calendar,
    Filter,
    Download,
    FileText
} from 'lucide-react';

const Toggle = ({ check, onChange, label, disabled = false }: any) => (
    <div className={`flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-all ${disabled ? 'opacity-40' : 'hover:border-white/10'}`}>
        <span className="font-bold text-slate-300 text-xs uppercase tracking-widest">{label}</span>
        <button
            onClick={() => !disabled && onChange(!check)}
            className={`w-12 h-6 rounded-full transition-all relative ${check ? 'bg-primary' : 'bg-white/10'}`}
        >
            <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-md ${check ? 'left-7 font-black' : 'left-1'}`} />
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

    // Estados para faturas
    const [invoices, setInvoices] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchSettings();
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        if (!pharmacyId) return;

        try {
            setLoading(true);

            // Construir query com filtros
            let query = supabase
                .from('billing_invoices')
                .select('*')
                .eq('pharmacy_id', pharmacyId);

            // Aplicar filtros de mês e ano se selecionados
            if (selectedMonth || selectedYear) {
                const startDate = new Date(`${selectedYear}-${selectedMonth}-01`);
                const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0); // Último dia do mês

                query = query
                    .gte('due_date', startDate.toISOString())
                    .lt('due_date', endDate.toISOString());
            }

            // Aplicar filtro de status se selecionado
            if (selectedStatus !== 'all') {
                query = query.eq('status', selectedStatus);
            }

            const { data, error } = await query
                .order('due_date', { ascending: false })
                .limit(50);

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showToast('Erro ao carregar faturas.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let pId = localStorage.getItem('impersonatedPharmacyId');
            if (!pId || !isUuid(pId)) {
                const { data: pharm } = await supabase
                    .from('pharmacies')
                    .select('id')
                    .eq('owner_id', user.id)
                    .single();
                if (pharm) pId = pharm.id;
            }

            if (!pId) {
                const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single();
                pId = profile?.pharmacy_id;
            }

            if (!pId) return;
            setPharmacyId(pId);

            const { data: paySettings } = await supabase
                .from('pharmacy_payment_settings')
                .select('*')
                .eq('pharmacy_id', pId)
                .single();

            if (paySettings) {
                setSettings(paySettings);
            } else {
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
        <MerchantLayout activeTab="financial" title="Recebimento">
            <div className="max-w-5xl mx-auto pb-20 animate-fade-in">

                {/* Header */}
                <div className="mb-12">
                    <h2 className="text-3xl font-[900] italic text-white tracking-tighter uppercase leading-none">Meios de Recebimento</h2>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Configure como sua farmácia recebe dos clientes finais.</p>
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Sincronizando mídias de pagamento...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Direct Payments Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Banknote className="text-primary" size={20} />
                                <h3 className="text-lg font-black italic text-white uppercase tracking-tight">Recebimento Direto</h3>
                            </div>

                            <div className="bg-[#111a16] border border-white/5 p-8 rounded-[40px] space-y-4 shadow-xl">
                                <Toggle
                                    label="Dinheiro (Espécie)"
                                    check={settings.accepts_cash}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_cash: v })}
                                />

                                <Toggle
                                    label="PIX na Entrega"
                                    check={settings.accepts_pix}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_pix: v })}
                                />

                                <Toggle
                                    label="Débito (Maquininha)"
                                    check={settings.accepts_debit}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_debit: v })}
                                />

                                <Toggle
                                    label="Crédito (Maquininha)"
                                    check={settings.accepts_credit}
                                    onChange={(v: boolean) => setSettings({ ...settings, accepts_credit: v })}
                                />
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[32px] flex items-start gap-4">
                                <Info className="text-blue-400 shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2 italic">Sobre o PIX Direto</h4>
                                    <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                        Ao ativar o PIX, o cliente verá a opção no checkout. Como o recebimento é direto para sua loja,
                                        você deve apresentar o QR Code da sua maquininha ou chave no ato da entrega.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Digital/In-App Payments */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Smartphone className="text-primary" size={20} />
                                <h3 className="text-lg font-black italic text-white uppercase tracking-tight">Pagamento via App</h3>
                            </div>

                            <div className="relative group overflow-hidden bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] p-10 rounded-[40px] shadow-2xl border border-white/10 min-h-[300px] flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="size-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                            <QrCode size={32} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-[900] italic text-white tracking-tighter uppercase leading-none">Mercado Pago</h4>
                                            <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1 rounded-full uppercase tracking-widest mt-2 inline-block">Módulo Nativo</span>
                                        </div>
                                    </div>

                                    <p className="text-sm font-bold text-white/80 leading-relaxed mb-8">
                                        Libere o pagamento online automático. O cliente paga pelo app e você recebe o repasse direto na sua conta digital.
                                    </p>
                                </div>

                                <button
                                    disabled
                                    className="relative z-10 w-full h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest cursor-not-allowed group-hover:bg-white/20 transition-all"
                                >
                                    <Lock size={18} />
                                    Habilitar em Breve
                                </button>
                            </div>

                            <div className="p-8 bg-zinc-800/20 border border-dashed border-white/5 rounded-[40px] text-center">
                                <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3">Extrato de Repasses</h5>
                                <p className="text-xs text-slate-500 font-bold px-4">
                                    Aqui você verá o saldo disponível para saque assim que a integração online for ativada pelo sistema.
                                </p>
                            </div>
                        </div>

                    </div>
                )}

                {/* Faturas Section */}
                <div className="flex flex-col gap-4">
                    {invoices.length === 0 ? (
                        <div className="p-12 text-center bg-white/5 rounded-[32px] border border-dashed border-white/10">
                            <FileText className="mx-auto text-slate-600 mb-3 opacity-20" size={40} />
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Nenhuma fatura encontrada</p>
                        </div>
                    ) : (
                        invoices.map((invoice) => (
                            <div key={invoice.id} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between hover:bg-white/[0.07] transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className={`size-10 rounded-xl flex items-center justify-center ${invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        <Banknote size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-sm uppercase tracking-tight">Fatura {new Date(invoice.due_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Vence em: {new Date(invoice.due_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-[900] text-lg italic tracking-tighter">{formatCurrency(invoice.amount)}</p>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block ${invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-12 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="h-16 px-12 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4"
                    >
                        <Save size={20} />
                        Salvar Configurações
                    </button>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </MerchantLayout >
    );
};

export default MerchantFinancial;
