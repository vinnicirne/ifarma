import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Zap, CreditCard, Calendar, BarChart3, ChevronRight, ArrowUpRight, ShieldCheck, AlertCircle, FileText, ExternalLink, PlusSquare } from 'lucide-react';
import type {
    PharmacySubscriptionWithPlan,
    BillingCycle,
    BillingInvoice,
    PharmacyContract
} from '../../types/billing';
import {
    formatCurrency,
    formatPercentage,
    getSubscriptionStatusLabel,
    getCycleStatusLabel,
    getInvoiceStatusLabel
} from '../../types/billing';
import { toast } from 'react-hot-toast';

import PlanSelectionModal from './PlanSelectionModal';

interface PharmacyFinanceTabProps {
    pharmacyId: string;
}

const PharmacyFinanceTab: React.FC<PharmacyFinanceTabProps> = ({ pharmacyId }) => {
    const [loading, setLoading] = useState(true);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [subscription, setSubscription] = useState<PharmacySubscriptionWithPlan | null>(null);
    const [currentCycle, setCurrentCycle] = useState<BillingCycle | null>(null);
    const [cycles, setCycles] = useState<BillingCycle[]>([]);
    const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
    const [contract, setContract] = useState<PharmacyContract | null>(null);

    useEffect(() => {
        if (pharmacyId) {
            fetchFinanceData();
        }
    }, [pharmacyId]);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            // 1. Assinatura e Plano
            const { data: subData, error: subError } = await supabase
                .from('pharmacy_subscriptions')
                .select('*, plan:billing_plans(*)')
                .eq('pharmacy_id', pharmacyId)
                .maybeSingle();

            if (subError) throw subError;
            setSubscription(subData as PharmacySubscriptionWithPlan);

            // 2. Ciclos de Faturamento
            const { data: cyclesData, error: cyclesError } = await supabase
                .from('billing_cycles')
                .select('*')
                .eq('pharmacy_id', pharmacyId)
                .order('period_start', { ascending: false });

            if (cyclesError) throw cyclesError;
            setCycles(cyclesData || []);

            // Ciclo ativo (se houver)
            const active = (cyclesData || []).find(c => c.status === 'active');
            setCurrentCycle(active || null);

            // 3. Faturas
            const { data: invoicesData, error: invoicesError } = await supabase
                .from('billing_invoices')
                .select('*')
                .eq('pharmacy_id', pharmacyId)
                .order('created_at', { ascending: false });

            if (invoicesError) throw invoicesError;
            setInvoices(invoicesData || []);

            // 4. Contrato Customizado
            const { data: contractData, error: contractError } = await supabase
                .from('pharmacy_contracts')
                .select('*')
                .eq('pharmacy_id', pharmacyId)
                .maybeSingle(); // Simplificando para pegar o único por enquanto

            if (contractError) throw contractError;
            setContract(contractData as PharmacyContract);

        } catch (error: any) {
            toast.error(`Erro ao carregar dados financeiros: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = async (planId: string) => {
        try {
            setLoading(true);

            // 1) pegar sessão
            const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr) throw sessionErr;

            const accessToken = sessionData.session?.access_token;

            // 2) se não tiver token, você NÃO está autenticado nesse painel
            if (!accessToken) {
                toast.error("Você precisa estar logado como admin para ativar um plano. Faça login novamente.");
                return;
            }

            // 3) chamar edge function com token válido
            const { data, error } = await supabase.functions.invoke("activate-pharmacy-plan", {
                body: { pharmacy_id: pharmacyId, plan_id: planId },
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (error) {
                console.error("invoke error:", error);
                throw error;
            }

            toast.success("Plano ativado com sucesso!");
            setIsPlanModalOpen(false);
            await fetchFinanceData();
        } catch (error: any) {
            console.error("Erro ao ativar plano:", error);
            toast.error(`Erro ao ativar plano: ${error?.message ?? "Erro desconhecido"}`);
        } finally {
            setLoading(false);
        }
    };

    const openPlanModal = async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) {
            toast.error("Faça login no painel antes de vincular um plano.");
            return;
        }
        setIsPlanModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em]">Sincronizando Motor Financeiro...</p>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-slide-up">
                <div className="size-20 bg-white/5 flex items-center justify-center rounded-[32px] mb-6">
                    <AlertCircle size={40} className="text-slate-500" />
                </div>
                <h3 className="text-white font-[900] italic text-2xl uppercase tracking-tighter">Sem Plano Ativo</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2 max-w-xs leading-relaxed">
                    Esta farmácia ainda não foi vinculada a um modelo de cobrança.
                </p>
                <button
                    onClick={openPlanModal}
                    className="mt-8 bg-primary text-[#0a0f0d] px-8 py-4 rounded-2xl font-black italic text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(19,236,109,0.3)] flex items-center gap-2"
                >
                    <PlusSquare size={16} />
                    VINCULAR PLANO AGORA
                </button>

                <PlanSelectionModal
                    isOpen={isPlanModalOpen}
                    onClose={() => setIsPlanModalOpen(false)}
                    onSelect={handleSelectPlan}
                    pharmacyId={pharmacyId}
                />
            </div>
        );
    }

    // Calcular progresso do ciclo (MVP: Usando orders_count total ou do ciclo se disponível)
    const freeLimit = contract?.free_orders_per_period ?? subscription.plan.free_orders_per_period;
    const ordersUsed = currentCycle?.free_orders_used ?? 0;
    const progress = Math.min(100, (ordersUsed / (freeLimit || 1)) * 100);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up pb-20">
            {/* --- COLUNA ESQUERDA: Assinatura & Ciclo --- */}
            <div className="lg:col-span-8 space-y-8">

                {/* Dashboard do Ciclo Ativo */}
                <div className="group bg-[#111a16] border border-primary/20 rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
                    <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <Zap size={250} />
                    </div>

                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div>
                            <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mb-2 block">Ciclo de Uso Ativo</span>
                            <h3 className="text-3xl font-[900] italic text-white leading-none uppercase tracking-tighter">
                                {subscription.plan.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-4 text-slate-500 font-black text-[9px] uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(currentCycle?.period_start || '').toLocaleDateString()}</span>
                                <ChevronRight size={10} />
                                <span className="text-primary">Vigente</span>
                            </div>
                        </div>
                        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse-subtle">
                            <span className="size-2 rounded-full bg-primary"></span>
                            {getSubscriptionStatusLabel(subscription.status)}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Limite de Franquia</span>
                                <span className="text-white font-[900] italic text-xl">{ordersUsed}/{freeLimit}</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-700"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                {progress >= 100 ? 'Limite atingido. Iniciando cobrança excedente.' : `${100 - Math.round(progress)}% da franquia disponível.`}
                            </p>
                        </div>

                        <div className="flex flex-col justify-center items-center md:items-start border-l border-white/5 md:pl-10">
                            <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest mb-1">Custo Acumulado</span>
                            <p className="text-white text-3xl font-[900] italic tracking-tighter">
                                {formatCurrency((currentCycle?.overage_amount_cents || 0))}
                            </p>
                            <span className="text-primary font-black text-[8px] uppercase tracking-widest mt-1">Excedentes: {currentCycle?.overage_orders || 0} pedidos</span>
                        </div>

                        <div className="flex flex-col justify-center items-center md:items-start border-l border-white/5 md:pl-10">
                            <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest mb-1">Próxima Fatura</span>
                            <p className="text-white text-xl font-[900] italic tracking-tight">
                                {subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : 'A definir'}
                            </p>
                            <span className="text-slate-500 font-black text-[8px] uppercase tracking-widest mt-1">Dia do fechamento</span>
                        </div>
                    </div>
                </div>

                {/* Histórico de Faturas */}
                <div className="bg-[#0a0f0d] border border-white/5 rounded-[40px] p-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <FileText size={18} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-[900] italic text-white uppercase tracking-tight">Faturas & Pagamentos</h3>
                    </div>

                    <div className="space-y-4">
                        {invoices.length > 0 ? invoices.map((invoice) => (
                            <div key={invoice.id} className="group flex flex-col md:flex-row items-center justify-between p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-primary/20 transition-all gap-6">
                                <div className="flex items-center gap-5 w-full md:w-auto">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center ${invoice.status === 'paid' ? 'bg-primary/20 text-primary' : invoice.status === 'overdue' ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-slate-400'}`}>
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <p className="text-white font-[900] italic text-sm tracking-tight leading-none uppercase">{invoice.invoice_type === 'monthly_fee' ? 'Assinatura Mensal' : 'Taxa de Excedente'}</p>
                                        <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                            Vencto: {new Date(invoice.due_date).toLocaleDateString()}
                                            <span className="size-1 rounded-full bg-white/10"></span>
                                            {invoice.asaas_invoice_id}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                    <div className="text-right">
                                        <p className="text-white font-[900] italic text-lg tracking-tighter leading-none">{formatCurrency(invoice.amount_cents)}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest mt-1 block ${invoice.status === 'paid' ? 'text-primary' : invoice.status === 'overdue' ? 'text-red-500' : 'text-amber-500'}`}>
                                            {getInvoiceStatusLabel(invoice.status)}
                                        </span>
                                    </div>
                                    <a
                                        href={invoice.asaas_invoice_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary hover:text-black transition-all group-hover:scale-110"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center text-slate-500 font-bold text-xs uppercase tracking-[0.2em] border border-dashed border-white/10 rounded-3xl">
                                Nenhuma fatura gerada no sistema.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- COLUNA DIREITA: Regras & Contrato --- */}
            <div className="lg:col-span-4 space-y-8">

                {/* Detalhes do Contrato */}
                <div className="bg-[#111a16] border border-white/5 rounded-[40px] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <ShieldCheck size={18} className="text-blue-400" />
                        </div>
                        <h3 className="text-lg font-[900] italic text-white uppercase tracking-tight leading-none">Pacto Contratual</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Mensalidade Base</span>
                            <div className="flex items-end justify-between">
                                <p className="text-white font-[900] italic text-2xl leading-none">
                                    {formatCurrency(contract?.monthly_fee_cents ?? subscription.plan.monthly_fee_cents)}
                                </p>
                                {contract?.monthly_fee_cents && (
                                    <span className="text-[8px] font-black bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded uppercase tracking-widest">Personalizado</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between pb-4 border-b border-white/5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Excedente (%)</span>
                                <span className="text-white font-black italic text-xs">{formatPercentage(contract?.overage_percent_bp ?? subscription.plan.overage_percent_bp)}</span>
                            </div>
                            <div className="flex justify-between pb-4 border-b border-white/5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Excedente (Fixa)</span>
                                <span className="text-white font-black italic text-xs">{formatCurrency(contract?.overage_fixed_fee_cents ?? subscription.plan.overage_fixed_fee_cents ?? 0)}</span>
                            </div>
                            <div className="flex justify-between pb-4 border-b border-white/5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bloqueio Auto</span>
                                <span className={`font-black italic text-xs ${(contract?.block_after_free_limit ?? subscription.plan.block_after_free_limit) ? 'text-red-400' : 'text-primary'}`}>
                                    {(contract?.block_after_free_limit ?? subscription.plan.block_after_free_limit) ? 'ATIVO' : 'DESLIGADO'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsPlanModalOpen(true)}
                            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-black italic text-[10px] uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2"
                        >
                            ALTERAR PLANO / REGRAS
                        </button>
                    </div>
                </div>

                {/* Últimos Ciclos */}
                <div className="bg-[#0a0f0d] border border-white/5 rounded-[40px] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <BarChart3 size={16} className="text-primary" />
                        </div>
                        <h3 className="text-sm font-[900] italic text-white uppercase tracking-tight">Consumo Histórico</h3>
                    </div>

                    <div className="space-y-3">
                        {cycles.filter(c => c.status !== 'active').slice(0, 5).map(cycle => (
                            <div key={cycle.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <p className="text-white font-bold text-[11px] leading-none uppercase italic">{new Date(cycle.period_start).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{cycle.free_orders_used + cycle.overage_orders} Pedidos</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-black italic text-sm tracking-tighter leading-none">{formatCurrency(cycle.overage_amount_cents)}</p>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 block tracking-[0.2em]">{getCycleStatusLabel(cycle.status)}</span>
                                </div>
                            </div>
                        ))}
                        {cycles.filter(c => c.status !== 'active').length === 0 && (
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest py-4 text-center">Início de operação.</p>
                        )}
                    </div>
                </div>

            </div>

            <PlanSelectionModal
                isOpen={isPlanModalOpen}
                onClose={() => setIsPlanModalOpen(false)}
                onSelect={handleSelectPlan}
                pharmacyId={pharmacyId}
                currentPlanId={subscription?.plan_id}
            />
        </div>
    );
};

export default PharmacyFinanceTab;

