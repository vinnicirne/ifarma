import React, { useState, useEffect } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import {
    CreditCard,
    Zap,
    ShieldCheck,
    Clock,
    FileText,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    ExternalLink,
    ChevronRight,
    HelpCircle
} from 'lucide-react';
import { formatCurrency, getInvoiceStatusLabel, getSubscriptionStatusLabel } from '../../types/billing';
import { toast } from 'react-hot-toast';

const MerchantBilling = () => {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [currentCycle, setCurrentCycle] = useState<any>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [pixData, setPixData] = useState<{ qr_base64: string; copy_paste?: string; payment_id: string; invoice_url?: string } | null>(null);
    const [showPixModal, setShowPixModal] = useState(false);

    useEffect(() => {
        fetchBillingData();

        // Polling for status updates if pending
        const interval = setInterval(() => {
            if (showPixModal || subscription?.status === 'pending_asaas') {
                fetchBillingData(true); // true = silent
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [showPixModal, subscription?.status]);

    // Close modal if subscription becomes active
    useEffect(() => {
        if (subscription?.status === 'active' && showPixModal) {
            setShowPixModal(false);
            toast.success("Pagamento confirmado! Plano ativado.");
        }
    }, [subscription?.status]);

    // Realtime subscription para billing cycles
    useEffect(() => {
        if (!pharmacyId) return;

        const billingChannel = supabase
            .channel(`billing_cycle_${pharmacyId}`)
            .on('postgres_changes', {
                event: '*', // Listen to ALL changes (UPDATE, INSERT, DELETE)
                schema: 'public',
                table: 'billing_cycles',
                filter: `pharmacy_id=eq.${pharmacyId}`
            }, (payload) => {
                console.log('Faturamento Notificação:', payload.eventType, payload.new);

                // If it's a delete or deactivate, we might need a full refresh
                if (payload.eventType === 'DELETE' || (payload.new && payload.new.status !== 'active')) {
                    fetchBillingData(true);
                    return;
                }

                if (payload.new && payload.new.status === 'active') {
                    setCurrentCycle(payload.new);

                    if (payload.old?.free_orders_used !== payload.new?.free_orders_used) {
                        const used = payload.new.free_orders_used || 0;
                        const limit = subscription?.plan?.free_orders_per_period || 0;
                        const remaining = Math.max(0, limit - used);

                        if (remaining <= 2) {
                            toast(`⚠️ Atenção: você tem apenas ${remaining} pedido${remaining !== 1 ? 's' : ''} grátis!`);
                        }
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(billingChannel);
        };
    }, [pharmacyId, subscription?.plan?.free_orders_per_period]);

    const fetchBillingData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Validate user ID format (UUID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(user.id)) {
                console.error("Invalid User UUID:", user.id);
                return;
            }

            const isUuid = (v: string | null | undefined) =>
                !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

            let pId = localStorage.getItem('impersonatedPharmacyId');

            if (!isUuid(pId)) {
                localStorage.removeItem('impersonatedPharmacyId');
                pId = null;
            }

            if (!pId) {
                const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).maybeSingle();
                pId = profile?.pharmacy_id;

                if (!pId) {
                    const { data: owned, error: ownedErr } = await supabase
                        .from('pharmacies')
                        .select('id')
                        .eq('owner_id', user.id)
                        .maybeSingle();

                    if (ownedErr) console.error("Error fetching owned pharmacy:", ownedErr);
                    pId = owned?.id;
                }
            }

            if (!pId) {
                toast.error("Farmácia não encontrada.");
                return;
            }
            setPharmacyId(pId);

            // 1. Fetch Subscription & Plan
            const { data: sub } = await supabase
                .from('pharmacy_subscriptions')
                .select('*, plan:billing_plans(*)')
                .eq('pharmacy_id', pId)
                .in('status', ['active', 'pending_asaas'])
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            setSubscription(sub);

            // 2. Fetch Current Cycle (Mais robusto: pega o mais recente ativo)
            const { data: cycles, error: cycleErr } = await supabase
                .from('billing_cycles')
                .select('*')
                .eq('pharmacy_id', pId)
                .eq('status', 'active')
                .order('period_start', { ascending: false })
                .limit(1);

            if (cycleErr) console.error("Erro ao buscar ciclo:", cycleErr);
            setCurrentCycle(cycles && cycles.length > 0 ? cycles[0] : null);

            // 3. Fetch Available Plans (for upgrade/selection)
            // Apenas planos ativos
            const { data: plans, error: plansError } = await supabase
                .from('billing_plans')
                .select('*')
                .eq('is_active', true)
                .order('monthly_fee_cents', { ascending: true });

            if (plansError) console.error("Error fetching plans:", plansError);
            console.log("Fetched Plans:", plans);

            setAvailablePlans(plans || []);

        } catch (error: any) {
            console.error("Error fetching billing data:", error);
            toast.error("Erro ao carregar dados financeiros.");
        } finally {
            setLoading(false);
        }
    };

    const handleMigratePlan = async (plan: any) => {
        if (!pharmacyId) return;

        try {
            setLoading(true);
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            if (!token) {
                toast.error("Sessão expirada. Faça login novamente.");
                return;
            }

            const { data, error } = await supabase.functions.invoke('activate-pharmacy-plan', {
                body: {
                    pharmacy_id: pharmacyId,
                    plan_id: plan.id
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (error) throw error;

            if (data?.pix_data) {
                setPixData(data.pix_data);
                setShowPixModal(true);
                toast.success("Pagamento gerado! Finalize para ativar.");
            } else {
                toast.success("Plano atualizado com sucesso!");
                fetchBillingData();
            }

        } catch (error: any) {
            console.error("Error migrating plan:", error);
            toast.error(error.message || "Erro ao migrar plano.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshBilling = async () => {
        await fetchBillingData(true);
        toast.success('Contadores atualizados!');
    };

    const calculatePercentage = () => {
        if (!subscription?.plan || !currentCycle) return 0;
        const limit = subscription.plan.free_orders_per_period;
        if (limit === 0) return 0;
        return Math.min(100, Math.round((currentCycle.free_orders_used / limit) * 100));
    };

    if (loading) {
        return (
            <MerchantLayout activeTab="billing" title="Assinatura e Cobrança">
                <div className="flex flex-col items-center justify-center h-64 animate-pulse">
                    <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest">Sincronizando dados financeiros...</p>
                </div>
            </MerchantLayout>
        );
    }

    return (
        <MerchantLayout activeTab="billing" title="Assinatura e Cobrança">
            {/* Modal PIX Asaas */}
            {showPixModal && pixData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-[#0a0f0d] rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl text-center space-y-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">Pagamento via Pix</h2>
                        <p className="text-xs text-slate-400 font-bold">
                            Escaneie o QR Code abaixo no app do seu banco para pagar a primeira mensalidade
                            ou, se preferir, finalize com cartão de crédito na página de pagamento do Asaas.
                            Assim que o Asaas confirmar o pagamento, o plano será liberado automaticamente.
                        </p>
                        <div className="bg-white rounded-2xl p-3 inline-block">
                            <img
                                src={`data:image/png;base64,${pixData.qr_base64}`}
                                alt="QR Code Pix Asaas"
                                className="w-64 h-64 object-contain"
                            />
                        </div>

                        {pixData.copy_paste && (
                            <div className="mt-4 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Código Copia e Cola</p>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        value={pixData.copy_paste}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-slate-300 font-mono focus:outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pixData.copy_paste || '');
                                            toast.success("Código copiado!");
                                        }}
                                        className="bg-primary/20 hover:bg-primary/30 text-primary px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Copiar
                                    </button>
                                </div>
                            </div>
                        )}
                        {pixData.invoice_url && (
                            <div className="mt-4 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Pagamento com Cartão</p>
                                <button
                                    onClick={() => window.open(pixData.invoice_url!, '_blank')}
                                    className="w-full inline-flex items-center justify-center px-6 h-11 rounded-2xl bg-white text-[#0a0f0d] text-xs font-black uppercase tracking-widest hover:bg-primary transition-all gap-2"
                                >
                                    Pagar com Cartão de Crédito
                                    <ExternalLink size={14} />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setShowPixModal(false)}
                            className="mt-2 inline-flex items-center justify-center px-6 h-11 rounded-2xl bg-primary text-[#0a0f0d] text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">

                {subscription?.status === 'pending_asaas' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-[32px] p-6 flex items-start gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-xl shrink-0">
                            <AlertCircle size={24} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Pagamento em Processamento</h3>
                            <p className="text-slate-400 text-sm font-bold mt-1">
                                Sua assinatura foi criada, mas estamos aguardando a confirmação do gateway de pagamento (Asaas).
                                Isso pode levar alguns instantes. Se o problema persistir, entre em contato com o suporte.
                            </p>
                        </div>
                    </div>
                )}

                {/* Status Hero */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Current Plan Card */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#111a16] to-[#0a0f0d] border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="size-6 bg-primary/20 rounded-lg flex items-center justify-center">
                                            <ShieldCheck size={14} className="text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Seu Plano Atual</span>
                                    </div>
                                    <h3 className="text-4xl font-[900] italic text-white tracking-tighter uppercase leading-none">
                                        {subscription?.plan?.name || "Sem Plano Ativo"}
                                    </h3>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${subscription?.status === 'active'
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : subscription?.status === 'pending_asaas'
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {getSubscriptionStatusLabel(subscription?.status || 'canceled')}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-auto">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Investimento Mensal</p>
                                    <p className="text-2xl font-[900] italic text-white tracking-tight">
                                        {formatCurrency(subscription?.plan?.monthly_fee_cents || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Próxima Cobrança</p>
                                    <p className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                        <Clock size={16} className="text-primary" />
                                        {subscription?.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : '--/--/----'}
                                    </p>
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Forma de Pagamento</p>
                                    <p className="text-sm font-bold text-slate-300">
                                        {subscription?.asaas_subscription_id ? 'PIX' : 'CARTÃO DE CRÉDITO OU CARTÃO DE DÉBITO'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Usage Card */}
                    <div className="bg-[#111a16] border border-white/5 rounded-[40px] p-8 flex flex-col shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest italic leading-none">Limite de Pedidos</h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRefreshBilling}
                                    className="text-primary hover:text-primary/80 transition-colors"
                                    title="Atualizar contadores"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <Zap size={16} className="text-primary animate-pulse" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-4xl font-[900] italic text-white tracking-tighter leading-none">
                                    {currentCycle?.free_orders_used || 0}
                                </span>
                                <span className="text-sm font-bold text-slate-500 mb-1 italic">
                                    de {subscription?.plan?.free_orders_per_period || 0} grátis
                                </span>
                            </div>

                            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(19,236,109,0.5)] transition-all duration-1000"
                                    style={{ width: `${calculatePercentage()}%` }}
                                ></div>
                            </div>

                            {/* --- NEW: Overage Counter Section --- */}
                            {currentCycle?.overage_orders > 0 && (
                                <div className="space-y-3 mt-4 animate-fade-in">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">Pedidos Excedentes</span>
                                            <span className="text-2xl font-[900] italic text-white tracking-tighter leading-none">
                                                +{currentCycle.overage_orders}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none block mb-1">Custo Adicional</span>
                                            <span className="text-sm font-bold text-white italic">
                                                {formatCurrency(currentCycle.overage_amount_cents || 0)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-amber-500/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 w-full opacity-50 pulse"></div>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <p className="text-[9px] font-bold text-primary leading-relaxed text-center uppercase tracking-widest">
                                    {currentCycle?.overage_orders > 0
                                        ? `Você atingiu sua franquia e agora está gerando pedidos excedentes (+${currentCycle.overage_orders}).`
                                        : calculatePercentage() >= 80
                                            ? "Atenção: Você está chegando ao limite da sua franquia."
                                            : "Sua franquia está saudável. Aproveite o crescimento!"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-grid: Plans Only */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Plan Selection / Options */}
                    <div className="lg:col-span-12 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-[900] italic text-white uppercase tracking-tight flex items-center gap-3">
                                <Zap size={20} className="text-primary" />
                                Impulsione seu Negócio
                            </h3>
                            <button className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                <HelpCircle size={14} /> Falar com Consultor
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {availablePlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`bg-[#111a16] border rounded-[40px] p-8 transition-all relative overflow-hidden group hover:scale-[1.02] ${subscription?.plan?.id === plan.id
                                        ? 'border-primary shadow-[0_0_30px_rgba(19,236,109,0.1)]'
                                        : 'border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {subscription?.plan?.id === plan.id && (
                                        <div className="absolute top-0 right-0 bg-primary text-[#0a0f0d] px-6 py-2 rounded-bl-[20px] text-[10px] font-black uppercase tracking-widest italic">
                                            Sua Escolha
                                        </div>
                                    )}

                                    <h4 className="text-xl font-[900] italic text-white uppercase tracking-tight mb-2">{plan.name}</h4>
                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-3xl font-[900] italic text-white">{formatCurrency(plan.monthly_fee_cents)}</span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">/mês</span>
                                    </div>

                                    <ul className="space-y-4 mb-10">
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            {plan.free_orders_per_period} Pedidos Grátis / Mês
                                        </li>
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            Taxa Excedente: {(plan.overage_percent_bp / 100).toFixed(1)}%
                                        </li>
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            Relatórios de Crescimento
                                        </li>
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300 opacity-50">
                                            <CheckCircle2 size={16} className="shrink-0" />
                                            Suporte Prioritário
                                        </li>
                                    </ul>

                                    <button
                                        disabled={subscription?.plan?.id === plan.id}
                                        onClick={() => handleMigratePlan(plan)}
                                        className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${subscription?.plan?.id === plan.id
                                            ? 'bg-white/5 text-slate-500 border border-white/5 cursor-default'
                                            : 'bg-white hover:bg-primary text-[#0a0f0d]'
                                            }`}
                                    >
                                        {subscription?.plan?.id === plan.id ? "Plano Ativo" : "Migrar Agora"}
                                        {subscription?.plan?.id !== plan.id && <ArrowUpRight size={18} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* FAQ / Support Section */}
                <div className="p-8 bg-primary/10 border border-primary/20 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="size-16 bg-primary rounded-[24px] flex items-center justify-center text-[#0a0f0d] shadow-lg shadow-primary/20 shrink-0">
                            <HelpCircle size={32} />
                        </div>
                        <div>
                            <h4 className="text-xl font-[900] italic text-white uppercase tracking-tight">Dúvidas sobre faturamento?</h4>
                            <p className="text-slate-400 text-sm font-bold mt-1 max-w-lg">Entenda como funcionam os ciclos de cobrança, a franquia de pedidos grátis e a integração com o Asaas.</p>
                        </div>
                    </div>
                    <button className="bg-[#0a0f0d] hover:bg-zinc-800 text-white h-14 px-10 rounded-2xl font-black uppercase tracking-widest transition-all border border-white/10 whitespace-nowrap">
                        Acessar FAQ
                    </button>
                </div>

            </div>
        </MerchantLayout>
    );
};

export default MerchantBilling;
