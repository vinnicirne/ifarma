import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Zap, Info, Save, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface PolicyKV {
    policy_key: string;
    policy_value: string;
}

interface PolicyState {
    billing_cycle_type: string;
    order_count_trigger: string;
    invoice_generation: string;
    refund_policy: string;
}

interface GlobalConfigKV {
    config_key: string;
    monthly_fee_cents: number;
    free_orders_per_period: number;
    overage_percent_bp: number;
    overage_fixed_fee_cents: number;
    block_after_free_limit: boolean;
}

// ============================================================================
// HELPER: Key-Value to Object
// ============================================================================

function kvToObject(rows: PolicyKV[]): Record<string, string> {
    return rows.reduce((acc, r) => {
        acc[r.policy_key] = r.policy_value;
        return acc;
    }, {} as Record<string, string>);
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BillingPolicies() {
    const [policy, setPolicy] = useState<PolicyState>({
        billing_cycle_type: 'calendar_month',
        order_count_trigger: 'delivered_only',
        invoice_generation: 'auto',
        refund_policy: 'no_refund_count',
    });
    const [globalConfig, setGlobalConfig] = useState<GlobalConfigKV | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Busca políticas (key-value)
            const { data: policyData, error: policyError } = await supabase
                .from('billing_policy')
                .select('policy_key, policy_value');

            if (policyError) throw policyError;

            // Converte key-value para objeto
            const policyObj = kvToObject(policyData || []);
            setPolicy({
                billing_cycle_type: policyObj.billing_cycle_type || 'calendar_month',
                order_count_trigger: policyObj.order_count_trigger || 'delivered_only',
                invoice_generation: policyObj.invoice_generation || 'auto',
                refund_policy: policyObj.refund_policy || 'no_refund_count',
            });

            // Busca config global (singleton)
            const { data: configData, error: configError } = await supabase
                .from('billing_global_config')
                .select('*')
                .eq('config_key', 'default_plan_settings')
                .single();

            if (configError) throw configError;

            // Lógica de Sincronização: Usa colunas se disponíveis, senão tenta parsear config_value (JSON)
            if (configData) {
                let finalConfig = { ...configData };

                // Se as colunas principais estão zeradas/faltando no retorno, tentamos extrair do JSON
                if (!configData.monthly_fee_cents && configData.config_value) {
                    try {
                        const parsed = JSON.parse(configData.config_value);
                        finalConfig = {
                            ...finalConfig,
                            ...parsed
                        };
                    } catch (e) {
                        console.error('Falha ao parsear JSON de fallback:', e);
                    }
                }

                setGlobalConfig(finalConfig);
            }
        } catch (error: any) {
            toast.error(`Erro ao carregar configurações: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePolicySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Atualizar cada política individualmente (UPSERT)
            const updates = [
                { policy_key: 'billing_cycle_type', policy_value: policy.billing_cycle_type },
                { policy_key: 'order_count_trigger', policy_value: policy.order_count_trigger },
                { policy_key: 'invoice_generation', policy_value: policy.invoice_generation },
                { policy_key: 'refund_policy', policy_value: policy.refund_policy },
            ];

            for (const update of updates) {
                const { error } = await supabase
                    .from('billing_policy')
                    .upsert(update, { onConflict: 'policy_key' });

                if (error) throw error;
            }

            toast.success('Políticas atualizadas com sucesso!');
            fetchData();
        } catch (error: any) {
            toast.error(`Erro ao atualizar políticas: ${error.message}`);
        }
    };

    const handleGlobalConfigSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!globalConfig) return;

        try {
            // Criamos o objeto JSON para salvar na coluna config_value (fallback)
            const configValueJson = JSON.stringify({
                monthly_fee_cents: globalConfig.monthly_fee_cents,
                free_orders_per_period: globalConfig.free_orders_per_period,
                overage_percent_bp: globalConfig.overage_percent_bp,
                overage_fixed_fee_cents: globalConfig.overage_fixed_fee_cents,
                block_after_free_limit: globalConfig.block_after_free_limit,
            });

            // Tentamos atualizar todas as colunas. Se o schema for antigo, fallamos para o JSON.
            const { error } = await supabase
                .from('billing_global_config')
                .update({
                    config_value: configValueJson,
                    // Tentamos colunas individuais (suporta migration FIX_BILLING_GLOBAL_CONFIG_COLUMNS)
                    monthly_fee_cents: globalConfig.monthly_fee_cents,
                    free_orders_per_period: globalConfig.free_orders_per_period,
                    overage_percent_bp: globalConfig.overage_percent_bp,
                    overage_fixed_fee_cents: globalConfig.overage_fixed_fee_cents,
                    block_after_free_limit: globalConfig.block_after_free_limit,
                    updated_at: new Date().toISOString()
                })
                .eq('config_key', 'default_plan_settings');

            if (error) {
                console.warn('⚠️ Falha ao atualizar colunas individuais, tentando apenas config_value...', error);

                // Fallback: Tenta atualizar apenas o config_value (schema original)
                const { error: fallbackError } = await supabase
                    .from('billing_global_config')
                    .update({
                        config_value: configValueJson,
                        updated_at: new Date().toISOString()
                    })
                    .eq('config_key', 'default_plan_settings');

                if (fallbackError) throw fallbackError;
            }

            toast.success('Configuração global sincronizada com sucesso!');
            fetchData();
        } catch (error: any) {
            console.error('Erro faturamento:', error);
            toast.error(`Erro ao atualizar faturamento: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Sincronizando Políticas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-slide-up pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-[900] italic text-white tracking-tight leading-none uppercase">Políticas & Configurações</h2>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-2 opacity-80">Regras de negócio e parâmetros globais do motor financeiro.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Políticas Operacionais (Lado Esquerdo) */}
                <div className="lg:col-span-7 bg-[#111a16] border border-white/5 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                        <Settings size={200} />
                    </div>

                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <ShieldCheck size={20} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-[900] italic text-white uppercase tracking-tight">Regras Operacionais</h3>
                    </div>

                    <form onSubmit={handlePolicySubmit} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                    <ChevronRight size={10} className="text-primary" />
                                    Janela de Faturamento
                                </label>
                                <select
                                    value={policy.billing_cycle_type}
                                    onChange={(e) => setPolicy({ ...policy, billing_cycle_type: e.target.value })}
                                    className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer hover:bg-white/5"
                                >
                                    <option value="calendar_month">Mês Calendário</option>
                                    <option value="rolling_30_days">Rolling 30 dias</option>
                                </select>
                                <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Define se o ciclo reinicia no dia 1º ou após 30 dias do início.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                    <ChevronRight size={10} className="text-primary" />
                                    Gatilho de Contagem
                                </label>
                                <select
                                    value={policy.order_count_trigger}
                                    onChange={(e) => setPolicy({ ...policy, order_count_trigger: e.target.value })}
                                    className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer hover:bg-white/5"
                                >
                                    <option value="delivered_only">Apenas Entregues</option>
                                    <option value="all_confirmed">Todos Confirmados</option>
                                </select>
                                <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Define qual status de pedido faz ele contar na franquia de uso.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                    <ChevronRight size={10} className="text-primary" />
                                    Estorno de Pedido
                                </label>
                                <select
                                    value={policy.refund_policy}
                                    onChange={(e) => setPolicy({ ...policy, refund_policy: e.target.value })}
                                    className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer hover:bg-white/5"
                                >
                                    <option value="no_refund_count">Não descontar (MVP)</option>
                                    <option value="refund_within_days">Descontar Proporcional</option>
                                </select>
                                <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Define se pedidos reembolsados devem ser subtraídos do contador mensal.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                    <ChevronRight size={10} className="text-primary" />
                                    Ciclo de Faturamento
                                </label>
                                <select
                                    value={policy.invoice_generation}
                                    onChange={(e) => setPolicy({ ...policy, invoice_generation: e.target.value })}
                                    className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all appearance-none cursor-pointer hover:bg-white/5"
                                >
                                    <option value="auto">Totalmente Automático</option>
                                    <option value="manual">Aprovação Manual</option>
                                </select>
                                <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Define se a fatura no Asaas é gerada sozinha ou requer clique admin.</p>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/10 p-5 rounded-[24px] flex items-start gap-4">
                            <Info size={16} className="text-primary mt-0.5 shrink-0" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                Estas regras afetam o cálculo de todos os ciclos ativos imediatamente. Use com cautela.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="group w-full bg-white/5 hover:bg-primary text-white hover:text-[#0a0f0d] px-6 py-4 rounded-2xl font-black italic text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 border border-white/10 hover:border-primary active:scale-[0.98]"
                        >
                            <Save size={16} />
                            ATUALIZAR MATRIZ DE REGRAS
                        </button>
                    </form>
                </div>

                {/* Configuração Global (Lado Direito) */}
                <div className="lg:col-span-5 flex flex-col gap-8">
                    {globalConfig && (
                        <div className="bg-[#111a16] border border-white/5 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                <Zap size={150} />
                            </div>

                            <div className="flex items-center gap-3 mb-8 relative z-10">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <TrendingUp size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-[900] italic text-white uppercase tracking-tight">Matriz Padrão</h3>
                                    <p className="text-slate-500 font-bold text-[8px] uppercase tracking-widest leading-none mt-1">Fallback de assinaturas</p>
                                </div>
                            </div>

                            <form onSubmit={handleGlobalConfigSubmit} className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Mensalidade Fallback (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={globalConfig.monthly_fee_cents / 100}
                                        onChange={(e) =>
                                            setGlobalConfig({
                                                ...globalConfig,
                                                monthly_fee_cents: Math.round(parseFloat(e.target.value) * 100),
                                            })
                                        }
                                        className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                    />
                                    <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Valor fixo cobrado mensalmente de farmácias sem contrato customizado.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Franquia Global</label>
                                    <input
                                        type="number"
                                        value={globalConfig.free_orders_per_period}
                                        onChange={(e) =>
                                            setGlobalConfig({
                                                ...globalConfig,
                                                free_orders_per_period: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                    />
                                    <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Quantidade de pedidos gratuitos inclusos por mês no plano padrão.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">% Excedente Global</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={globalConfig.overage_percent_bp / 100}
                                        onChange={(e) =>
                                            setGlobalConfig({
                                                ...globalConfig,
                                                overage_percent_bp: Math.round(parseFloat(e.target.value) * 100),
                                            })
                                        }
                                        className="w-full bg-[#0a0f0d] border border-white/5 rounded-2xl px-5 py-4 text-xs text-white font-bold outline-none focus:border-primary/30 transition-all"
                                    />
                                    <p className="text-[8px] text-slate-600 font-bold uppercase px-1">Percentual cobrado sobre o valor de cada pedido que exceder a franquia.</p>
                                </div>

                                <div className="flex gap-4 items-center p-4 bg-red-500/5 border border-red-500/10 rounded-[24px]">
                                    <div className="flex-1">
                                        <p className="text-red-400 font-bold italic text-[11px] leading-none">Hard Limit</p>
                                        <p className="text-red-900/50 font-bold text-[8px] uppercase tracking-widest mt-1">Bloqueio padrão de uso</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGlobalConfig({ ...globalConfig, block_after_free_limit: !globalConfig.block_after_free_limit })}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${globalConfig.block_after_free_limit ? 'bg-red-500' : 'bg-white/10'}`}
                                    >
                                        <span className={`inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${globalConfig.block_after_free_limit ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <p className="text-[8px] text-red-900/40 font-bold uppercase px-1">Se ATIVO, a farmácia é bloqueada após atingir o limite de pedidos grátis.</p>

                                <button
                                    type="submit"
                                    className="w-full bg-primary text-[#0a0f0d] px-6 py-4 rounded-2xl font-black italic text-xs tracking-[0.2em] hover:shadow-[0_0_20px_rgba(19,236,109,0.3)] transition-all"
                                >
                                    SINCRONIZAR FALLBACK
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="bg-amber-500/5 border border-amber-500/10 p-8 rounded-[40px] flex gap-5">
                        <AlertTriangle size={24} className="text-amber-500 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-amber-500 font-black italic text-sm uppercase leading-none mb-2">Atenção Crítica</h4>
                            <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest leading-relaxed">
                                Alterações nestas configurações podem causar cobranças imediatas ou bloqueios de acesso para farmácias sem contrato vigente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
