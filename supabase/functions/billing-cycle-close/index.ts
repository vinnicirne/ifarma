// ============================================================================
// EDGE FUNCTION: billing-cycle-close
// Fecha ciclos de cobrança mensais e gera faturas no Asaas
// Executado via CRON diariamente às 00:05
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL') || 'https://api-sandbox.asaas.com/v3';

interface BillingCycle {
    id: string;
    pharmacy_id: string;
    period_start: string;
    period_end: string;
    free_orders_used: number;
    overage_orders: number;
    overage_amount_cents: number;
    status: string;
}

interface PharmacySubscription {
    pharmacy_id: string;
    asaas_customer_id: string;
    plan_id: string;
}

interface BillingPlan {
    id: string;
    name: string;
    monthly_fee_cents: number;
}

Deno.serve(async (req) => {
    try {
        // 1. Criar cliente Supabase com service role
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('🔄 Iniciando fechamento de ciclos...');

        // 2. Buscar ciclos que devem ser fechados (período terminou ontem)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: cycles, error: cyclesError } = await supabase
            .from('billing_cycles')
            .select('*')
            .eq('status', 'active')
            .lte('period_end', yesterdayStr);

        if (cyclesError) throw cyclesError;

        console.log(`📊 Encontrados ${cycles?.length || 0} ciclos para fechar`);

        if (!cycles || cycles.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Nenhum ciclo para fechar', closed: 0 }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        let closedCount = 0;
        let invoicesCreated = 0;

        // 3. Processar cada ciclo
        for (const cycle of cycles as BillingCycle[]) {
            try {
                console.log(`\n🔄 Processando ciclo ${cycle.id} (farmácia ${cycle.pharmacy_id})`);

                // 3.1. Buscar assinatura da farmácia com dados do cliente Asaas
                const { data: subscription, error: subError } = await supabase
                    .from('pharmacy_subscriptions')
                    .select('*, billing_plans(*), pharmacies:pharmacies(asaas_customer_id)')
                    .eq('pharmacy_id', cycle.pharmacy_id)
                    .eq('status', 'active')
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (subError || !subscription) {
                    console.warn(`⚠️ Assinatura não encontrada para farmácia ${cycle.pharmacy_id}`);
                    continue;
                }

                const sub = subscription as any;
                const plan = sub.billing_plans as BillingPlan;
                // Get customer ID from the joined pharmacies table
                const asaasCustomerId = sub.pharmacies?.asaas_customer_id;

                // 3.2. Fechar ciclo
                const { error: updateError } = await supabase
                    .from('billing_cycles')
                    .update({
                        status: 'closed',
                        closed_at: new Date().toISOString(),
                    })
                    .eq('id', cycle.id);

                if (updateError) throw updateError;

                console.log(`✅ Ciclo ${cycle.id} fechado`);
                closedCount++;

                // 3.3. Gerar fatura de mensalidade (se houver)
                if (plan.monthly_fee_cents > 0 && asaasCustomerId) {
                    try {
                        const monthlyInvoice = await createAsaasPayment({
                            customer: asaasCustomerId,
                            value: plan.monthly_fee_cents / 100,
                            description: `Mensalidade ${plan.name} - ${cycle.period_start} a ${cycle.period_end}`,
                            dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
                        });

                        // Salvar fatura
                        await supabase.from('billing_invoices').insert({
                            pharmacy_id: cycle.pharmacy_id,
                            cycle_id: cycle.id,
                            invoice_type: 'monthly_fee',
                            asaas_invoice_id: monthlyInvoice.id,
                            amount_cents: plan.monthly_fee_cents,
                            due_date: monthlyInvoice.dueDate,
                            status: 'pending',
                            asaas_invoice_url: monthlyInvoice.invoiceUrl,
                        });

                        console.log(`💰 Fatura de mensalidade criada: ${monthlyInvoice.id}`);
                        invoicesCreated++;
                    } catch (err) {
                        console.error(`❌ Erro ao criar fatura de mensalidade:`, err);
                    }
                }

                // 3.4. Gerar fatura de excedente (se houver)
                if (cycle.overage_amount_cents > 0 && asaasCustomerId) {
                    try {
                        const overageInvoice = await createAsaasPayment({
                            customer: asaasCustomerId,
                            value: cycle.overage_amount_cents / 100,
                            description: `Excedente de ${cycle.overage_orders} pedidos - ${cycle.period_start} a ${cycle.period_end}`,
                            dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
                        });

                        // Salvar fatura
                        await supabase.from('billing_invoices').insert({
                            pharmacy_id: cycle.pharmacy_id,
                            cycle_id: cycle.id,
                            invoice_type: 'overage',
                            asaas_invoice_id: overageInvoice.id,
                            amount_cents: cycle.overage_amount_cents,
                            due_date: overageInvoice.dueDate,
                            status: 'pending',
                            asaas_invoice_url: overageInvoice.invoiceUrl,
                        });

                        console.log(`💰 Fatura de excedente criada: ${overageInvoice.id}`);
                        invoicesCreated++;
                    } catch (err) {
                        console.error(`❌ Erro ao criar fatura de excedente:`, err);
                    }
                }

                // 3.5. Atualizar status do ciclo para 'invoiced'
                await supabase
                    .from('billing_cycles')
                    .update({ status: 'closed' }) // Mantem 'closed' ou 'invoiced' conforme sua preferência, mas aqui abrimos o próximo
                    .eq('id', cycle.id);

                console.log(`✅ Ciclo ${cycle.id} marcado como processado`);

                // --- NEW: Open Next Cycle (30 days rolling) ---
                try {
                    const oldEnd = new Date(cycle.period_end);
                    const nextStart = new Date(oldEnd);
                    nextStart.setDate(nextStart.getDate() + 1);
                    const nextStartStr = nextStart.toISOString().split('T')[0];

                    const nextEnd = new Date(nextStart);
                    nextEnd.setDate(nextEnd.getDate() + 30);
                    const nextEndStr = nextEnd.toISOString().split('T')[0];

                    console.log(`🆕 Abrindo próximo ciclo: ${nextStartStr} até ${nextEndStr}`);

                    await supabase
                        .from('billing_cycles')
                        .insert({
                            pharmacy_id: cycle.pharmacy_id,
                            period_start: nextStartStr,
                            period_end: nextEndStr,
                            status: 'active',
                            free_orders_used: 0,
                            overage_orders: 0,
                            overage_amount_cents: 0,
                        });

                    console.log(`✅ Próximo ciclo criado para farmácia ${cycle.pharmacy_id}`);
                } catch (err) {
                    console.error(`❌ Erro ao criar próximo ciclo para ${cycle.pharmacy_id}:`, err);
                }
                // ----------------------------------------------

            } catch (err) {
                console.error(`❌ Erro ao processar ciclo ${cycle.id}:`, err);
            }
        }

        console.log(`\n✅ Fechamento concluído: ${closedCount} ciclos fechados, ${invoicesCreated} faturas criadas`);

        return new Response(
            JSON.stringify({
                message: 'Fechamento de ciclos concluído',
                closed: closedCount,
                invoices: invoicesCreated,
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Erro no fechamento de ciclos:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});

// ============================================================================
// HELPER: Criar pagamento no Asaas
// ============================================================================

async function createAsaasPayment(data: {
    customer: string;
    value: number;
    description: string;
    dueDate: string;
}) {
    const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
            customer: data.customer,
            billingType: 'BOLETO',
            value: data.value,
            dueDate: data.dueDate,
            description: data.description,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Asaas API error: ${error}`);
    }

    return await response.json();
}
