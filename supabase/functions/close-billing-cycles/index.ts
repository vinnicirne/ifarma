/**
 * EDGE FUNCTION: Close Billing Cycles
 * 
 * Execução: Cron diário (01:00 UTC)
 * Função: Fecha ciclos do mês anterior e gera faturas de excedente no Asaas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3';

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

interface Pharmacy {
    id: string;
    name: string;
    email: string;
    cnpj: string;
    asaas_customer_id: string | null;
}

serve(async (req) => {
    try {
        // Verificar autenticação (cron job ou admin)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Criar cliente Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        console.log('[close-billing-cycles] Iniciando fechamento de ciclos...');

        // Buscar ciclos do mês anterior que ainda estão ativos
        const today = new Date();
        const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);

        const { data: cyclesToClose, error: cyclesError } = await supabaseClient
            .from('billing_cycles')
            .select('*')
            .eq('status', 'active')
            .lt('period_end', firstDayOfCurrentMonth.toISOString().split('T')[0]);

        if (cyclesError) {
            throw new Error(`Erro ao buscar ciclos: ${cyclesError.message}`);
        }

        console.log(`[close-billing-cycles] Encontrados ${cyclesToClose?.length || 0} ciclos para fechar`);

        const results = {
            total_cycles: cyclesToClose?.length || 0,
            closed: 0,
            invoiced: 0,
            errors: [] as string[],
        };

        // Processar cada ciclo
        for (const cycle of cyclesToClose || []) {
            try {
                console.log(`[close-billing-cycles] Processando ciclo ${cycle.id} da farmácia ${cycle.pharmacy_id}`);

                // Marcar ciclo como fechado
                await supabaseClient
                    .from('billing_cycles')
                    .update({
                        status: 'closed',
                        closed_at: new Date().toISOString(),
                    })
                    .eq('id', cycle.id);

                results.closed++;

                // Se houver excedente, criar fatura no Asaas
                if (cycle.overage_orders > 0 && cycle.overage_amount_cents > 0) {
                    await createOverageInvoice(supabaseClient, cycle);
                    results.invoiced++;
                }

                // Marcar ciclo como faturado
                await supabaseClient
                    .from('billing_cycles')
                    .update({ status: 'invoiced' })
                    .eq('id', cycle.id);

            } catch (error) {
                const errorMsg = `Erro ao processar ciclo ${cycle.id}: ${error.message}`;
                console.error(`[close-billing-cycles] ${errorMsg}`);
                results.errors.push(errorMsg);
            }
        }

        console.log('[close-billing-cycles] Fechamento concluído:', results);

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[close-billing-cycles] Erro fatal:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

/**
 * Cria fatura de excedente no Asaas
 */
async function createOverageInvoice(supabaseClient: any, cycle: BillingCycle) {
    // Buscar dados da farmácia
    const { data: pharmacy, error: pharmacyError } = await supabaseClient
        .from('pharmacies')
        .select('id, name, email, cnpj, asaas_customer_id')
        .eq('id', cycle.pharmacy_id)
        .single();

    if (pharmacyError || !pharmacy) {
        throw new Error(`Farmácia não encontrada: ${cycle.pharmacy_id}`);
    }

    // Criar cliente no Asaas se não existir
    let asaasCustomerId = pharmacy.asaas_customer_id;
    if (!asaasCustomerId) {
        asaasCustomerId = await createAsaasCustomer(pharmacy);

        // Atualizar pharmacy com asaas_customer_id
        await supabaseClient
            .from('pharmacies')
            .update({ asaas_customer_id: asaasCustomerId })
            .eq('id', pharmacy.id);
    }

    // Calcular data de vencimento (5 dias a partir de hoje)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Criar cobrança no Asaas
    const asaasPayment = await createAsaasPayment({
        customer: asaasCustomerId,
        value: cycle.overage_amount_cents / 100,
        dueDate: dueDateStr,
        description: `Cobrança por uso - ${cycle.overage_orders} pedidos excedentes`,
    });

    // Salvar fatura no banco
    await supabaseClient.from('billing_invoices').insert({
        pharmacy_id: cycle.pharmacy_id,
        cycle_id: cycle.id,
        invoice_type: 'overage',
        asaas_invoice_id: asaasPayment.id,
        amount_cents: cycle.overage_amount_cents,
        due_date: dueDateStr,
        status: 'pending',
        asaas_invoice_url: asaasPayment.invoiceUrl,
    });

    console.log(`[close-billing-cycles] Fatura criada: ${asaasPayment.id} - R$ ${cycle.overage_amount_cents / 100}`);
}

/**
 * Cria cliente no Asaas
 */
async function createAsaasCustomer(pharmacy: Pharmacy): Promise<string> {
    const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
            name: pharmacy.name,
            email: pharmacy.email,
            cpfCnpj: pharmacy.cnpj,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro ao criar cliente no Asaas: ${error}`);
    }

    const data = await response.json();
    console.log(`[close-billing-cycles] Cliente Asaas criado: ${data.id}`);
    return data.id;
}

/**
 * Cria cobrança no Asaas
 */
async function createAsaasPayment(payment: {
    customer: string;
    value: number;
    dueDate: string;
    description: string;
}): Promise<any> {
    const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
            customer: payment.customer,
            billingType: 'BOLETO',
            value: payment.value,
            dueDate: payment.dueDate,
            description: payment.description,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro ao criar cobrança no Asaas: ${error}`);
    }

    const data = await response.json();
    return data;
}
