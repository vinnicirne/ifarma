import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcon } from '../Shared';

interface PharmacyFinanceTabProps {
    pharmacyId: string;
}

const PharmacyFinanceTab: React.FC<PharmacyFinanceTabProps> = ({ pharmacyId }) => {
    const [loading, setLoading] = useState(false);
    const [fees, setFees] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [pharmacyStats, setPharmacyStats] = useState({
        orders_count: 0,
        free_orders_remaining: 0
    });

    useEffect(() => {
        if (pharmacyId) {
            fetchFinanceData();
        }
    }, [pharmacyId]);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            // 1. Buscar regras da farmácia
            let { data: feeData, error: feeError } = await supabase
                .from('pharmacy_fees')
                .select('*')
                .eq('pharmacy_id', pharmacyId)
                .single();

            // Se não encontrar regra específica, buscar regra global (visual apenas)
            if (feeError || !feeData || (!feeData.charge_per_order && !feeData.charge_percentage)) {
                const { data: globalSettings } = await supabase.from('system_settings').select('*');
                if (globalSettings) {
                    const gMap: any = {};
                    globalSettings.forEach(s => gMap[s.key] = s.value);

                    setFees({
                        ...feeData,
                        is_global: true,
                        charge_per_order: gMap['global_charge_per_order'] === 'true',
                        fixed_fee: parseFloat(gMap['global_fixed_fee'] || '0'),
                        charge_percentage: gMap['global_charge_percentage'] === 'true',
                        percentage_fee: parseFloat(gMap['global_percentage_fee'] || '0')
                    });
                }
            } else {
                setFees({ ...feeData, is_global: false });
            }
            // 2. Fetch Stats from pharmacies table
            const { data: pharmaData } = await supabase
                .from('pharmacies')
                .select('orders_count, free_orders_remaining')
                .eq('id', pharmacyId)
                .single();

            if (pharmaData) setPharmacyStats(pharmaData);

            // 3. Fetch Transactions
            const { data: transData } = await supabase
                .from('pharmacy_transactions')
                .select('*')
                .eq('pharmacy_id', pharmacyId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (transData) setTransactions(transData);

        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFees = async () => {
        setLoading(true);
        try {
            const payload = {
                pharmacy_id: pharmacyId,
                charge_per_order: fees.charge_per_order,
                fixed_fee: fees.fixed_fee,
                charge_percentage: fees.charge_percentage,
                percentage_fee: fees.percentage_fee,
                free_orders_initial: fees.free_orders_initial,
                active: fees.active
            };

            const { error } = await supabase
                .from('pharmacy_fees')
                .upsert(payload, { onConflict: 'pharmacy_id' });

            if (error) throw error;

            // Se mudou free_orders_initial, podemos querer atualizar o free_orders_remaining na tabela pharmacies?
            // User disse: "30 pedidos grátis + R$ 1,00 depois"
            // Por simplicidade, se o admin atualizar free_orders_initial, vamos resetar o remaining para esse valor (opcional, depende da regra de negócio)
            // No MVP, vamos apenas atualizar.
            const { error: updatePharmaError } = await supabase
                .from('pharmacies')
                .update({ free_orders_remaining: fees.free_orders_initial })
                .eq('id', pharmacyId);

            if (updatePharmaError) throw updatePharmaError;

            alert("Configurações financeiras salvas com sucesso!");
            fetchFinanceData();
        } catch (error: any) {
            alert("Erro ao salvar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!fees && !loading) return (
        <div className="p-10 text-center">
            <button
                onClick={() => setFees({
                    charge_per_order: false,
                    fixed_fee: 0,
                    charge_percentage: false,
                    percentage_fee: 0,
                    free_orders_initial: 0,
                    active: true
                })}
                className="bg-primary text-background-dark px-6 py-3 rounded-2xl font-black uppercase tracking-widest"
            >
                Configurar Regras Financeiras
            </button>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Coluna 1 & 2: Configurações */}
            <div className="lg:col-span-2 space-y-6">
                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black italic text-slate-900 dark:text-white flex items-center gap-2">
                                <MaterialIcon name="payments" className="text-primary" />
                                Contrato Financeiro
                            </h3>
                            {fees?.is_global && (
                                <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-wider mt-1 inline-block animate-pulse">
                                    Utilizando Regra Global do Sistema
                                </span>
                            )}
                            {!fees?.is_global && (
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider mt-1 inline-block">
                                    Contrato Personalizado para esta Loja
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Status do Contrato</span>
                            <div
                                onClick={() => setFees({ ...fees, active: !fees.active })}
                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${fees?.active ? 'bg-primary' : 'bg-slate-600'}`}
                            >
                                <div className={`size-4 bg-white rounded-full shadow-sm transition-transform ${fees?.active ? 'translate-x-6' : ''}`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Taxa Fixa */}
                        <div className={`p-6 rounded-3xl border-2 transition-all ${fees?.charge_per_order ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5'}`}>
                            <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={fees?.charge_per_order || false}
                                    onChange={e => setFees({ ...fees, charge_per_order: e.target.checked })}
                                    className="accent-primary size-5"
                                />
                                <span className="font-black uppercase tracking-widest text-sm">Cobrar por Pedido</span>
                            </label>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Valor Fixo (R$)</label>
                                <input
                                    type="number"
                                    value={fees?.fixed_fee ?? ''}
                                    onChange={e => setFees({ ...fees, fixed_fee: parseFloat(e.target.value) || 0 })}
                                    disabled={!fees?.charge_per_order}
                                    className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors disabled:opacity-30"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Taxa Percentual */}
                        <div className={`p-6 rounded-3xl border-2 transition-all ${fees?.charge_percentage ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/5'}`}>
                            <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={fees?.charge_percentage || false}
                                    onChange={e => setFees({ ...fees, charge_percentage: e.target.checked })}
                                    className="accent-primary size-5"
                                />
                                <span className="font-black uppercase tracking-widest text-sm">Cobrar Percentual</span>
                            </label>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Percentual (%)</label>
                                <input
                                    type="number"
                                    value={fees?.percentage_fee ?? ''}
                                    onChange={e => setFees({ ...fees, percentage_fee: parseFloat(e.target.value) || 0 })}
                                    disabled={!fees?.charge_percentage}
                                    className="h-14 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors disabled:opacity-30"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Pedidos Gratuitos */}
                        <div className="p-6 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 md:col-span-2">
                            <h4 className="font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                <MaterialIcon name="card_giftcard" className="text-primary text-sm" />
                                Promoção de Entrada (Pedidos Grátis)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9] px-1">Quantidade de Boas-vindas</label>
                                    <input
                                        type="number"
                                        value={fees?.free_orders_initial ?? ''}
                                        onChange={e => setFees({ ...fees, free_orders_initial: parseInt(e.target.value) || 0 })}
                                        className="h-14 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold outline-none focus:border-primary/50 transition-colors"
                                        placeholder="Ex: 30"
                                    />
                                </div>
                                <div className="bg-primary/10 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="size-12 rounded-full bg-primary flex items-center justify-center text-background-dark">
                                        <span className="text-xl font-black">{pharmacyStats.free_orders_remaining}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Restantes</p>
                                        <p className="text-sm font-bold">Pedidos grátis disponíveis</p>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-[10px] text-slate-500 italic">
                                * Ao salvar, o saldo de pedidos grátis da loja será atualizado para o valor da "Quantidade de Boas-vindas".
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleSaveFees}
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-background-dark flex h-12 px-8 items-center justify-center rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 gap-2 text-xs font-black uppercase tracking-widest"
                        >
                            {loading ? <MaterialIcon name="sync" className="animate-spin" /> : <MaterialIcon name="save" />}
                            <span>Salvar Regras</span>
                        </button>
                    </div>
                </section>

                {/* Histórico de Transações */}
                <section className="bg-white dark:bg-[#1a2e23] p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                    <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <MaterialIcon name="receipt_long" className="text-primary" />
                        Extrato de Cobranças
                    </h3>
                    <div className="overflow-x-auto -mx-8">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-black/30 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                <tr>
                                    <th className="p-4 pl-8">Data</th>
                                    <th className="p-4">Pedido</th>
                                    <th className="p-4">Valor Pedido</th>
                                    <th className="p-4">Taxa Cobrada</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4 pr-8 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 pl-8 text-slate-500">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                            <span className="block text-[10px]">{new Date(tx.created_at).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="p-4 font-mono text-xs opacity-50">#{tx.order_id?.substring(0, 8)}</td>
                                        <td className="p-4 font-bold">R$ {tx.order_value.toFixed(2)}</td>
                                        <td className="p-4 font-black text-primary">R$ {tx.fee_amount.toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${tx.type === 'free' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-8 text-right">
                                            <button className="text-slate-400 hover:text-white transition-colors">
                                                <MaterialIcon name="info" className="text-sm" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-500 italic">Nenhuma transação registrada.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Coluna 3: Resumo */}
            <div className="space-y-6">
                <section className="bg-gradient-to-br from-primary to-[#7ab895] p-8 rounded-[40px] shadow-xl text-background-dark">
                    <MaterialIcon name="analytics" className="text-3xl mb-4" />
                    <h3 className="text-xl font-black italic mb-1 uppercase tracking-tighter leading-none">Resumo Consumo</h3>
                    <p className="text-xs font-bold opacity-70 border-b border-background-dark/10 pb-4 mb-4">Métricas da loja desde o início</p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">Total de Pedidos</span>
                            <span className="text-2xl font-black">{pharmacyStats.orders_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">Pedidos Grátis Consumidos</span>
                            <span className="text-2xl font-black">{fees?.free_orders_initial - pharmacyStats.free_orders_remaining || 0}</span>
                        </div>
                        <div className="h-px bg-background-dark/10 my-4"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">Total Taxas (Previsto)</span>
                            <span className="text-2xl font-black italic">R$ {transactions.reduce((acc, curr) => acc + curr.fee_amount, 0).toFixed(2)}</span>
                        </div>
                    </div>
                </section>

                <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#92c9a9]">Dica comercial</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Lojas em início de operação costumam performar melhor com <span className="text-primary font-bold">Pedidos Grátis</span>.
                        Após a fase de maturação, a combinação de <span className="text-primary font-bold">Taxa Fixa + Percentual</span> é a mais lucrativa.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PharmacyFinanceTab;
