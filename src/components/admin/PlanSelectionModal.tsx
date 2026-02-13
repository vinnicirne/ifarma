import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { BillingPlan } from '../../types/billing';
import { formatCurrency } from '../../types/billing';
import { toast } from 'react-hot-toast';

interface PlanSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (planId: string) => void;
    pharmacyId: string;
    currentPlanId?: string;
}

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentPlanId
}) => {
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
        }
    }, [isOpen]);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('billing_plans')
                .select('*')
                .eq('is_active', true)
                .order('monthly_fee_cents', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error: any) {
            toast.error(`Erro ao carregar planos: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0a0f0d] border border-white/10 rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative animate-slide-up">

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-3xl font-[900] italic text-white tracking-tighter uppercase leading-none">Vincular Novo Plano</h2>
                        <p className="text-primary font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Selecione o arquétipo de faturamento para este parceiro</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-12 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                            <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em]">Buscando opções...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`group relative bg-[#111a16] border transition-all duration-300 p-8 rounded-[32px] overflow-hidden cursor-pointer ${currentPlanId === plan.id
                                            ? 'border-primary ring-2 ring-primary/20'
                                            : 'border-white/5 hover:border-primary/40 hover:scale-[1.02]'
                                        }`}
                                    onClick={() => onSelect(plan.id)}
                                >
                                    {/* Decoration */}
                                    <div className="absolute -top-10 -right-10 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity">
                                        <Zap size={180} />
                                    </div>

                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-xl font-[900] italic text-white uppercase tracking-tighter leading-none">{plan.name}</h3>
                                        {currentPlanId === plan.id && (
                                            <div className="bg-primary text-black size-6 rounded-full flex items-center justify-center">
                                                <CheckCircle2 size={16} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Mensalidade</span>
                                            <p className="text-white text-3xl font-[900] italic tracking-tight">{formatCurrency(plan.monthly_fee_cents)}</p>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-500 uppercase tracking-widest">Franquia</span>
                                                <span className="text-white italic">{plan.free_orders_per_period} Pedidos</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-500 uppercase tracking-widest">Excedente %</span>
                                                <span className="text-primary italic">{(plan.overage_percent_bp / 100)}%</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-500 uppercase tracking-widest">Bloqueio</span>
                                                <span className={plan.block_after_free_limit ? 'text-red-400' : 'text-emerald-400'}>
                                                    {plan.block_after_free_limit ? 'Ativo' : 'Desligado'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className={`w-full mt-8 py-4 rounded-2xl font-black italic text-[10px] uppercase tracking-[0.2em] transition-all ${currentPlanId === plan.id
                                                ? 'bg-primary/10 text-primary border border-primary/20 cursor-default'
                                                : 'bg-primary text-black hover:scale-105 active:scale-95 shadow-lg shadow-primary/20'
                                            }`}
                                    >
                                        {currentPlanId === plan.id ? 'PLANO ATUAL' : 'SELECIONAR'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="p-8 bg-white/5 border-t border-white/5 flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <ShieldCheck size={20} className="text-blue-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Ao selecionar um plano, o sistema criará uma assinatura para o parceiro. Caso existam regras customizadas em contrato, elas prevalecerão sobre o arquétipo.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlanSelectionModal;
