// Fix: Adicionar Realtime subscription para billing_cycles atualizar automaticamente
// Problema: /gestor/billing não mostra contador atualizado quando trigger incrementa free_orders_used

// Adicione este useEffect no MerchantBilling.tsx (após o useEffect existente na linha 40)

useEffect(() => {
    if (!pharmacyId) return;

    // Realtime subscription para billing_cycles
    const billingChannel = supabase
        .channel(`billing_cycle_${pharmacyId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'billing_cycles',
            filter: `pharmacy_id=eq.${pharmacyId}`
        }, (payload) => {
            console.log('Billing cycle atualizado:', payload.new);
            
            // Atualizar apenas o ciclo que mudou
            if (payload.new && payload.new.status === 'active') {
                setCurrentCycle(payload.new);
                
                // Mostrar toast se o contador mudou
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

    // Cleanup
    return () => {
        supabase.removeChannel(billingChannel);
    };
}, [pharmacyId, subscription?.plan?.free_orders_per_period]);

// Botão de refresh manual (adicione no JSX, perto do título da seção de Usage)
const handleRefreshBilling = async () => {
    await fetchBillingData(true); // silent = true
    toast.success('Contadores atualizados!');
};

// No JSX (após a linha 332, onde tem o título "Limite de Pedidos"):
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
