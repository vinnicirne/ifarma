import React, { useState, useEffect, useCallback } from 'react';
import MerchantLayout from './MerchantLayout';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [currentCycle, setCurrentCycle] = useState<any>(null);
    const [availablePlans, setAvailablePlans] = useState<any[]>([]);
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [pixData, setPixData] = useState<{
        qr_base64?: string;
        copy_paste?: string;
        payment_id: string;
        invoice_url?: string;
        status?: string;
    } | null>(null);
    const [showPixModal, setShowPixModal] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [pixError, setPixError] = useState<string | null>(null);

    // Polling simples e direto - SEM HOOKS EXTERNOS
    const pollPixQrCode = useCallback(async (paymentId: string) => {
        if (!paymentId) return;

        let attempts = 0;
        const maxAttempts = 20;

        const poll = async () => {
            attempts++;
            console.log(`[POLLING] Tentativa ${attempts}/${maxAttempts} para payment_id: ${paymentId}`);

            try {
                // 1. REFRESH DO TOKEN JWT (evita 401 no polling)
                const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();

                if (sessionError || !sessionData.session) {
                    console.error('[POLLING] Erro no refresh JWT:', sessionError);
                    setIsPolling(false);
                    setPixError('Sessão expirada. Atualize a página.');
                    return;
                }

                // 2. CHAMAR GET-PIX-QRCODE COM HEADERS CORRETOS
                const { data, error } = await supabase.functions.invoke('get-pix-qrcode', {
                    body: { payment_id: paymentId },
                    headers: {
                        Authorization: `Bearer ${sessionData.session.access_token}`,
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (error) {
                    console.error('[POLLING] Erro na chamada:', error);

                    // 3. TRATAMENTO ESPECÍFICO DE ERRO 401 NO POLLING
                    if (error.message?.includes('401') || error.message?.includes('Invalid JWT')) {
                        console.error('[POLLING] Erro 401 JWT detectado!');
                        setIsPolling(false);
                        setPixError('Erro de autenticação. Atualize a página.');
                        return;
                    }
                    return;
                }

                if (data?.success) {
                    if (data.status === 'paid') {
                        console.log('[POLLING] Pagamento confirmado!');
                        setShowPixModal(false);
                        toast.success("Pagamento confirmado! Plano ativado.");
                        fetchBillingData();
                        setIsPolling(false);
                        return;
                    }

                    if (data.qr_base64 && data.copy_paste) {
                        console.log('[POLLING] QR Code obtido!');
                        setPixData(prev => prev ? {
                            ...prev,
                            qr_base64: data.qr_base64,
                            copy_paste: data.copy_paste,
                            status: 'ready'
                        } : null);
                        toast.success("QR Code gerado com sucesso!");
                        setIsPolling(false);
                        setPixError(null);
                        return;
                    }
                }

                if (attempts >= maxAttempts) {
                    console.error('[POLLING] Tempo esgotado');
                    setIsPolling(false);
                    setPixError('Tempo esgotado aguardando QR Code. Tente novamente.');
                    return;
                }

                // Continua polling se ainda estiver pendente
                if (showPixModal && pixData?.status === 'pending_qr') {
                    setTimeout(poll, 3000);
                } else {
                    setIsPolling(false);
                }

            } catch (err) {
                console.error('[POLLING] Erro:', err);
                setIsPolling(false);
            }
        };

        poll();
    }, [showPixModal, pixData?.status]);

    useEffect(() => {
        fetchBillingData();

        const interval = setInterval(() => {
            if (showPixModal || subscription?.status === 'pending_asaas') {
                fetchBillingData(true);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [showPixModal, subscription?.status]);

    useEffect(() => {
        if (subscription?.status === 'active' && showPixModal) {
            setShowPixModal(false);
            toast.success("Pagamento confirmado! Plano ativado.");
        }
    }, [subscription?.status, showPixModal]);

    const fetchBillingData = async (silent = false) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const isUuid = (v: string | null | undefined) =>
                !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

            let pId = user.user_metadata?.pharmacy_id || user.user_metadata?.pharmacyId;
            if (!isUuid(pId)) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('pharmacy_id')
                    .eq('id', user.id)
                    .single();
                pId = profile?.pharmacy_id;

                if (!pId) {
                    const { data: owned } = await supabase
                        .from('pharmacies')
                        .select('id')
                        .eq('owner_id', user.id)
                        .maybeSingle();
                    pId = owned?.id;
                }
            }

            if (!pId) {
                if (!silent) toast.error("Farmácia não encontrada.");
                return;
            }
            setPharmacyId(pId);

            const { data: sub } = await supabase
                .from('pharmacy_subscriptions')
                .select('*, plan:billing_plans(*)')
                .eq('pharmacy_id', pId)
                .in('status', ['active', 'pending_asaas'])
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            setSubscription(sub);

            const { data: cycles } = await supabase
                .from('billing_cycles')
                .select('*')
                .eq('pharmacy_id', pId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);
            setCurrentCycle(cycles && cycles.length > 0 ? cycles[0] : null);

            const { data: plans } = await supabase
                .from('billing_plans')
                .select('*')
                .eq('is_active', true)
                .order('monthly_fee_cents', { ascending: true });
            setAvailablePlans(plans || []);

        } catch (error: any) {
            console.error("Error fetching billing data:", error);
            if (!silent) toast.error("Erro ao carregar dados de faturamento.");
        } finally {
            setLoading(false);
        }
    };

    const handleMigratePlan = async (plan: any) => {
        if (!pharmacyId) return;

        try {
            setLoading(true);

            // 1. FORÇAR REFRESH DO TOKEN JWT (evita 401 Invalid JWT)
            console.log('[AUTH] Fazendo refresh do token JWT...');
            const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();

            if (sessionError || !sessionData.session) {
                console.error('[AUTH] Erro no refresh:', sessionError);
                toast.error("Sessão expirada. Faça login novamente.");
                return;
            }

            console.log('[AUTH] Token JWT atualizado com sucesso');
            console.log('[AUTH] User ID:', sessionData.session.user.id);
            console.log('[AUTH] Token válido até:', new Date(sessionData.session.expires_at! * 1000).toLocaleString());

            // 2. CHAMAR EDGE FUNCTION COM HEADERS CORRETOS
            console.log('[API] Chamando activate-pharmacy-plan...');
            const { data, error } = await supabase.functions.invoke('activate-pharmacy-plan', {
                body: {
                    pharmacy_id: pharmacyId,
                    plan_id: plan.id
                },
                headers: {
                    Authorization: `Bearer ${sessionData.session.access_token}`,
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });

            if (error) {
                console.error('[API] Erro na chamada:', error);
                throw error;
            }

            console.log('[API] Resposta recebida:', data);

            if (data?.pix_data) {
                setPixData(data.pix_data);
                setShowPixModal(true);

                if (data.pix_data.status === 'ready' && data.pix_data.qr_base64) {
                    toast.success("QR Code gerado com sucesso!");
                }
                else if (data.pix_data.status === 'pending_qr' && data.pix_data.payment_id) {
                    toast.success("Pagamento gerado! QR Code está sendo processado...");
                    setIsPolling(true);
                    pollPixQrCode(data.pix_data.payment_id);
                } else {
                    toast.success("Pagamento gerado! Finalize para ativar.");
                }
            } else {
                toast.success("Plano atualizado com sucesso!");
                fetchBillingData();
            }

        } catch (error: any) {
            console.error("Error migrating plan:", error);

            // 3. TRATAMENTO ESPECÍFICO DE ERRO 401
            if (error.message?.includes('401') || error.message?.includes('Invalid JWT')) {
                console.error('[AUTH] Erro 401 JWT detectado!');
                toast.error("Erro de autenticação. Tente fazer login novamente.");
                // Opcional: redirecionar para login
                // navigate('/login');
                return;
            }

            let errorMsg = "Erro ao migrar plano.";
            if (error.context) {
                try {
                    const errorBody = await error.context.json();
                    if (errorBody.reason) {
                        errorMsg = `Erro: ${errorBody.reason} (${errorBody.error || ''})`;
                    } else if (errorBody.error) {
                        errorMsg = errorBody.error;
                    }
                } catch (e) {
                    errorMsg = error.message || errorMsg;
                }
            } else {
                errorMsg = error.message || errorMsg;
            }
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
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
                            {pixData.qr_base64 ? (
                                <img
                                    src={`data:image/png;base64,${pixData.qr_base64}`}
                                    alt="QR Code Pix Asaas"
                                    className="w-64 h-64 object-contain"
                                    onLoad={() => console.log('✅ QR Image loaded successfully')}
                                    onError={(e) => console.error('❌ QR Image failed to load:', e)}
                                />
                            ) : (
                                <div className="w-64 h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl">
                                    {isPolling ? (
                                        <>
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            <p className="mt-2 text-sm text-slate-600">Gerando QR Code...</p>
                                            <p className="text-xs text-slate-500">Isso pode levar até 30 segundos</p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-sm text-slate-600">QR Code não disponível</p>
                                            {pixError && <p className="text-xs text-red-500 mt-1">{pixError}</p>}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {pixData.copy_paste && (
                            <div className="mt-4 space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Código Copia e Cola</p>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        aria-label="Código Pix Copia e Cola"
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

                        {pixData.status === 'pending_qr' && pixData.invoice_url && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                <p className="text-sm text-yellow-800 font-medium mb-2">
                                    ⚠️ QR Code está sendo processado
                                </p>
                                <p className="text-xs text-yellow-700 mb-3">
                                    Você pode acessar diretamente no Asaas enquanto o QR Code é gerado:
                                </p>
                                <button
                                    onClick={() => window.open(pixData.invoice_url!, '_blank')}
                                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-black uppercase tracking-widest transition-all gap-2"
                                >
                                    Ver QR no Asaas (Recomendado)
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
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-amber-300 mb-2">Pagamento Pendente</h4>
                            <p className="text-xs text-amber-400">
                                Seu pagamento está sendo processado. Assim que for confirmado pelo Asaas, seu plano será ativado automaticamente.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#111a16] to-[#0a0f0d] border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-2">Plano Atual</h3>
                                    <h2 className="text-3xl font-[900] italic text-white uppercase tracking-tight">
                                        {subscription?.plan?.name || 'Grátis'}
                                    </h2>
                                </div>
                                <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${subscription?.status === 'active'
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-amber-500/20 text-amber-500'
                                    }`}>
                                    {getSubscriptionStatusLabel(subscription?.status || 'canceled')}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-auto">
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Investimento Mensal</p>
                                    <p className="text-2xl font-[900] italic text-white">
                                        {formatCurrency(subscription?.plan?.monthly_fee_cents || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pedidos Grátis</p>
                                    <p className="text-2xl font-[900] italic text-white">
                                        {subscription?.plan?.free_orders_per_period || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Taxa por Extra</p>
                                    <p className="text-2xl font-[900] italic text-white">
                                        {formatCurrency(subscription?.plan?.overage_fee_cents || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#111a16] border border-white/5 rounded-[40px] p-8 flex flex-col shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest italic leading-none">Limite de Pedidos</h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchBillingData()}
                                    className="text-primary hover:text-primary/80 transition-colors"
                                    title="Atualizar contadores"
                                >
                                    <Zap size={16} className="text-primary animate-pulse" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <span className="text-4xl font-[900] italic text-white tracking-tighter leading-none">
                                    {currentCycle?.free_orders_used || 0}
                                </span>
                                <span className="text-xs text-slate-400 font-bold leading-none">
                                    de {subscription?.plan?.free_orders_per_period || 0} grátis
                                </span>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary shadow-[0_0_15px_rgba(19,236,109,0.5)] transition-all duration-1000"
                                    style={{
                                        width: `${Math.min(((currentCycle?.free_orders_used || 0) / (subscription?.plan?.free_orders_per_period || 1)) * 100, 100)}%`
                                    }}
                                ></div>
                            </div>
                            {currentCycle?.overage_orders > 0 && (
                                <div className="space-y-3 mt-4 animate-fade-in">
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-[900] italic text-primary tracking-tighter leading-none">
                                            +{currentCycle.overage_orders}
                                        </span>
                                        <span className="text-xs text-slate-400 font-bold leading-none">
                                            pedidos extras
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <p className="text-[9px] font-bold text-primary leading-relaxed text-center uppercase tracking-widest">
                                    {currentCycle?.overage_orders > 0
                                        ? `Você pagou ${formatCurrency(currentCycle.overage_orders * (subscription?.plan?.overage_fee_cents || 0))} em pedidos extras`
                                        : 'Aproveite seus pedidos grátis!'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-12 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-[900] italic text-white uppercase tracking-tight flex items-center gap-3">
                                <CreditCard size={20} />
                                Planos Disponíveis
                            </h3>
                            <button
                                onClick={() => navigate('/support')}
                                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <HelpCircle size={14} /> Falar com Consultor
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {availablePlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`bg-gradient-to-br from-[#111a16] to-[#0a0f0d] border ${subscription?.plan_id === plan.id ? 'border-primary' : 'border-white/10'
                                        } rounded-[40px] p-8 shadow-xl relative overflow-hidden group`}
                                >
                                    {subscription?.plan_id === plan.id && (
                                        <div className="absolute top-4 right-4 bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            Sua Escolha
                                        </div>
                                    )}
                                    <h4 className="text-xl font-[900] italic text-white uppercase tracking-tight mb-2">{plan.name}</h4>
                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-3xl font-[900] italic text-white">{formatCurrency(plan.monthly_fee_cents)}</span>
                                        <span className="text-xs text-slate-400 font-bold">/mês</span>
                                    </div>
                                    <ul className="space-y-4 mb-10">
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            {plan.free_orders_per_period} pedidos grátis/mês
                                        </li>
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            {formatCurrency(plan.overage_fee_cents)} por pedido extra
                                        </li>
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            Relatórios completos
                                        </li>
                                        <li className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                                            Suporte Prioritário
                                        </li>
                                    </ul>
                                    <button
                                        disabled={subscription?.plan_id === plan.id}
                                        onClick={() => handleMigratePlan(plan)}
                                        className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${subscription?.plan_id === plan.id
                                                ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                                                : 'bg-primary text-[#0a0f0d] hover:brightness-110'
                                            }`}
                                    >
                                        {subscription?.plan_id === plan.id ? 'Plano Atual' : 'Migrar para este Plano'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-primary/10 border border-primary/20 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="size-16 bg-primary rounded-[24px] flex items-center justify-center text-[#0a0f0d] shadow-lg shadow-primary/20 shrink-0">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white mb-2">Precisa de Ajuda?</h4>
                            <p className="text-xs text-slate-300">
                                Nossa equipe está disponível para ajudar com dúvidas sobre planos e pagamentos.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/support')}
                        className="bg-primary text-[#0a0f0d] px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all"
                    >
                        Acessar FAQ
                    </button>
                </div>
            </div>
        </MerchantLayout>
    );
};

export default MerchantBilling;
