/**
 * EDGE FUNCTION: Activate Pharmacy Plan
 * 
 * Endpoint: /functions/v1/activate-pharmacy-plan
 * Função: Ativa plano de farmácia e cria assinatura no Asaas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3';

interface ActivatePlanRequest {
    pharmacy_id: string;
    plan_id: string;
}

serve(async (req) => {
    try {
        // Verificar método
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verificar autenticação
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parsear request
        const { pharmacy_id, plan_id }: ActivatePlanRequest = await req.json();

        if (!pharmacy_id || !plan_id) {
            return new Response(JSON.stringify({ error: 'pharmacy_id e plan_id são obrigatórios' }), {
                status: 400,
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

        console.log(`[activate-pharmacy-plan] Ativando plano ${plan_id} para farmácia ${pharmacy_id}`);

        // Buscar farmácia
        const { data: pharmacy, error: pharmacyError } = await supabaseClient
            .from('pharmacies')
            .select('*')
            .eq('id', pharmacy_id)
            .single();

        if (pharmacyError || !pharmacy) {
            return new Response(JSON.stringify({ error: 'Farmácia não encontrada' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Buscar plano
        const { data: plan, error: planError } = await supabaseClient
            .from('billing_plans')
            .select('*')
            .eq('id', plan_id)
            .single();

        if (planError || !plan) {
            return new Response(JSON.stringify({ error: 'Plano não encontrado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verificar se já existe assinatura ativa
        const { data: existingSubscription } = await supabaseClient
            .from('pharmacy_subscriptions')
            .select('id')
            .eq('pharmacy_id', pharmacy_id)
            .eq('status', 'active')
            .single();

        if (existingSubscription) {
            return new Response(JSON.stringify({ error: 'Farmácia já possui assinatura ativa' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Criar cliente no Asaas (se não existir)
        let asaasCustomerId = pharmacy.asaas_customer_id;
        if (!asaasCustomerId) {
            asaasCustomerId = await createAsaasCustomer(pharmacy);

            // Atualizar pharmacy com asaas_customer_id
            await supabaseClient
                .from('pharmacies')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', pharmacy_id);

            console.log(`[activate-pharmacy-plan] Cliente Asaas criado: ${asaasCustomerId}`);
        }

        let asaasSubscriptionId = null;

        // Criar assinatura no Asaas (se mensalidade > 0)
        if (plan.monthly_fee_cents > 0) {
            // Calcular próxima data de cobrança (dia 1º do próximo mês)
            const today = new Date();
            const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const nextBillingDateStr = nextBillingDate.toISOString().split('T')[0];

            const asaasSubscription = await createAsaasSubscription({
                customer: asaasCustomerId,
                value: plan.monthly_fee_cents / 100,
                nextDueDate: nextBillingDateStr,
                description: `Plano ${plan.name} - ${pharmacy.name}`,
            });

            asaasSubscriptionId = asaasSubscription.id;
            console.log(`[activate-pharmacy-plan] Assinatura Asaas criada: ${asaasSubscriptionId}`);
        }

        // Criar assinatura no banco
        const { data: subscription, error: subscriptionError } = await supabaseClient
            .from('pharmacy_subscriptions')
            .insert({
                pharmacy_id,
                plan_id,
                asaas_subscription_id: asaasSubscriptionId,
                status: 'active',
                started_at: new Date().toISOString(),
                next_billing_date: asaasSubscriptionId ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0] : null,
            })
            .select()
            .single();

        if (subscriptionError) {
            throw new Error(`Erro ao criar assinatura: ${subscriptionError.message}`);
        }

        // Criar ciclo inicial
        const today = new Date();
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        await supabaseClient.from('billing_cycles').insert({
            pharmacy_id,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            free_orders_used: 0,
            overage_orders: 0,
            overage_amount_cents: 0,
            status: 'active',
        });

        console.log(`[activate-pharmacy-plan] Plano ativado com sucesso`);

        return new Response(JSON.stringify({
            success: true,
            subscription,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[activate-pharmacy-plan] Erro:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

/**
 * Cria cliente no Asaas
 */
async function createAsaasCustomer(pharmacy: any): Promise<string> {
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
    return data.id;
}

/**
 * Cria assinatura no Asaas
 */
async function createAsaasSubscription(subscription: {
    customer: string;
    value: number;
    nextDueDate: string;
    description: string;
}): Promise<any> {
    const response = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
            customer: subscription.customer,
            billingType: 'BOLETO',
            value: subscription.value,
            nextDueDate: subscription.nextDueDate,
            cycle: 'MONTHLY',
            description: subscription.description,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro ao criar assinatura no Asaas: ${error}`);
    }

    const data = await response.json();
    return data;
}
