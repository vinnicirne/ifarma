import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, CreditCard, Zap, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface BillingPlan {
    id: string;
    name: string;
    slug: string;
    monthly_fee_cents: number;
    free_orders_per_period: number;
    overage_percent_bp: number;
    overage_fixed_fee_cents: number;
    block_after_free_limit: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function BillingPlans() {
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '', // Auto-gerado a partir do name
        monthly_fee_cents: 0,
        free_orders_per_period: 0,
        overage_percent_bp: 0,
        overage_fixed_fee_cents: 0,
        block_after_free_limit: false,
        is_active: true,
    });

    // Helper: Gerar slug a partir do name
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9]+/g, '_') // Substitui não-alfanuméricos por _
            .replace(/^_|_$/g, ''); // Remove _ do início/fim
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('billing_plans')
                .select('*')
                .order('monthly_fee_cents', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error: any) {
            toast.error(`Erro ao carregar planos: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingPlan) {
                // Atualizar
                const { error } = await supabase
                    .from('billing_plans')
                    .update(formData)
                    .eq('id', editingPlan.id);

                if (error) throw error;
                toast.success('Plano atualizado com sucesso!');
            } else {
                // Criar
                const { error } = await supabase
                    .from('billing_plans')
                    .insert([formData]);

                if (error) throw error;
                toast.success('Plano criado com sucesso!');
            }

            setShowModal(false);
            setEditingPlan(null);
            resetForm();
            fetchPlans();
        } catch (error: any) {
            toast.error(`Erro ao salvar plano: ${error.message}`);
        }
    };

    const handleEdit = (plan: BillingPlan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            slug: plan.slug,
            monthly_fee_cents: plan.monthly_fee_cents,
            free_orders_per_period: plan.free_orders_per_period,
            overage_percent_bp: plan.overage_percent_bp,
            overage_fixed_fee_cents: plan.overage_fixed_fee_cents,
            block_after_free_limit: plan.block_after_free_limit,
            is_active: plan.is_active,
        });
        setShowModal(true);
    };

    const handleToggleActive = async (plan: BillingPlan) => {
        try {
            const { error } = await supabase
                .from('billing_plans')
                .update({ is_active: !plan.is_active })
                .eq('id', plan.id);

            if (error) throw error;
            toast.success(`Plano ${plan.is_active ? 'desativado' : 'ativado'} com sucesso!`);
            fetchPlans();
        } catch (error: any) {
            toast.error(`Erro ao atualizar plano: ${error.message}`);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            slug: '',
            monthly_fee_cents: 0,
            free_orders_per_period: 0,
            overage_percent_bp: 0,
            overage_fixed_fee_cents: 0,
            block_after_free_limit: false,
            is_active: true,
        });
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    };

    const formatPercent = (bp: number) => {
        return `${(bp / 100).toFixed(2)}%`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Sincronizando Planos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-slide-up">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-[900] italic text-white tracking-tight leading-none">Planos de Cobrança</h2>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Gerencie a monetização da plataforma.</p>
                </div>

                <button
                    onClick={() => {
                        resetForm();
                        setEditingPlan(null);
                        setShowModal(true);
                    }}
                    className="group flex items-center gap-2 bg-primary text-[#0a0f0d] px-6 py-3 rounded-2xl font-black italic text-xs tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(19,236,109,0.3)]"
                >
                    <Plus size={16} strokeWidth={3} />
                    NOVO PLANO
                </button>
            </div>

            {/* Grid de Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`group bg-[#111a16] border transition-all duration-300 p-8 rounded-[40px] shadow-2xl relative overflow-hidden ${plan.is_active ? 'border-primary/20 hover:border-primary/40' : 'border-white/5 grayscale opacity-60'
                            }`}
                    >
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <Zap size={200} />
                        </div>

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-[900] italic text-white tracking-tight uppercase leading-none">{plan.name}</h3>
                                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mt-1">ID: {plan.slug}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${plan.is_active ? 'bg-primary/10 text-primary animate-pulse-subtle' : 'bg-white/5 text-slate-500'}`}>
                                {plan.is_active ? 'Ativo' : 'Inativo'}
                            </div>
                        </div>

                        <div className="space-y-6 mb-8 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1">Custo Mensal</span>
                                <p className="text-white text-4xl font-[900] italic tracking-tighter">
                                    {formatCurrency(plan.monthly_fee_cents)}
                                    <span className="text-sm font-bold opacity-40 ml-1">/mês</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Franquia</span>
                                    <p className="text-white font-black italic text-sm">{plan.free_orders_per_period} Pedidos</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Excedente</span>
                                    <p className="text-primary font-black italic text-sm">{formatPercent(plan.overage_percent_bp)}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Bloqueio</span>
                                    <p className={`font-black italic text-sm ${plan.block_after_free_limit ? 'text-red-400' : 'text-slate-400'}`}>
                                        {plan.block_after_free_limit ? 'ATIVA' : 'DESLIGADO'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Taxa Fixa</span>
                                    <p className="text-white font-black italic text-sm">{formatCurrency(plan.overage_fixed_fee_cents)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 relative z-10">
                            <button
                                onClick={() => handleEdit(plan)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-2xl transition-all font-black italic text-[10px] tracking-widest flex items-center justify-center gap-2"
                            >
                                <Edit2 size={12} />
                                CONFIGURAR
                            </button>
                            <button
                                onClick={() => handleToggleActive(plan)}
                                className={`flex items-center justify-center size-12 rounded-2xl transition-all ${plan.is_active
                                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                    : 'bg-primary/20 text-primary hover:bg-primary hover:text-[#0a0f0d]'
                                    }`}
                            >
                                {plan.is_active ? <X size={18} /> : <Check size={18} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Redenhizado */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-[#0a0f0d] border border-white/10 rounded-[40px] p-8 w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto hide-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-[900] italic text-white uppercase tracking-tight">
                                {editingPlan ? 'Refinar Plano' : 'Novo Arquétipo'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                    Nome do Plano
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setFormData({
                                            ...formData,
                                            name: newName,
                                            slug: generateSlug(newName)
                                        });
                                    }}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 focus:shadow-[0_0_15px_rgba(19,236,109,0.1)] transition-all"
                                    placeholder="Ex: Prime, Elite, Enterprise"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        Mensalidade (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.monthly_fee_cents / 100}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                monthly_fee_cents: Math.round(parseFloat(e.target.value) * 100),
                                            })
                                        }
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        Franquia de Pedidos
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.free_orders_per_period}
                                        onChange={(e) =>
                                            setFormData({ ...formData, free_orders_per_period: parseInt(e.target.value) })
                                        }
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        % Excedente
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.overage_percent_bp / 100}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                overage_percent_bp: Math.round(parseFloat(e.target.value) * 100),
                                            })
                                        }
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                        Taxa Fixa (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.overage_fixed_fee_cents / 100}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                overage_fixed_fee_cents: Math.round(parseFloat(e.target.value) * 100),
                                            })
                                        }
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 items-center p-4 bg-white/5 rounded-[24px]">
                                <div className="flex-1">
                                    <p className="text-white font-bold italic text-[11px] leading-none">Status do Plano</p>
                                    <p className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mt-1">Disponibiliza para novas farmácias</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.is_active ? 'bg-primary' : 'bg-white/10'}`}
                                >
                                    <span className={`inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex gap-4 items-center p-4 bg-red-500/5 border border-red-500/10 rounded-[24px]">
                                <div className="flex-1">
                                    <p className="text-red-400 font-bold italic text-[11px] leading-none">Bloqueio Automático</p>
                                    <p className="text-red-900 font-bold text-[8px] uppercase tracking-widest mt-1">Bloquear após atingir o limite grátis</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, block_after_free_limit: !formData.block_after_free_limit })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.block_after_free_limit ? 'bg-red-500' : 'bg-white/10'}`}
                                >
                                    <span className={`inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.block_after_free_limit ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-[#0a0f0d] px-6 py-4 rounded-2xl font-black italic text-sm tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(19,236,109,0.2)] mt-4"
                            >
                                {editingPlan ? 'CONSOLIDAR ATUALIZAÇÃO' : 'GERAR NOVO PLANO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
